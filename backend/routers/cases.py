from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from db.database import get_db
from models.case import Case
from models.task import Task
from models.document import Document
from routers.auth import get_current_user

router = APIRouter(prefix="/cases", tags=["cases"])


# ── Schemas ───────────────────────────────────────────────────────────────────




class CreateCaseRequest(BaseModel):
    deceased_name:     str
    date_of_death:     str
    pan_available:     bool = True
    phone:             Optional[str] = None
    institutions:      list[str]
    nominee_name:      str
    nominee_relation:  str
    multiple_nominees: bool = False
    will_exists:       bool = False
    will_disputed:     bool = False
    docs_available:    list[str] = []


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/create")
def create_case(
    req: CreateCaseRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    case = Case(
        user_id=current_user.id,
        deceased_name=req.deceased_name,
        date_of_death=req.date_of_death,
        pan_available=str(req.pan_available),
        nominee_name=req.nominee_name,
        nominee_relation=req.nominee_relation,
        multiple_nominees=str(req.multiple_nominees),
        will_exists=str(req.will_exists),
        will_disputed=str(req.will_disputed),
        institutions=req.institutions,
        docs_available=req.docs_available,
    )
    db.add(case)
    db.commit()
    db.refresh(case)
    return {"case_id": case.id, "message": "Case created successfully"}


@router.get("")
def list_cases(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    cases = db.query(Case).filter(Case.user_id == current_user.id).all()
    result = []
    for c in cases:
        total = db.query(Task).filter(Task.case_id == c.id).count()
        done  = db.query(Task).filter(Task.case_id == c.id, Task.status == "done").count()
        progress = round((done / total) * 100) if total > 0 else 0
        result.append({
            "id":             c.id,
            "deceased_name":  c.deceased_name,
            "date_of_death":  c.date_of_death,
            "institutions":   c.institutions,
            "status":         c.status,
            "progress":       progress,
            "tasks_total":    total,
            "tasks_done":     done,
            "updated_at":     c.updated_at,
        })
    return result


@router.get("/dashboard-stats")
def dashboard_stats(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    cases       = db.query(Case).filter(Case.user_id == current_user.id).all()
    case_ids    = [c.id for c in cases]
    total_tasks = db.query(Task).filter(Task.case_id.in_(case_ids)).count()
    done_tasks  = db.query(Task).filter(Task.case_id.in_(case_ids), Task.status == "done").count()
    pending     = db.query(Task).filter(Task.case_id.in_(case_ids), Task.status == "pending").count()
    total_docs  = db.query(Document).filter(Document.case_id.in_(case_ids)).count()
    return {
        "active_cases":        len([c for c in cases if c.status == "active"]),
        "completed_tasks":     done_tasks,
        "pending_tasks":       pending,
        "documents_generated": total_docs,
        "total_cases":         len(cases),
    }


@router.get("/{case_id}")
def get_case(
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
    documents = db.query(Document).filter(Document.case_id == case_id).all()
    total    = len(tasks)
    done     = len([t for t in tasks if t.status == "done"])
    progress = round((done / total) * 100) if total > 0 else 0

    return {
        "id":               case.id,
        "deceased_name":    case.deceased_name,
        "date_of_death":    case.date_of_death,
        "pan_available":    case.pan_available,
        "nominee_name":     case.nominee_name,
        "nominee_relation": case.nominee_relation,
        "institutions":     case.institutions,
        "docs_available":   case.docs_available,
        "global_flags":     case.global_flags,
        "status":           case.status,
        "progress":         progress,
        "tasks":            [
            {
                "id":                t.id,
                "task_id":           t.task_id,
                "institution":       t.institution,
                "title":             t.title,
                "priority":          t.priority,
                "status":            t.status,
                "required_docs":     t.required_docs,
                "procedure_steps":   t.procedure_steps,
                "blocked_by":        t.blocked_by,
                "blocker_reason":    t.blocker_reason,
                "estimated_days_min": t.estimated_days_min,
                "estimated_days_max": t.estimated_days_max,
            }
            for t in tasks
        ],
        "documents": [
            {
                "id":            d.id,
                "institution":   d.institution,
                "document_type": d.document_type,
                "created_at":    d.created_at,
            }
            for d in documents
        ],
        "created_at": case.created_at,
        "updated_at": case.updated_at,
    }