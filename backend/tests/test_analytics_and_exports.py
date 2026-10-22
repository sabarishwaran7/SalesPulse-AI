from datetime import datetime, timedelta
from backend.app.models import Conversation, ConversationPurpose


def test_dashboard_metrics_match_database(client, db_session):
    """Test that dashboard analytics metrics strictly agree with underlying database records."""
    # Insert 3 conversations
    c1 = Conversation(
        external_call_id="CALL-M-01",
        customer_name="Client A",
        sales_rep_name="Sarah Jenkins",
        conversation_date=datetime.utcnow(),
        conversation_type="Call",
        transcript="Test transcript",
        transcript_status="completed",
        completeness_score=90.0,
        ai_review_status="approved",
        follow_up_status="Pending"
    )
    c2 = Conversation(
        external_call_id="CALL-M-02",
        customer_name="Client B",
        sales_rep_name="Michael Chang",
        conversation_date=datetime.utcnow(),
        conversation_type="Meeting",
        transcript=None,
        transcript_status="pending",
        completeness_score=35.0,
        ai_review_status="unreviewed",
        follow_up_status="None"
    )
    c3 = Conversation(
        external_call_id="CALL-M-03",
        customer_name="Client C",
        sales_rep_name="Sarah Jenkins",
        conversation_date=datetime.utcnow(),
        conversation_type="Call",
        transcript="Test transcript 2",
        transcript_status="completed",
        completeness_score=60.0,
        ai_review_status="needs_review",
        follow_up_status="Overdue"
    )
    db_session.add_all([c1, c2, c3])
    db_session.commit()

    res = client.get("/api/v1/analytics/dashboard")
    assert res.status_code == 200
    data = res.json()
    kpis = data["kpis"]

    assert kpis["total_conversations"] == 3
    assert kpis["calls_count"] == 2
    assert kpis["meetings_count"] == 1
    assert kpis["transcript_pending_count"] == 1
    assert kpis["incomplete_count"] == 2  # c2 (35) and c3 (60) < 80.0
    assert kpis["ai_review_needed_count"] == 1  # c3
    assert kpis["follow_ups_due_count"] == 2  # c1 (Pending) + c3 (Overdue)


def test_exports_csv_and_excel(client, db_session):
    """Test generating CSV and Excel reports."""
    c = Conversation(
        external_call_id="CALL-EXP-01",
        customer_name="Export Corp",
        sales_rep_name="David Vance",
        conversation_date=datetime.utcnow(),
        conversation_type="Call",
        transcript_status="completed",
        completeness_score=85.0,
        follow_up_status="Completed"
    )
    db_session.add(c)
    db_session.commit()

    # CSV Export
    res_csv = client.get("/api/v1/reports/export?report_type=all_conversations&format=csv")
    assert res_csv.status_code == 200
    assert "text/csv" in res_csv.headers["content-type"]
    assert "CALL-EXP-01" in res_csv.text

    # Excel Export
    res_xlsx = client.get("/api/v1/reports/export?report_type=all_conversations&format=xlsx")
    assert res_xlsx.status_code == 200
    assert len(res_xlsx.content) > 100
