from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from db.database import get_db
from models.case import Case
from models.task import Task
from models.document import Document
from routers.auth import get_current_user
from graph import run_case, run_advisor_only

router = APIRouter(prefix="/ai", tags=["ai"])


class GenerateChecklistRequest(BaseModel):
    case_id: str


class GenerateDocumentRequest(BaseModel):
    case_id:       str
    task_id:       str
    document_type: Optional[str] = None


@router.post("/generate-checklist")
def generate_checklist(
    req: GenerateChecklistRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    case = db.query(Case).filter(
        Case.id == req.case_id,
        Case.user_id == current_user.id
    ).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    # Build case_input for agent
    case_input = {
        "deceased_name":    case.deceased_name,
        "date_of_death":    case.date_of_death,
        "pan_available":    case.pan_available == "true",
        "phone":            None,
        "institutions":     case.institutions or [],
        "nominee_name":     case.nominee_name,
        "nominee_relation": case.nominee_relation,
        "multiple_nominees": case.multiple_nominees == "true",
        "will_exists":      case.will_exists == "true",
        "will_disputed":    case.will_disputed == "true",
        "docs_available":   case.docs_available or [],
    }

    # Run the full agent graph
    result = run_case(case_input)

    # Save global flags to case
    case.global_flags = result.get("global_flags", [])
    db.commit()

    # Delete existing tasks and documents for this case (re-generate)
    db.query(Task).filter(Task.case_id == case.id).delete()
    db.query(Document).filter(Document.case_id == case.id).delete()

    # Save tasks to DB
    for t in result.get("tasks", []):
        task = Task(
            case_id=case.id,
            task_id=t.get("task_id", ""),
            institution=t.get("institution", ""),
            title=t.get("title", ""),
            priority=t.get("priority", "medium"),
            status=t.get("status", "pending"),
            required_docs=t.get("required_docs", []),
            procedure_steps=t.get("procedure_steps", []),
            blocked_by=t.get("blocked_by", []),
            blocker_reason=t.get("blocker_reason"),
            estimated_days_min=t.get("estimated_days_min", 0),
            estimated_days_max=t.get("estimated_days_max", 30),
        )
        db.add(task)

    # Save documents to DB
    for d in result.get("documents", []):
        doc = Document(
            case_id=case.id,
            institution=d.get("institution", ""),
            document_type=d.get("document_type", ""),
            content=d.get("content", ""),
            placeholders_remaining=d.get("placeholders_remaining", []),
        )
        db.add(doc)

    db.commit()

    return {
        "message":      "Checklist generated successfully",
        "tasks_count":  len(result.get("tasks", [])),
        "docs_count":   len(result.get("documents", [])),
        "global_flags": result.get("global_flags", []),
        "insight":      result.get("insight", {}),
    }


@router.post("/generate-insight")
def generate_insight(
    req: GenerateChecklistRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    case = db.query(Case).filter(
        Case.id == req.case_id,
        Case.user_id == current_user.id
    ).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    tasks = db.query(Task).filter(Task.case_id == case.id).all()
    case_input = {
        "deceased_name":    case.deceased_name,
        "date_of_death":    case.date_of_death,
        "pan_available":    case.pan_available == "true",
        "phone":            None,
        "institutions":     case.institutions or [],
        "nominee_name":     case.nominee_name,
        "nominee_relation": case.nominee_relation,
        "multiple_nominees": case.multiple_nominees == "true",
        "will_exists":      case.will_exists == "true",
        "will_disputed":    case.will_disputed == "true",
        "docs_available":   case.docs_available or [],
    }

    tasks_list = [
        {
            "title":          t.title,
            "status":         t.status,
            "priority":       t.priority,
            "blocker_reason": t.blocker_reason,
        }
        for t in tasks
    ]

    insight = run_advisor_only(case_input, tasks_list, case.global_flags or [])
    return {"insight": insight}