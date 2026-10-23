import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.core.database import SessionLocal
from backend.app.services.spendnest_service import SpendNestService
from backend.app.models import Conversation


@pytest.fixture(scope="module")
def client():
    return TestClient(app)


def test_spendnest_full_replay_lifecycle(client):
    db = SessionLocal()
    try:
        # Step 1: Clean Reset and Initial Batch Load
        res_initial = SpendNestService.reset_database_to_initial(db)
        assert res_initial["total_unique_records"] == 44
        assert res_initial["usable_text_count"] == 17
        assert res_initial["created_records"] == 44

        # Verify M07 in initial state (has no usable text)
        m07 = db.query(Conversation).filter(Conversation.record_ref == "M07").first()
        assert m07 is not None
        assert m07.has_usable_text is False
        assert m07.revision == 1

        # Step 2: Repeat Initial Batch (no duplicates)
        res_repeat = SpendNestService.load_initial_batch(db)
        assert res_repeat["created_records"] == 0
        assert res_repeat["ignored_records"] == 44
        assert res_repeat["total_unique_records"] == 44

        # Step 3: Manual Route Correction on M07
        resp_route = client.post(
            f"/api/v1/spendnest/conversations/{m07.id}/route",
            json={"routes": ["Customer Follow-Up", "Urgent Support Escalation"], "reason": "Customer demonstrated description save bug"}
        )
        assert resp_route.status_code == 200
        assert resp_route.json()["is_manually_routed"] is True

        # Refresh m07 from db
        db.refresh(m07)
        assert m07.is_manually_routed is True
        assert "Customer Follow-Up" in m07.assigned_routes

        # Step 4: Apply Update Batch (02_update.json)
        res_update = SpendNestService.load_update_batch(db)
        assert res_update["updated_records"] == 1
        assert res_update["total_unique_records"] == 44
        assert res_update["usable_text_count"] == 18

        # Step 5: Verify Judgment Preserved
        db.refresh(m07)
        assert m07.revision == 2
        assert m07.has_usable_text is True
        assert len(m07.transcript) > 100
        # Manual route is PRESERVED!
        assert m07.is_manually_routed is True
        assert "Customer Follow-Up" in m07.assigned_routes
        assert "Stale" in m07.analysis_freshness

        # Step 6: Repeat Initial Batch after update (should be ignored because rev 1 < rev 2)
        res_re_initial = SpendNestService.load_initial_batch(db)
        assert res_re_initial["created_records"] == 0
        assert res_re_initial["ignored_records"] == 44
        assert res_re_initial["total_unique_records"] == 44
        assert res_re_initial["usable_text_count"] == 18

        # Step 7: Export Archive and Manifest verification
        resp_export = client.get("/api/v1/spendnest/export-archive")
        assert resp_export.status_code == 200
        assert len(resp_export.content) > 1000

        # Step 8: Dashboard API metrics verification
        resp_dash = client.get("/api/v1/spendnest/dashboard")
        assert resp_dash.status_code == 200
        kpis = resp_dash.json()["kpis"]
        assert kpis["total_selected_records"] == 44
        assert kpis["usable_transcript_coverage_count"] == 18
        assert kpis["calls_count"] == 30
        assert kpis["meetings_count"] == 14
        assert kpis["manual_route_overrides_count"] == 1

    finally:
        db.close()
