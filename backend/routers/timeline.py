from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from db.database import get_db
from models.task import Task
from models.case import Case
from models.document import Document
from routers.auth import get_current_user

router = APIRouter(prefix="/timeline", tags=["timeline"])


@router.get("/{case_id}")
def get_timeline(
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

    tasks = db.query(Task).filter(Task.case_id == case_id).all()
    docs  = db.query(Document).filter(Document.case_id == case_id).all()

    events = []

    events.append({
        "type":      "case_created",
        "label":     "Case created",
        "detail":    f"Workflow initiated for {case.deceased_name}",
        "timestamp": case.created_at,
        "status":    "done",
    })

    for t in tasks:
        events.append({
            "type":      "task",
            "label":     t.title,
            "detail":    t.institution,
            "timestamp": t.updated_at,
            "status":    t.status,
            "priority":  t.priority,
        })

    for d in docs:
        events.append({
            "type":      "document",
            "label":     f"{d.institution} letter generated",
            "detail":    d.document_type,
            "timestamp": d.created_at,
            "status":    "done",
        })

    events.sort(key=lambda x: x["timestamp"])

    total    = len(tasks)
    done     = len([t for t in tasks if t.status == "done"])
    progress = round((done / total) * 100) if total > 0 else 0

    return {
        "events":   events,
        "progress": progress,
        "summary": {
            "total_tasks":   total,
            "done_tasks":    done,
            "blocked_tasks": len([t for t in tasks if t.status == "blocked"]),
            "pending_tasks": len([t for t in tasks if t.status == "pending"]),
        }
    }