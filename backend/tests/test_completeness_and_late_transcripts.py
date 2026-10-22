from datetime import datetime
from backend.app.models import Conversation, ActionRecommendation, AuditEvent
from backend.app.services.completeness_service import CompletenessService


def test_completeness_calculation():
    """Verify transparent weights and missing fields detection."""
    conv = Conversation(
        external_call_id="CALL-COMP-01",
        customer_name="Alpha",
        sales_rep_name="Bob",
        conversation_date=datetime.utcnow(),
        transcript=None,
        transcript_status="pending",
        follow_up_status="None",
        ai_summary=None
    )
    score, missing, breakdown = CompletenessService.calculate_score(conv, active_purposes_count=0)
    # Only identity is present: 25.0%
    assert score == 25.0
    assert any("Transcript" in m for m in missing)
    assert any("Purpose" in m for m in missing)
    assert any("AI Summary" in m for m in missing)
    assert any("Follow-up" in m for m in missing)


def test_late_transcript_workflow(client, db_session):
    """Test full workflow where call arrives first without transcript and transcript arrives later."""
    # 1. Create call metadata without transcript
    conv = Conversation(
        external_call_id="CALL-LATE-01",
        customer_name="Cloud Solutions Inc",
        sales_rep_name="Sarah Jenkins",
        conversation_date=datetime.utcnow(),
        duration_seconds=900,
        transcript=None,
        transcript_status="pending",
        follow_up_status="Pending",
        completeness_score=35.0
    )
    db_session.add(conv)
    db_session.commit()
    db_session.refresh(conv)

    conv_id = conv.id
    assert conv.transcript_status == "pending"
    assert conv.completeness_score < 50.0

    # 2. Upload late transcript via API
    late_transcript = (
        "Sarah: Hello Alex, thanks for joining our demo today. "
        "Alex: We want to review the pricing tier and see if you offer volume discounts. "
        "Sarah: Yes, our Enterprise tier includes custom volume discounting for over 50 users."
    )
    res = client.post(f"/api/v1/conversations/{conv_id}/transcript", json={"transcript": late_transcript})
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True

    # 3. Verify conversation is updated
    db_session.refresh(conv)
    assert conv.transcript_status == "completed"
    assert conv.transcript == late_transcript
    assert conv.ai_summary is not None
    assert conv.completeness_score > 70.0  # Identity + Transcript + Purpose + AI Summary + Followup

    # 4. Verify audit event was logged
    audit = db_session.query(AuditEvent).filter(
        AuditEvent.conversation_id == conv_id,
        AuditEvent.event_type == "transcript_received"
    ).first()
    assert audit is not None
