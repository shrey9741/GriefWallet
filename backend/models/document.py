from sqlalchemy import Column, String, DateTime, ForeignKey, JSON, Text
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from db.database import Base



class Document(Base):
    __tablename__ = "documents"

    id                    = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    case_id               = Column(String, ForeignKey("cases.id"), nullable=False)
    institution           = Column(String, nullable=False)
    document_type         = Column(String, nullable=False)
    content               = Column(Text, nullable=False)
    placeholders_remaining = Column(JSON, default=list)
    created_at            = Column(DateTime, default=datetime.utcnow)

    case = relationship("Case", back_populates="documents")