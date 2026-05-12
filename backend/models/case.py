from sqlalchemy import Column, String, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from db.database import Base


class Case(Base):
    __tablename__ = "cases"

    id             = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id        = Column(String, ForeignKey("users.id"), nullable=False)
    deceased_name  = Column(String, nullable=False)
    date_of_death  = Column(String, nullable=False)
    pan_available  = Column(String, default="true")
    nominee_name   = Column(String, nullable=False)
    nominee_relation = Column(String, nullable=False)
    multiple_nominees = Column(String, default="false")
    will_exists    = Column(String, default="false")
    will_disputed  = Column(String, default="false")
    institutions   = Column(JSON, default=list)
    docs_available = Column(JSON, default=list)
    global_flags   = Column(JSON, default=list)
    status         = Column(String, default="active")
    created_at     = Column(DateTime, default=datetime.utcnow)
    updated_at     = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user      = relationship("User", back_populates="cases")
    tasks     = relationship("Task", back_populates="case", cascade="all, delete-orphan")
    documents = relationship("Document", back_populates="case", cascade="all, delete-orphan")