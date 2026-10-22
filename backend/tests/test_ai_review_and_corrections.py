from datetime import datetime
from backend.app.models import Conversation, ConversationPurpose, AuditEvent
from backend.app.services.groq_service import GroqService


def test_groq_service_resilient_analysis():
    """Verify Groq service produces structured output with multiple purposes and requirements."""
    transcript = (
        "Rep: Today we'll do a complete product demo of our dashboard. "
        "Customer: We love the demo, but our budget is tight and the pricing seems high. Can you discount? "
        "Rep: We can discuss contract terms and payment schedules."
    )
    output = GroqService.analyze_transcript(transcript, customer_name="Enterprise Corp")
    assert output.summary is not None
    assert len(output.predicted_purposes) >= 2
    purposes = [p.purpose for p in output.predicted_purposes]
    assert "Product Demo" in purposes or "Pricing" in purposes
    assert output.confidence > 0.0


def test_ai_review_approval(client, db_session):
    """Test sales manager approving AI classification in review center."""
    conv = Conversation(
        external_call_id="CALL-REV-01",
        customer_name="Starlight Corp",
        sales_rep_name="Elena Rostova",
        conversation_date=datetime.utcnow(),
        transcript="Discussed product features and demo.",
        transcript_status="completed",
        ai_summary="Demo walkthrough call.",
        ai_review_status="needs_review",
        confidence_score=0.68,
        completeness_score=60.0
    )
    db_session.add(conv)
    db_session.flush()

    p1 = ConversationPurpose(
        conversation_id=conv.id,
        purpose_name="Product Demo",
        source="ai_predicted",
        confidence=0.68,
        is_active=True
    )
    db_session.add(p1)
    db_session.commit()

    # Approve
    res = client.post(
        f"/api/v1/ai-review/{conv.id}/review",
        json={"review_action": "approve"}
    )
    assert res.status_code == 200
    assert res.json()["ai_review_status"] == "approved"

    db_session.refresh(conv)
    assert conv.ai_review_status == "approved"
    assert db_session.query(AuditEvent).filter(
        AuditEvent.conversation_id == conv.id,
        AuditEvent.event_type == "label_approved"
    ).first() is not None


def test_ai_review_corrections(client, db_session):
    """Test sales manager correcting labels and editing summary with complete audit trail."""
    conv = Conversation(
        external_call_id="CALL-CORR-01",
        customer_name="Pinnacle Inc",
        sales_rep_name="Michael Chang",
        conversation_date=datetime.utcnow(),
        transcript="Customer discussed pricing and contract terms.",
        transcript_status="completed",
        ai_summary="Old summary.",
        ai_review_status="needs_review",
        confidence_score=0.72,
        completeness_score=60.0
    )
    db_session.add(conv)
    db_session.flush()

    p_wrong = ConversationPurpose(
        conversation_id=conv.id,
        purpose_name="Customer Support",  # AI misclassified
        source="ai_predicted",
        is_active=True
    )
    db_session.add(p_wrong)
    db_session.commit()

    # Manager corrects: remove Customer Support, add Pricing and Negotiation
    res = client.post(
        f"/api/v1/ai-review/{conv.id}/review",
        json={
            "review_action": "correct",
            "purposes_to_remove": ["Customer Support"],
            "purposes_to_add": ["Pricing", "Negotiation"],
            "edited_summary": "Updated enterprise contract negotiation call.",
            "notes": "Corrected AI misclassification from support to pricing/negotiation."
        }
    )
    assert res.status_code == 200
    db_session.refresh(conv)

    assert conv.ai_review_status == "corrected"
    assert conv.is_manually_corrected is True
    assert conv.ai_summary == "Updated enterprise contract negotiation call."

    active_purposes = conv.active_purposes
    assert "Customer Support" not in active_purposes
    assert "Pricing" in active_purposes
    assert "Negotiation" in active_purposes

    # Verify audit event preserves before/after state
    audit = db_session.query(AuditEvent).filter(
        AuditEvent.conversation_id == conv.id,
        AuditEvent.event_type == "label_corrected"
    ).first()
    assert audit is not None
    assert "Customer Support" in audit.before_state["purposes"]
    assert "Pricing" in audit.after_state["purposes"]
