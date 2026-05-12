from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from db.database import get_db
from models.document import Document
from models.case import Case
from routers.auth import get_current_user

router = APIRouter(prefix="/documents", tags=["documents"])


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
    return [
        {
            "id":                     d.id,
            "institution":            d.institution,
            "document_type":          d.document_type,
            "content":                d.content,
            "placeholders_remaining": d.placeholders_remaining,
            "created_at":             d.created_at,
        }
        for d in docs
    ]


@router.get("/single/{doc_id}")
def get_document(
    doc_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return {
        "id":                     doc.id,
        "institution":            doc.institution,
        "document_type":          doc.document_type,
        "content":                doc.content,
        "placeholders_remaining": doc.placeholders_remaining,
        "created_at":             doc.created_at,
    }