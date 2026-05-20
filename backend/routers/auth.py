from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from typing import Optional
import os
import jwt as pyjwt

from db.database import get_db
from models.user import User

router = APIRouter(prefix="/auth", tags=["auth"])


def get_current_user(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")

    token = authorization.replace("Bearer ", "")

    try:
        # Decode Clerk JWT without signature verification to get user ID
        decoded = pyjwt.decode(
            token,
            options={"verify_signature": False},
            algorithms=["RS256"]
        )
        clerk_user_id = decoded.get("sub")
        if not clerk_user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

    # Get or create user in our DB
    user = db.query(User).filter(User.clerk_id == clerk_user_id).first()
    if not user:
        # Extract email from token if available
        email = decoded.get("email", f"{clerk_user_id}@clerk.user")
        full_name = decoded.get("name", "User")

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
        "id":        current_user.id,
        "email":     current_user.email,
        "full_name": current_user.full_name,
        "clerk_id":  current_user.clerk_id,
    }