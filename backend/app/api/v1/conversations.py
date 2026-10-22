from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, Query, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc, or_

from backend.app.core.database import get_db
from backend.app.models import (
    Conversation, ConversationPurpose, AIAnalysis,
    AuditEvent, ActionRecommendation
)
from backend.app.schemas import (
    ConversationResponse, ConversationDetailResponse,
    PaginatedConversationsResponse, ConversationCreate, ConversationUpdate
)
from backend.app.services.completeness_service import CompletenessService
from backend.app.services.groq_service import GroqService
from backend.app.services.action_service import ActionService
from backend.app.utils.text_cleaner import compute_transcript_hash, clean_string

router = APIRouter(prefix="/conversations", tags=["Conversations"])


class TranscriptUpdateRequest(BaseModel):
    transcript: str


@router.get("", response_model=PaginatedConversationsResponse)
def list_conversations(
    search: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    sales_rep: Optional[str] = Query(None),
    purpose: Optional[str] = Query(None),
    transcript_status: Optional[str] = Query(None),
    follow_up_status: Optional[str] = Query(None),
    completeness: Optional[str] = Query(None),  # 'incomplete', 'complete', or 'all'
    ai_review_status: Optional[str] = Query(None),
    sort_by: str = Query("conversation_date"),
    sort_dir: str = Query("desc"),
    page: int = Query(1, ge=1),
    page_size: int = Query(15, ge=1, le=100),
    db: Session = Depends(get_db)
):
    query = db.query(Conversation)

    # Search filter
    if search:
        s = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Conversation.external_call_id.ilike(s),
                Conversation.customer_name.ilike(s),
                Conversation.sales_rep_name.ilike(s),
                Conversation.ai_summary.ilike(s)
            )
        )

    # Date filters
    if start_date:
        try:
            s_dt = datetime.fromisoformat(start_date)
            query = query.filter(Conversation.conversation_date >= s_dt)
        except ValueError:
            pass

    if end_date:
        try:
            e_dt = datetime.fromisoformat(end_date)
            query = query.filter(Conversation.conversation_date <= e_dt)
        except ValueError:
            pass

    # Sales Rep filter
    if sales_rep and sales_rep != "all":
        query = query.filter(Conversation.sales_rep_name == sales_rep)

    # Transcript status filter
    if transcript_status and transcript_status != "all":
        query = query.filter(Conversation.transcript_status == transcript_status)

    # Follow-up status filter
    if follow_up_status and follow_up_status != "all":
        query = query.filter(Conversation.follow_up_status == follow_up_status)

    # Completeness filter
    if completeness == "incomplete":
        query = query.filter(Conversation.completeness_score < 80.0)
    elif completeness == "complete":
        query = query.filter(Conversation.completeness_score >= 80.0)

    # AI review status filter
    if ai_review_status and ai_review_status != "all":
        query = query.filter(Conversation.ai_review_status == ai_review_status)

    # Purpose filter
    if purpose and purpose != "all":
        query = query.join(Conversation.purpose_associations).filter(
            ConversationPurpose.purpose_name == purpose,
            ConversationPurpose.is_active == True
        )

    total = query.count()

    # Sorting
    sort_column = getattr(Conversation, sort_by, Conversation.conversation_date)
    if sort_dir.lower() == "asc":
        query = query.order_by(asc(sort_column))
    else:
        query = query.order_by(desc(sort_column))

    # Pagination
    offset = (page - 1) * page_size
    conversations = query.offset(offset).limit(page_size).all()

    # Build response items
    items = []
    for c in conversations:
        item = ConversationResponse(
            id=c.id,
            external_call_id=c.external_call_id,
            customer_name=c.customer_name,
            sales_rep_name=c.sales_rep_name,
            conversation_date=c.conversation_date,
            duration_seconds=c.duration_seconds,
            conversation_type=c.conversation_type,
            transcript_status=c.transcript_status,
            has_transcript=bool(c.transcript),
            ai_summary=c.ai_summary,
            follow_up_status=c.follow_up_status,
            completeness_score=c.completeness_score,
            missing_fields=c.missing_fields or [],
            ai_review_status=c.ai_review_status,
            confidence_score=c.confidence_score,
            active_purposes=c.active_purposes,
            created_at=c.created_at,
            updated_at=c.updated_at
        )
        items.append(item)

    total_pages = (total + page_size - 1) // page_size if total > 0 else 1

    return PaginatedConversationsResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )


@router.get("/{conversation_id}", response_model=ConversationDetailResponse)
def get_conversation_details(
    conversation_id: int,
    db: Session = Depends(get_db)
):
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Conversation {conversation_id} not found."
        )

    # Sort audit events chronologically
    sorted_events = sorted(conv.audit_events, key=lambda e: e.timestamp, reverse=True)

    return ConversationDetailResponse(
        id=conv.id,
        external_call_id=conv.external_call_id,
        customer_name=conv.customer_name,
        sales_rep_name=conv.sales_rep_name,
        conversation_date=conv.conversation_date,
        duration_seconds=conv.duration_seconds,
        conversation_type=conv.conversation_type,
        transcript_status=conv.transcript_status,
        has_transcript=bool(conv.transcript),
        transcript=conv.transcript,
        ai_summary=conv.ai_summary,
        customer_requirements=conv.customer_requirements or [],
        objections=conv.objections or [],
        action_items=conv.action_items or [],
        recommended_next_steps=conv.recommended_next_steps or [],
        follow_up_status=conv.follow_up_status,
        completeness_score=conv.completeness_score,
        missing_fields=conv.missing_fields or [],
        ai_review_status=conv.ai_review_status,
        confidence_score=conv.confidence_score,
        is_manually_corrected=conv.is_manually_corrected,
        active_purposes=conv.active_purposes,
        purpose_associations=conv.purpose_associations,
        ai_analyses=conv.ai_analyses,
        action_recommendations=conv.action_recommendations,
        audit_events=sorted_events,
        created_at=conv.created_at,
        updated_at=conv.updated_at
    )


@router.post("/{conversation_id}/transcript")
def update_conversation_transcript(
    conversation_id: int,
    payload: TranscriptUpdateRequest,
    db: Session = Depends(get_db)
):
    """
    Handle late arrival or update of a conversation transcript.
    Updates transcript, recalculates completeness score, and triggers Groq AI analysis.
    """
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Conversation {conversation_id} not found."
        )

    transcript_text = clean_string(payload.transcript)
    if not transcript_text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Transcript text cannot be empty."
        )

    is_late_arrival = not conv.transcript or conv.transcript_status == "pending"
    conv.transcript = transcript_text
    conv.transcript_hash = compute_transcript_hash(transcript_text)
    conv.transcript_status = "completed"

    # Audit event for transcript arrival
    event_type = "transcript_received" if is_late_arrival else "transcript_updated"
    audit = AuditEvent(
        conversation_id=conv.id,
        external_call_id=conv.external_call_id,
        event_type=event_type,
        actor="Sales Manager / User",
        details="Transcript uploaded. Triggering AI conversation analysis."
    )
    db.add(audit)

    # Trigger Groq AI Analysis
    ai_output = GroqService.analyze_transcript(
        transcript=transcript_text,
        customer_name=conv.customer_name,
        sales_rep_name=conv.sales_rep_name
    )

    conv.ai_summary = ai_output.summary
    conv.customer_requirements = ai_output.customer_requirements
    conv.objections = ai_output.objections
    conv.action_items = ai_output.action_items
    conv.recommended_next_steps = ai_output.recommended_next_steps
    conv.confidence_score = ai_output.confidence
    conv.ai_review_status = "needs_review" if ai_output.needs_review else "approved"

    # Store AI analysis record
    analysis = AIAnalysis(
        conversation_id=conv.id,
        summary=ai_output.summary,
        predicted_purposes=[p.model_dump() for p in ai_output.predicted_purposes],
        customer_requirements=ai_output.customer_requirements,
        objections=ai_output.objections,
        action_items=ai_output.action_items,
        recommended_next_steps=ai_output.recommended_next_steps,
        confidence=ai_output.confidence,
        needs_review=ai_output.needs_review,
        review_reason=ai_output.review_reason
    )
    db.add(analysis)

    # Update purpose associations if not manually corrected
    if not conv.is_manually_corrected:
        # Deactivate old AI purposes
        for p in conv.purpose_associations:
            if p.source == "ai_predicted":
                p.is_active = False

        for pred in ai_output.predicted_purposes:
            p_assoc = ConversationPurpose(
                conversation_id=conv.id,
                purpose_name=pred.purpose,
                source="ai_predicted",
                confidence=pred.confidence,
                evidence_snippet=pred.evidence,
                is_active=True
            )
            db.add(p_assoc)

    # Recalculate completeness score
    db.flush()
    active_purposes_count = len([p for p in conv.purpose_associations if p.is_active])
    score, missing, _ = CompletenessService.calculate_score(conv, active_purposes_count)
    conv.completeness_score = score
    conv.missing_fields = missing

    # Sync action recommendations
    ActionService.sync_recommendations_for_conversation(conv, db)

    db.commit()
    db.refresh(conv)

    return {
        "success": True,
        "message": "Transcript saved and AI intelligence analysis completed.",
        "completeness_score": conv.completeness_score,
        "ai_review_status": conv.ai_review_status
    }


@router.put("/{conversation_id}")
def update_conversation(
    conversation_id: int,
    payload: ConversationUpdate,
    db: Session = Depends(get_db)
):
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found.")

    if payload.customer_name is not None:
        conv.customer_name = payload.customer_name
    if payload.sales_rep_name is not None:
        conv.sales_rep_name = payload.sales_rep_name
    if payload.conversation_date is not None:
        conv.conversation_date = payload.conversation_date
    if payload.duration_seconds is not None:
        conv.duration_seconds = payload.duration_seconds
    if payload.conversation_type is not None:
        conv.conversation_type = payload.conversation_type
    if payload.follow_up_status is not None:
        conv.follow_up_status = payload.follow_up_status
    if payload.ai_summary is not None:
        conv.ai_summary = payload.ai_summary
        conv.is_manually_corrected = True

    # Recalculate completeness
    active_purposes_count = len([p for p in conv.purpose_associations if p.is_active])
    score, missing, _ = CompletenessService.calculate_score(conv, active_purposes_count)
    conv.completeness_score = score
    conv.missing_fields = missing

    ActionService.sync_recommendations_for_conversation(conv, db)

    db.commit()
    db.refresh(conv)
    return {"success": True, "message": "Conversation updated successfully."}


@router.delete("/{conversation_id}")
def delete_conversation(
    conversation_id: int,
    db: Session = Depends(get_db)
):
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found.")
    db.delete(conv)
    db.commit()
    return {"success": True, "message": f"Conversation {conversation_id} deleted."}
