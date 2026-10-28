from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from typing import Optional
import os
import httpx
import jwt as pyjwt
from jwt import PyJWKClient

from db.database import get_db
from models.user import User

router = APIRouter(prefix="/auth", tags=["auth"])

# Clerk production instance, e.g. https://clerk.griefwallet.in
CLERK_ISSUER = os.getenv("CLERK_ISSUER", "").rstrip("/")
# sk_live_... (backend only, never in the frontend or GitHub)
CLERK_SECRET_KEY = os.getenv("CLERK_SECRET_KEY", "")
# Origins allowed to obtain tokens for this API (Clerk "azp" claim)
AUTHORIZED_PARTIES = [
    p.strip()
    for p in os.getenv(
        "CLERK_AUTHORIZED_PARTIES",
        "https://griefwallet.in,https://www.griefwallet.in,http://localhost:5173",
    ).split(",")
    if p.strip()
]

# Fetches and caches Clerk's public signing keys
_jwks_client = (
    PyJWKClient(f"{CLERK_ISSUER}/.well-known/jwks.json", cache_keys=True)
    if CLERK_ISSUER
    else None
)


def verify_clerk_token(token: str) -> dict:
    """Verify signature, expiry and issuer of a Clerk session token."""
    if _jwks_client is None:
        raise HTTPException(status_code=500, detail="CLERK_ISSUER is not configured")
    try:
        signing_key = _jwks_client.get_signing_key_from_jwt(token).key
        claims = pyjwt.decode(
            token,
            signing_key,
            algorithms=["RS256"],
            issuer=CLERK_ISSUER,
            options={"verify_aud": False, "require": ["exp", "sub"]},
        )
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    azp = claims.get("azp")
    if azp and azp not in AUTHORIZED_PARTIES:
        raise HTTPException(status_code=401, detail="Invalid token origin")
    return claims


def fetch_clerk_profile(clerk_user_id: str) -> tuple[str, str]:
    """Look up email and name from Clerk's Backend API (tokens don't carry them)."""
    fallback = (f"{clerk_user_id}@clerk.user", "User")
    if not CLERK_SECRET_KEY:
        return fallback
    try:
        r = httpx.get(
            f"https://api.clerk.com/v1/users/{clerk_user_id}",
            headers={"Authorization": f"Bearer {CLERK_SECRET_KEY}"},
            timeout=10,
        )
        r.raise_for_status()
        data = r.json()
        primary_id = data.get("primary_email_address_id")
        email = next(
            (e["email_address"] for e in data.get("email_addresses", []) if e["id"] == primary_id),
            fallback[0],
        )
        name = " ".join(
            p for p in [data.get("first_name"), data.get("last_name")] if p
        ) or data.get("username") or "User"
        return email, name
    except Exception:
        return fallback


def get_current_user(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db),
):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")

    token = authorization.removeprefix("Bearer ").strip()
    claims = verify_clerk_token(token)
    clerk_user_id = claims["sub"]

    user = db.query(User).filter(User.clerk_id == clerk_user_id).first()
    if user:
        return user

    email, full_name = fetch_clerk_profile(clerk_user_id)

    # Link an older account with the same email instead of creating a duplicate
    user = db.query(User).filter(User.email == email).first()
    if user:
        user.clerk_id = clerk_user_id
    else:
        user = User(
            clerk_id=clerk_user_id,
            email=email,
            full_name=full_name,
            password_hash="clerk_managed",
        )
        db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.get("/me")
def get_me(current_user=Depends(get_current_user)):
    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "clerk_id": current_user.clerk_id,
    }
