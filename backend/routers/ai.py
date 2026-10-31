import logging

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
from agents.classifier import load_knowledge
from agents.doc_generator import DOCUMENT_TYPE_MAP, generate_letter

logger = logging.getLogger(__name__)
AI_UNAVAILABLE = "The AI service is unavailable right now. Please try again in a minute."

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
    try:
        result = run_case(case_input)
    except Exception:
        logger.exception("generate-checklist failed for case %s", case.id)
        raise HTTPException(status_code=502, detail=AI_UNAVAILABLE)

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

    try:
        insight = run_advisor_only(case_input, tasks_list, case.global_flags or [])
    except Exception:
        logger.exception("generate-insight failed for case %s", case.id)
        raise HTTPException(status_code=502, detail=AI_UNAVAILABLE)
    return {"insight": insight}


@router.post("/generate-document")
def generate_document(
    req: GenerateDocumentRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Draft a letter for one task on demand (works even while the task is blocked)."""
    case = db.query(Case).filter(
        Case.id == req.case_id,
        Case.user_id == current_user.id
    ).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    task = db.query(Task).filter(Task.id == req.task_id, Task.case_id == case.id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    doc_type = req.document_type or DOCUMENT_TYPE_MAP.get(task.institution.upper())
    if not doc_type:
        raise HTTPException(status_code=400, detail=f"No letter template for {task.institution}")

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
    task_dict = {
        "institution": task.institution,
        "title":       task.title,
        "priority":    task.priority,
        "status":      task.status,
    }

    try:
        result = generate_letter(case_input, task_dict, load_knowledge(task.institution), doc_type)
    except Exception:
        logger.exception("generate-document failed for task %s", task.id)
        raise HTTPException(status_code=502, detail=AI_UNAVAILABLE)

    # one letter per institution and type: replace any earlier draft
    db.query(Document).filter(
        Document.case_id == case.id,
        Document.institution == task.institution,
        Document.document_type == doc_type,
    ).delete()

    doc = Document(
        case_id=case.id,
        institution=task.institution,
        document_type=doc_type,
        content=result["content"],
        placeholders_remaining=result["placeholders_remaining"],
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    return {
        "id":                     doc.id,
        "institution":            doc.institution,
        "document_type":          doc.document_type,
        "content":                doc.content,
        "placeholders_remaining": doc.placeholders_remaining,
        "created_at":             doc.created_at,
    }
