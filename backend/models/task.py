from sqlalchemy import Column, String, DateTime, ForeignKey, JSON, Integer
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from db.database import Base



class Task(Base):
    __tablename__ = "tasks"

    id               = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    case_id          = Column(String, ForeignKey("cases.id"), nullable=False)
    task_id          = Column(String, nullable=False)
    institution      = Column(String, nullable=False)
    title            = Column(String, nullable=False)
    priority         = Column(String, default="medium")
    status           = Column(String, default="pending")
    required_docs    = Column(JSON, default=list)
    procedure_steps  = Column(JSON, default=list)
    blocked_by       = Column(JSON, default=list)
    blocker_reason   = Column(String, nullable=True)
    estimated_days_min = Column(Integer, default=0)
    estimated_days_max = Column(Integer, default=30)
    created_at       = Column(DateTime, default=datetime.utcnow)
    updated_at       = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    case = relationship("Case", back_populates="tasks")