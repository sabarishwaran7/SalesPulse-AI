import io
import pytest
from backend.app.models import Conversation, ImportJob, AuditEvent


def test_import_new_and_commit(client, db_session):
    """Test importing new conversations and committing them to the database."""
    csv_content = (
        "call_id,customer_name,sales_rep_name,conversation_date,duration_seconds,conversation_type,transcript,follow_up_status\n"
        "CALL-TEST-001,Test Corp,John Doe,2026-10-20 14:00:00,1200,Call,Customer requested product demo and pricing quote.,Pending\n"
        "CALL-TEST-002,Beta LLC,Jane Smith,2026-10-21 10:00:00,1500,Meeting,Walkthrough of our sales intelligence platform.,Completed\n"
    )
    
    # Preview
    response = client.post(
        "/api/v1/imports/preview",
        files={"file": ("test_calls.csv", io.BytesIO(csv_content.encode("utf-8")), "text/csv")}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["total_rows"] == 2
    assert data["new_count"] == 2
    assert data["updated_count"] == 0
    assert data["duplicate_count"] == 0
    assert len(data["records"]) == 2
    
    job_id = data["job_id"]
    
    # Commit
    commit_res = client.post(
        "/api/v1/imports/commit",
        json={"job_id": job_id, "action": "commit"}
    )
    assert commit_res.status_code == 200
    commit_data = commit_res.json()
    assert commit_data["created_count"] == 2
    assert commit_data["status"] == "committed"
    
    # Verify records in database
    conv1 = db_session.query(Conversation).filter(Conversation.external_call_id == "CALL-TEST-001").first()
    assert conv1 is not None
    assert conv1.customer_name == "Test Corp"
    assert conv1.transcript_status == "completed"
    assert conv1.completeness_score > 0.0


def test_repeated_identical_import_no_duplicates(client, db_session):
    """Test that importing identical data repeatedly does not create duplicate database records."""
    csv_content = (
        "call_id,customer_name,sales_rep_name,conversation_date,duration_seconds\n"
        "CALL-IDEMPOTENT-01,Alpha Inc,John Doe,2026-10-20 14:00:00,1200\n"
    )
    
    # First Import
    res1 = client.post("/api/v1/imports/preview", files={"file": ("calls.csv", io.BytesIO(csv_content.encode("utf-8")), "text/csv")})
    job1_id = res1.json()["job_id"]
    client.post("/api/v1/imports/commit", json={"job_id": job1_id, "action": "commit"})
    
    initial_count = db_session.query(Conversation).count()
    assert initial_count == 1
    
    # Re-import identical data
    res2 = client.post("/api/v1/imports/preview", files={"file": ("calls_copy.csv", io.BytesIO(csv_content.encode("utf-8")), "text/csv")})
    data2 = res2.json()
    assert data2["new_count"] == 0
    assert data2["updated_count"] == 0
    assert data2["unchanged_count"] == 1
    
    # Commit again
    client.post("/api/v1/imports/commit", json={"job_id": data2["job_id"], "action": "commit"})
    
    # Verify count remains 1
    final_count = db_session.query(Conversation).count()
    assert final_count == 1


def test_duplicate_rows_within_file(client, db_session):
    """Test detecting duplicate rows inside the uploaded file."""
    csv_content = (
        "call_id,customer_name,sales_rep_name,conversation_date\n"
        "CALL-DUP-01,Client One,Alice,2026-10-20 14:00:00\n"
        "CALL-DUP-01,Client One,Alice,2026-10-20 14:00:00\n"
    )
    res = client.post("/api/v1/imports/preview", files={"file": ("dups.csv", io.BytesIO(csv_content.encode("utf-8")), "text/csv")})
    assert res.status_code == 200
    data = res.json()
    assert data["new_count"] == 1
    assert data["duplicate_count"] == 1
    
    # Commit
    client.post("/api/v1/imports/commit", json={"job_id": data["job_id"], "action": "commit"})
    assert db_session.query(Conversation).count() == 1


def test_updated_record_field_diff(client, db_session):
    """Test updating existing records and displaying accurate field-level diffs."""
    csv_initial = (
        "call_id,customer_name,sales_rep_name,conversation_date,duration_seconds\n"
        "CALL-UPDATE-01,Acme Original,Rep A,2026-10-20 14:00:00,600\n"
    )
    res1 = client.post("/api/v1/imports/preview", files={"file": ("c1.csv", io.BytesIO(csv_initial.encode("utf-8")), "text/csv")})
    client.post("/api/v1/imports/commit", json={"job_id": res1.json()["job_id"], "action": "commit"})
    
    # Updated CSV with new customer name and longer duration
    csv_update = (
        "call_id,customer_name,sales_rep_name,conversation_date,duration_seconds\n"
        "CALL-UPDATE-01,Acme Enterprise,Rep A,2026-10-20 14:00:00,1200\n"
    )
    res2 = client.post("/api/v1/imports/preview", files={"file": ("c2.csv", io.BytesIO(csv_update.encode("utf-8")), "text/csv")})
    data = res2.json()
    assert data["updated_count"] == 1
    assert data["new_count"] == 0
    
    record = data["records"][0]
    assert record["status"] == "updated"
    field_names = [f["field_name"] for f in record["fields_changed"]]
    assert "customer_name" in field_names
    assert "duration_seconds" in field_names
    
    # Commit update
    client.post("/api/v1/imports/commit", json={"job_id": data["job_id"], "action": "commit"})
    conv = db_session.query(Conversation).filter(Conversation.external_call_id == "CALL-UPDATE-01").first()
    assert conv.customer_name == "Acme Enterprise"
    assert conv.duration_seconds == 1200


def test_import_cancellation(client, db_session):
    """Test cancelling an import does not write proposed changes."""
    csv_content = (
        "call_id,customer_name,sales_rep_name,conversation_date\n"
        "CALL-CANCEL-01,Ghost Co,Agent X,2026-10-20 12:00:00\n"
    )
    res = client.post("/api/v1/imports/preview", files={"file": ("ghost.csv", io.BytesIO(csv_content.encode("utf-8")), "text/csv")})
    job_id = res.json()["job_id"]
    
    # Cancel
    cancel_res = client.post("/api/v1/imports/commit", json={"job_id": job_id, "action": "cancel"})
    assert cancel_res.status_code == 200
    assert cancel_res.json()["status"] == "cancelled"
    
    assert db_session.query(Conversation).filter(Conversation.external_call_id == "CALL-CANCEL-01").first() is None
