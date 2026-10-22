from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


# Purpose Schemas
class PurposeBase(BaseModel):
    name: str
    description: Optional[str] = None
    color: Optional[str] = "indigo"


class PurposeResponse(PurposeBase):
    id: int

    class Config:
        from_attributes = True


class ConversationPurposeItem(BaseModel):
    id: int
    purpose_name: str
    source: str
    confidence: float
    evidence_snippet: Optional[str] = None
    is_active: bool

    class Config:
        from_attributes = True


# Audit Event Schema
class AuditEventResponse(BaseModel):
    id: int
    conversation_id: Optional[int] = None
    external_call_id: Optional[str] = None
    event_type: str
    actor: str
    before_state: Optional[Dict[str, Any]] = None
    after_state: Optional[Dict[str, Any]] = None
    details: Optional[str] = None
    timestamp: datetime

    class Config:
        from_attributes = True


# AI Analysis Schemas
class PredictedPurpose(BaseModel):
    purpose: str
    confidence: float = Field(ge=0.0, le=1.0)
    evidence: str


class StructuredAIOutput(BaseModel):
    summary: str
    predicted_purposes: List[PredictedPurpose] = []
    customer_requirements: List[str] = []
    objections: List[str] = []
    action_items: List[str] = []
    recommended_next_steps: List[str] = []
    confidence: float = Field(default=0.85, ge=0.0, le=1.0)
    needs_review: bool = False
    review_reason: Optional[str] = None


class AIAnalysisResponse(BaseModel):
    id: int
    conversation_id: int
    model_name: str
    predicted_purposes: List[Dict[str, Any]]
    summary: Optional[str]
    customer_requirements: List[str]
    objections: List[str]
    action_items: List[str]
    recommended_next_steps: List[str]
    confidence: float
    needs_review: bool
    review_reason: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class ManualCorrectionRequest(BaseModel):
    review_action: str = Field(..., description="'approve' or 'correct'")
    purposes_to_add: List[str] = []
    purposes_to_remove: List[str] = []
    edited_summary: Optional[str] = None
    notes: Optional[str] = None


# Action Recommendation Schemas
class ActionRecommendationResponse(BaseModel):
    id: int
    conversation_id: int
    action_type: str
    title: str
    reason: str
    suggested_action: str
    priority: str
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ActionStatusUpdate(BaseModel):
    status: str = Field(..., description="Open, In Progress, Completed, Dismissed")


# Conversation Schemas
class ConversationBase(BaseModel):
    external_call_id: str
    customer_name: str
    sales_rep_name: str
    conversation_date: datetime
    duration_seconds: int = 0
    conversation_type: str = "Call"
    transcript: Optional[str] = None
    follow_up_status: str = "None"


class ConversationCreate(ConversationBase):
    pass


class ConversationUpdate(BaseModel):
    customer_name: Optional[str] = None
    sales_rep_name: Optional[str] = None
    conversation_date: Optional[datetime] = None
    duration_seconds: Optional[int] = None
    conversation_type: Optional[str] = None
    transcript: Optional[str] = None
    follow_up_status: Optional[str] = None
    ai_summary: Optional[str] = None


class ConversationResponse(BaseModel):
    id: int
    external_call_id: str
    customer_name: str
    sales_rep_name: str
    conversation_date: datetime
    duration_seconds: int
    conversation_type: str
    transcript_status: str
    has_transcript: bool = False
    ai_summary: Optional[str] = None
    follow_up_status: str
    completeness_score: float
    missing_fields: List[str] = []
    ai_review_status: str
    confidence_score: float
    active_purposes: List[str] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ConversationDetailResponse(ConversationResponse):
    transcript: Optional[str] = None
    customer_requirements: List[str] = []
    objections: List[str] = []
    action_items: List[str] = []
    recommended_next_steps: List[str] = []
    is_manually_corrected: bool = False
    purpose_associations: List[ConversationPurposeItem] = []
    ai_analyses: List[AIAnalysisResponse] = []
    action_recommendations: List[ActionRecommendationResponse] = []
    audit_events: List[AuditEventResponse] = []

    class Config:
        from_attributes = True


class PaginatedConversationsResponse(BaseModel):
    items: List[ConversationResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


# Import Diff Schemas
class FieldDiff(BaseModel):
    field_name: str
    old_value: Any
    new_value: Any


class RecordDiff(BaseModel):
    row_number: int
    external_call_id: str
    status: str  # "new", "updated", "unchanged", "duplicate", "conflict", "invalid"
    fields_changed: List[FieldDiff] = []
    conflict_reason: Optional[str] = None
    validation_errors: List[str] = []
    incoming_data: Dict[str, Any] = {}
    existing_data: Optional[Dict[str, Any]] = None


class ImportDiffPreview(BaseModel):
    job_id: int
    filename: str
    file_type: str
    file_size_bytes: int
    total_rows: int
    new_count: int
    updated_count: int
    unchanged_count: int
    duplicate_count: int
    conflict_count: int
    invalid_count: int
    records: List[RecordDiff]
    summary_message: str


class ImportCommitRequest(BaseModel):
    job_id: int
    action: str = Field(default="commit", description="'commit' or 'cancel'")
    conflict_resolutions: Optional[Dict[str, str]] = Field(
        default_factory=dict,
        description="Map of external_call_id to resolution: 'overwrite', 'keep_existing', or 'skip'"
    )


class ImportCommitResponse(BaseModel):
    job_id: int
    status: str
    message: str
    created_count: int
    updated_count: int
    unchanged_count: int
    skipped_count: int
    timestamp: datetime


# Dashboard Analytics Schemas
class KpiMetrics(BaseModel):
    total_conversations: int
    calls_count: int
    meetings_count: int
    transcript_pending_count: int
    incomplete_count: int
    ai_review_needed_count: int
    follow_ups_due_count: int
    average_completeness: float


class VolumeDataPoint(BaseModel):
    date: str
    calls: int
    meetings: int
    total: int


class PurposeDistribution(BaseModel):
    purpose: str
    count: int
    percentage: float
    color: str


class TranscriptStatusMetric(BaseModel):
    status: str
    count: int
    color: str


class CompletenessDistribution(BaseModel):
    tier: str  # e.g., "0-25%", "25-50%", "50-75%", "75-100%"
    count: int


class RepActivityMetric(BaseModel):
    rep_name: str
    total_conversations: int
    completed_transcripts: int
    avg_completeness: float
    follow_ups_open: int


class DashboardAnalyticsResponse(BaseModel):
    kpis: KpiMetrics
    volume_over_time: List[VolumeDataPoint]
    purpose_distribution: List[PurposeDistribution]
    transcript_status_breakdown: List[TranscriptStatusMetric]
    completeness_distribution: List[CompletenessDistribution]
    follow_up_breakdown: Dict[str, int]
    rep_activity: List[RepActivityMetric]
