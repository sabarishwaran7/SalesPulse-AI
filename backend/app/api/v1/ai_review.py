from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from backend.app.core.database import get_db
from backend.app.models import (
    Conversation, ConversationPurpose, AIAnalysis, AuditEvent
)
from backend.app.schemas import ManualCorrectionRequest
from backend.app.services.completeness_service import CompletenessService
from backend.app.services.groq_service import GroqService
from backend.app.services.action_service import ActionService

router = APIRouter(prefix="/ai-review", tags=["AI Review Center"])


@router.get("/queue")
def get_review_queue(
    db: Session = Depends(get_db)
):
    """
    Retrieve conversations requiring sales manager review:
    low confidence, flagged by AI, or unreviewed.
    """
    convs = db.query(Conversation).filter(
        Conversation.transcript_status == "completed"
    ).filter(
        (Conversation.ai_review_status == "needs_review") |
        (Conversation.confidence_score < 0.75) |
        (Conversation.ai_review_status == "unreviewed")
    ).order_by(desc(Conversation.conversation_date)).all()

    results = []
    for c in convs:
        # Get latest AI analysis
        latest_ai = db.query(AIAnalysis).filter(
            AIAnalysis.conversation_id == c.id
        ).order_by(desc(AIAnalysis.created_at)).first()

        results.append({
            "id": c.id,
            "external_call_id": c.external_call_id,
            "customer_name": c.customer_name,
            "sales_rep_name": c.sales_rep_name,
            "conversation_date": c.conversation_date,
            "ai_review_status": c.ai_review_status,
            "confidence_score": c.confidence_score,
            "ai_summary": c.ai_summary,
            "active_purposes": c.active_purposes,
            "is_manually_corrected": c.is_manually_corrected,
            "review_reason": latest_ai.review_reason if latest_ai else None,
            "original_predictions": latest_ai.predicted_purposes if latest_ai else [],
            "purposes_with_evidence": [
                {
                    "purpose": p.purpose_name,
                    "confidence": p.confidence,
                    "evidence": p.evidence_snippet,
                    "source": p.source,
                    "is_active": p.is_active
                }
                for p in c.purpose_associations
            ]
        })
    return results


@router.post("/{conversation_id}/review")
def review_or_correct_conversation(
    conversation_id: int,
    payload: ManualCorrectionRequest,
    db: Session = Depends(get_db)
):
    """
    Manager action: Approve AI labels or manually correct purposes and summary.
    Maintains complete audit history and preserves original vs effective labels.
    """
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found.")

    before_purposes = conv.active_purposes
    before_summary = conv.ai_summary

    if payload.review_action == "approve":
        conv.ai_review_status = "approved"
        # Mark active purposes as approved
        for p in conv.purpose_associations:
            if p.is_active and p.source == "ai_predicted":
                p.source = "manual_approved"

        audit = AuditEvent(
            conversation_id=conv.id,
            external_call_id=conv.external_call_id,
            event_type="label_approved",
            actor="Sales Manager",
            details=f"Approved AI classification for purposes: {', '.join(before_purposes)}."
        )
        db.add(audit)

    elif payload.review_action == "correct":
        conv.ai_review_status = "corrected"
        conv.is_manually_corrected = True

        # 1. Remove selected purposes (soft deactivate to preserve audit history)
        if payload.purposes_to_remove:
            for p in conv.purpose_associations:
                if p.purpose_name in payload.purposes_to_remove and p.is_active:
                    p.is_active = False

        # 2. Add selected purposes
        if payload.purposes_to_add:
            current_active = set(conv.active_purposes)
            for new_p in payload.purposes_to_add:
                if new_p not in current_active:
                    assoc = ConversationPurpose(
                        conversation_id=conv.id,
                        purpose_name=new_p,
                        source="manual_added",
                        confidence=1.0,
                        evidence_snippet="Manually assigned by Sales Manager during review.",
                        is_active=True
                    )
                    conv.purpose_associations.append(assoc)

        # 3. Edit summary if provided
        if payload.edited_summary and payload.edited_summary.strip():
            conv.ai_summary = payload.edited_summary.strip()

        db.flush()
        after_purposes = [p.purpose_name for p in conv.purpose_associations if p.is_active]
        audit = AuditEvent(
            conversation_id=conv.id,
            external_call_id=conv.external_call_id,
            event_type="label_corrected",
            actor="Sales Manager",
            before_state={
                "purposes": before_purposes,
                "summary": before_summary
            },
            after_state={
                "purposes": after_purposes,
                "summary": conv.ai_summary
            },
            details=f"Manager corrections applied. Added: {payload.purposes_to_add}; Removed: {payload.purposes_to_remove}. Notes: {payload.notes or 'None'}"
        )
        db.add(audit)

    # Recalculate completeness score
    db.flush()
    active_purposes_count = len([p for p in conv.purpose_associations if p.is_active])
    score, missing, _ = CompletenessService.calculate_score(conv, active_purposes_count)
    conv.completeness_score = score
    conv.missing_fields = missing

    # Resolve any pending review action recommendation
    ActionService.sync_recommendations_for_conversation(conv, db)

    db.commit()
    db.refresh(conv)

    return {
        "success": True,
        "message": f"Conversation successfully {payload.review_action}d.",
        "ai_review_status": conv.ai_review_status,
        "active_purposes": conv.active_purposes,
        "completeness_score": conv.completeness_score
    }


@router.post("/{conversation_id}/reanalyze")
def reanalyze_conversation(
    conversation_id: int,
    db: Session = Depends(get_db)
):
    """Re-run Groq AI analysis on conversation transcript."""
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found.")

    if not conv.transcript:
        raise HTTPException(status_code=400, detail="Cannot analyze conversation without a transcript.")

    ai_output = GroqService.analyze_transcript(
        transcript=conv.transcript,
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

    # Save analysis log
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

    # If not manually corrected, update active purposes
    if not conv.is_manually_corrected:
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

    # Recalculate completeness
    db.flush()
    active_purposes_count = len([p for p in conv.purpose_associations if p.is_active])
    score, missing, _ = CompletenessService.calculate_score(conv, active_purposes_count)
    conv.completeness_score = score
    conv.missing_fields = missing

    # Log audit event
    audit = AuditEvent(
        conversation_id=conv.id,
        external_call_id=conv.external_call_id,
        event_type="ai_analysis_completed",
        actor="Groq AI",
        details=f"AI re-analysis completed with confidence {ai_output.confidence:.2f}."
    )
    db.add(audit)

    ActionService.sync_recommendations_for_conversation(conv, db)

    db.commit()
    db.refresh(conv)

    return {
        "success": True,
        "message": "AI re-analysis completed successfully.",
        "ai_review_status": conv.ai_review_status,
        "confidence_score": conv.confidence_score,
        "completeness_score": conv.completeness_score
    }
