from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Text, Float, Boolean, DateTime, ForeignKey, JSON
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from backend.app.core.database import Base


class Customer(Base):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    company = Column(String(255), nullable=True)
    email = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=func.now())

    conversations = relationship("Conversation", back_populates="customer")


class SalesRepresentative(Base):
    __tablename__ = "sales_reps"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    email = Column(String(255), nullable=True)
    team = Column(String(100), default="Enterprise Sales")
    created_at = Column(DateTime, default=func.now())

    conversations = relationship("Conversation", back_populates="sales_rep")


class Purpose(Base):
    __tablename__ = "purposes"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    color = Column(String(50), default="indigo")


class ConversationPurpose(Base):
    __tablename__ = "conversation_purposes"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False, index=True)
    purpose_name = Column(String(100), nullable=False, index=True)
    source = Column(String(50), default="ai_predicted")  # ai_predicted, manual_added, manual_approved, manual_corrected
    confidence = Column(Float, default=1.0)
    evidence_snippet = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=func.now())

    conversation = relationship("Conversation", back_populates="purpose_associations")


class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True, index=True)
    external_call_id = Column(String(100), unique=True, nullable=False, index=True)
    customer_name = Column(String(255), nullable=False, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=True)
    sales_rep_name = Column(String(255), nullable=False, index=True)
    sales_rep_id = Column(Integer, ForeignKey("sales_reps.id"), nullable=True)
    conversation_date = Column(DateTime, nullable=False, index=True)
    duration_seconds = Column(Integer, default=0)
    conversation_type = Column(String(50), default="Call")  # Call, Meeting, Video Demo
    
    transcript = Column(Text, nullable=True)
    transcript_status = Column(String(50), default="pending", index=True)  # pending, processing, completed, failed
    transcript_hash = Column(String(64), nullable=True, index=True)
    
    ai_summary = Column(Text, nullable=True)
    customer_requirements = Column(JSON, default=list)
    objections = Column(JSON, default=list)
    action_items = Column(JSON, default=list)
    recommended_next_steps = Column(JSON, default=list)
    
    follow_up_status = Column(String(50), default="None", index=True)  # None, Pending, Overdue, Completed
    completeness_score = Column(Float, default=0.0, index=True)
    missing_fields = Column(JSON, default=list)
    
    ai_review_status = Column(String(50), default="unreviewed", index=True)  # unreviewed, approved, corrected, needs_review
    confidence_score = Column(Float, default=0.0)
    is_manually_corrected = Column(Boolean, default=False)
    
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    # Relationships
    customer = relationship("Customer", back_populates="conversations")
    sales_rep = relationship("SalesRepresentative", back_populates="conversations")
    purpose_associations = relationship("ConversationPurpose", back_populates="conversation", cascade="all, delete-orphan")
    ai_analyses = relationship("AIAnalysis", back_populates="conversation", cascade="all, delete-orphan")
    action_recommendations = relationship("ActionRecommendation", back_populates="conversation", cascade="all, delete-orphan")
    audit_events = relationship("AuditEvent", back_populates="conversation")

    @property
    def active_purposes(self):
        return [p.purpose_name for p in self.purpose_associations if p.is_active]


class AIAnalysis(Base):
    __tablename__ = "ai_analyses"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False, index=True)
    model_name = Column(String(100), default="llama-3.3-70b-versatile")
    predicted_purposes = Column(JSON, default=list)  # list of {purpose, confidence, evidence}
    summary = Column(Text, nullable=True)
    customer_requirements = Column(JSON, default=list)
    objections = Column(JSON, default=list)
    action_items = Column(JSON, default=list)
    recommended_next_steps = Column(JSON, default=list)
    confidence = Column(Float, default=0.0)
    needs_review = Column(Boolean, default=False)
    review_reason = Column(String(255), nullable=True)
    execution_time_ms = Column(Integer, default=0)
    created_at = Column(DateTime, default=func.now())

    conversation = relationship("Conversation", back_populates="ai_analyses")


class ImportJob(Base):
    __tablename__ = "import_jobs"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String(255), nullable=False)
    file_type = Column(String(20), default="csv")
    file_size_bytes = Column(Integer, default=0)
    status = Column(String(50), default="previewed")  # previewed, committed, cancelled, failed
    total_rows = Column(Integer, default=0)
    new_rows = Column(Integer, default=0)
    updated_rows = Column(Integer, default=0)
    unchanged_rows = Column(Integer, default=0)
    duplicate_rows = Column(Integer, default=0)
    conflicting_rows = Column(Integer, default=0)
    invalid_rows = Column(Integer, default=0)
    diff_summary = Column(JSON, default=dict)
    created_at = Column(DateTime, default=func.now())
    committed_at = Column(DateTime, nullable=True)

    row_errors = relationship("ImportRowError", back_populates="import_job", cascade="all, delete-orphan")


class ImportRowError(Base):
    __tablename__ = "import_row_errors"

    id = Column(Integer, primary_key=True, index=True)
    import_job_id = Column(Integer, ForeignKey("import_jobs.id", ondelete="CASCADE"), nullable=False, index=True)
    row_number = Column(Integer, nullable=False)
    external_call_id = Column(String(100), nullable=True)
    error_type = Column(String(50), nullable=False)  # validation, duplicate, conflict, missing_required
    message = Column(Text, nullable=False)
    raw_data = Column(JSON, nullable=True)

    import_job = relationship("ImportJob", back_populates="row_errors")


class AuditEvent(Base):
    __tablename__ = "audit_events"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id", ondelete="SET NULL"), nullable=True, index=True)
    external_call_id = Column(String(100), nullable=True)
    event_type = Column(String(100), nullable=False, index=True)
    actor = Column(String(100), default="System")
    before_state = Column(JSON, nullable=True)
    after_state = Column(JSON, nullable=True)
    details = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=func.now(), index=True)

    conversation = relationship("Conversation", back_populates="audit_events")


class ActionRecommendation(Base):
    __tablename__ = "action_recommendations"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False, index=True)
    action_type = Column(String(100), nullable=False)  # request_transcript, retry_ai, review_purpose, schedule_demo, overdue_followup, resolve_conflict
    title = Column(String(255), nullable=False)
    reason = Column(Text, nullable=False)
    suggested_action = Column(Text, nullable=False)
    priority = Column(String(20), default="Medium")  # High, Medium, Low
    status = Column(String(50), default="Open")  # Open, In Progress, Completed, Dismissed
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    conversation = relationship("Conversation", back_populates="action_recommendations")
