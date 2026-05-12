from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from db.database import get_db
from models.task import Task
from models.case import Case
from routers.auth import get_current_user

router = APIRouter(prefix="/tasks", tags=["tasks"])


class UpdateTaskRequest(BaseModel):
    status: str   # "pending" | "in_progress" | "done" | "blocked"


@router.get("/{case_id}")
def get_tasks(
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
    return [
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
            "updated_at":        t.updated_at,
        }
        for t in tasks
    ]


@router.patch("/{task_id}")
def update_task(
    task_id: str,
    req: UpdateTaskRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    # Verify task belongs to user's case
    case = db.query(Case).filter(
        Case.id == task.case_id,
        Case.user_id == current_user.id
    ).first()
    if not case:
        raise HTTPException(status_code=403, detail="Not authorized")

    valid_statuses = ["pending", "in_progress", "done", "blocked"]
    if req.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Use: {valid_statuses}")

    task.status = req.status
    db.commit()
    db.refresh(task)
    return {"task_id": task.id, "status": task.status, "message": "Task updated"}