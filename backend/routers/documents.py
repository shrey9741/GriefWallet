import re
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from db.database import get_db
from models.document import Document
from models.case import Case
from routers.auth import get_current_user

router = APIRouter(prefix="/documents", tags=["documents"])

MAX_CONTENT = 20000


def _out(d: Document) -> dict:
    return {
        "id":                     d.id,
        "case_id":                d.case_id,
        "institution":            d.institution,
        "document_type":          d.document_type,
        "content":                d.content,
        "placeholders_remaining": d.placeholders_remaining or [],
        "created_at":             d.created_at,
        "sent_at":                d.sent_at,
    }


class DocumentUpdate(BaseModel):
    content: Optional[str] = None
    sent: Optional[bool] = None


@router.get("")
def list_all_documents(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Every letter across the signed-in user's cases, newest first."""
    rows = (
        db.query(Document, Case)
        .join(Case, Case.id == Document.case_id)
        .filter(Case.user_id == current_user.id)
        .order_by(Document.created_at.desc())
        .all()
    )
    return [
        {**_out(d), "deceased_name": c.deceased_name, "case_status": c.status}
        for d, c in rows
    ]


@router.get("/{case_id}")
def get_documents(
    case_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    case = db.query(Case).filter(
        Case.id == case_id,
        Case.user_id == current_user.id
    ).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    docs = db.query(Document).filter(Document.case_id == case_id).all()
    return [_out(d) for d in docs]


@router.get("/single/{doc_id}")
def get_document(
    doc_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    # Join through the case so a user can only read their own documents
    doc = (
        db.query(Document)
        .join(Case, Case.id == Document.case_id)
        .filter(Document.id == doc_id, Case.user_id == current_user.id)
        .first()
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return _out(doc)


@router.patch("/single/{doc_id}")
def update_document(
    doc_id: str,
    body: DocumentUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Edit the letter text (e.g. fill in blanks) or mark it sent / not sent."""
    doc = (
        db.query(Document)
        .join(Case, Case.id == Document.case_id)
        .filter(Document.id == doc_id, Case.user_id == current_user.id)
        .first()
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    if body.content is not None:
        if not body.content.strip():
            raise HTTPException(status_code=422, detail="Letter text cannot be empty")
        if len(body.content) > MAX_CONTENT:
            raise HTTPException(status_code=413, detail="Letter text is too long")
        doc.content = body.content
        doc.placeholders_remaining = list(
            dict.fromkeys(re.findall(r"\[([A-Z_\s]+)\]", body.content))
        )
    if body.sent is not None:
        if body.sent and doc.placeholders_remaining:
            raise HTTPException(status_code=409, detail="Fill in the remaining blanks before marking this letter as sent")
        doc.sent_at = datetime.utcnow() if body.sent else None

    db.commit()
    db.refresh(doc)
    return _out(doc)
