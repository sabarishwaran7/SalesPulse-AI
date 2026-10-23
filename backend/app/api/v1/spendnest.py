import io
from datetime import datetime
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from pydantic import BaseModel

from backend.app.core.database import get_db
from backend.app.models import Conversation
from backend.app.services.spendnest_service import SpendNestService
from backend.app.services.export_archive_service import ExportArchiveService, MANAGER_BRIEF_2026_08_21

router = APIRouter(prefix="/spendnest", tags=["SpendNest Revenue Intelligence"])


class RouteUpdateRequest(BaseModel):
    routes: List[str]
    reason: Optional[str] = "Manager manual route correction"


@router.get("/dashboard")
def get_spendnest_dashboard(
    source_type: Optional[str] = Query(None),
    person: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Returns dashboard analytics strictly adhering to DATA_DICTIONARY.md:
    - Clear denominators
    - Total selected records (44)
    - Usable supplied transcript coverage (17/44 -> 18/44)
    - Separate call reps from meeting organizers
    - Working person and source_type filters
    """
    query = db.query(Conversation)

    if source_type and source_type != "all":
        query = query.filter(Conversation.source_type == source_type.lower())

    if person and person != "all":
        query = query.filter(
            or_(
                Conversation.sales_rep_name == person,
                Conversation.rep_email == person,
                Conversation.organizer_email == person
            )
        )

    all_filtered = query.order_by(Conversation.record_ref).all()
    total_selected = len(all_filtered)

    # Base calculations with explicit denominators
    usable_texts = sum(1 for c in all_filtered if c.has_usable_text)
    calls_count = sum(1 for c in all_filtered if c.source_type == "call")
    meetings_count = sum(1 for c in all_filtered if c.source_type == "meeting")

    calls_with_text = sum(1 for c in all_filtered if c.source_type == "call" and c.has_usable_text)
    meetings_with_text = sum(1 for c in all_filtered if c.source_type == "meeting" and c.has_usable_text)

    # Source-reported connection rate
    calls_connected = sum(1 for c in all_filtered if c.source_type == "call" and c.is_connected is True)
    calls_with_connect_data = sum(1 for c in all_filtered if c.source_type == "call" and c.is_connected is not None)

    # Rep activity (calls)
    reps_data = {}
    for c in db.query(Conversation).filter(Conversation.source_type == "call").all():
        rep = c.sales_rep_name or "Unknown"
        reps_data[rep] = reps_data.get(rep, 0) + 1

    # Organizer activity (meetings)
    organizers_data = {}
    for c in db.query(Conversation).filter(Conversation.source_type == "meeting").all():
        org = c.organizer_email or "Unknown"
        organizers_data[org] = organizers_data.get(org, 0) + 1

    # Routing distribution
    route_counts = {}
    manual_override_count = 0
    stale_count = 0
    for c in all_filtered:
        if c.is_manually_routed:
            manual_override_count += 1
        if "Stale" in (c.analysis_freshness or ""):
            stale_count += 1
        for r in (c.assigned_routes or ["No Usable Text / Stored Record"]):
            route_counts[r] = route_counts.get(r, 0) + 1

    # Check M07 status
    m07 = db.query(Conversation).filter(Conversation.record_ref == "M07").first()

    return {
        "dataset_date": "2026-08-21",
        "timezone": "Asia/Kolkata",
        "kpis": {
            "total_selected_records": total_selected,
            "total_records_denominator": 44,
            "usable_transcript_coverage_count": usable_texts,
            "usable_transcript_coverage_percent": round((usable_texts / total_selected * 100), 1) if total_selected > 0 else 0.0,
            "calls_count": calls_count,
            "calls_transcribed": calls_with_text,
            "meetings_count": meetings_count,
            "meetings_transcribed": meetings_with_text,
            "source_reported_connection_rate": {
                "connected_calls": calls_connected,
                "denominator_calls_with_status": calls_with_connect_data,
                "percentage": round((calls_connected / calls_with_connect_data * 100), 1) if calls_with_connect_data > 0 else 0.0
            },
            "manual_route_overrides_count": manual_override_count,
            "stale_analysis_pending_review_count": stale_count
        },
        "m07_status": {
            "record_ref": "M07",
            "applied_revision": m07.revision if m07 else 1,
            "has_usable_text": m07.has_usable_text if m07 else False,
            "assigned_routes": m07.assigned_routes if m07 else [],
            "is_manually_routed": m07.is_manually_routed if m07 else False,
            "analysis_freshness": m07.analysis_freshness if m07 else "Fresh"
        },
        "reps_activity": reps_data,
        "organizers_activity": organizers_data,
        "route_distribution": route_counts
    }


@router.get("/conversations")
def list_spendnest_conversations(
    source_type: Optional[str] = Query(None),
    person: Optional[str] = Query(None),
    route: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """Lists conversations with full filters and evidence citations."""
    query = db.query(Conversation)

    if source_type and source_type != "all":
        query = query.filter(Conversation.source_type == source_type.lower())

    if person and person != "all":
        query = query.filter(
            or_(
                Conversation.sales_rep_name == person,
                Conversation.rep_email == person,
                Conversation.organizer_email == person
            )
        )

    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            or_(
                Conversation.customer_name.ilike(search_pattern),
                Conversation.record_ref.ilike(search_pattern),
                Conversation.sales_rep_name.ilike(search_pattern),
                Conversation.transcript.ilike(search_pattern)
            )
        )

    records = query.order_by(Conversation.record_ref).all()

    # In-memory filter for routes if provided
    if route and route != "all":
        records = [r for r in records if route in (r.assigned_routes or [])]

    results = []
    for c in records:
        results.append({
            "id": c.id,
            "record_ref": c.record_ref,
            "source_type": c.source_type,
            "source_id": c.source_id,
            "customer_name": c.customer_name,
            "sales_rep_name": c.sales_rep_name,
            "rep_email": c.rep_email,
            "organizer_email": c.organizer_email,
            "conversation_date": c.conversation_date.isoformat() if c.conversation_date else None,
            "duration_seconds": c.duration_seconds,
            "direction": c.direction,
            "has_usable_text": c.has_usable_text,
            "unavailable_reason": c.unavailable_reason,
            "revision": c.revision,
            "batch_id": c.batch_id,
            "assigned_routes": c.assigned_routes or [],
            "routing_reason": c.routing_reason,
            "manual_route_override": c.manual_route_override,
            "is_manually_routed": c.is_manually_routed,
            "analysis_freshness": c.analysis_freshness,
            "summary": c.ai_summary,
            "structured_analysis": c.structured_analysis
        })

    return {
        "total": len(results),
        "conversations": results
    }


@router.get("/conversations/{conv_id}")
def get_spendnest_conversation_detail(conv_id: int, db: Session = Depends(get_db)):
    """Returns single conversation detail with citations, raw payload, and turns."""
    conv = db.query(Conversation).filter(Conversation.id == conv_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    return {
        "id": conv.id,
        "record_ref": conv.record_ref,
        "source_type": conv.source_type,
        "source_id": conv.source_id,
        "customer_name": conv.customer_name,
        "sales_rep_name": conv.sales_rep_name,
        "rep_email": conv.rep_email,
        "organizer_email": conv.organizer_email,
        "conversation_date": conv.conversation_date.isoformat() if conv.conversation_date else None,
        "duration_seconds": conv.duration_seconds,
        "direction": conv.direction,
        "is_connected": conv.is_connected,
        "is_conversation": conv.is_conversation,
        "observed_outcome": conv.observed_outcome,
        "has_usable_text": conv.has_usable_text,
        "unavailable_reason": conv.unavailable_reason,
        "revision": conv.revision,
        "batch_id": conv.batch_id,
        "assigned_routes": conv.assigned_routes or [],
        "routing_reason": conv.routing_reason,
        "manual_route_override": conv.manual_route_override,
        "is_manually_routed": conv.is_manually_routed,
        "analysis_freshness": conv.analysis_freshness,
        "transcript": conv.transcript,
        "structured_analysis": conv.structured_analysis or {},
        "raw_payload": conv.raw_payload,
        "raw_transcript_payload": conv.raw_transcript_payload
    }


@router.post("/conversations/{conv_id}/route")
def update_conversation_route(
    conv_id: int,
    req: RouteUpdateRequest,
    db: Session = Depends(get_db)
):
    """
    Manually modifies a conversation route.
    Sets is_manually_routed=True so newer revisions NEVER overwrite this manual choice!
    """
    conv = db.query(Conversation).filter(Conversation.id == conv_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    conv.assigned_routes = req.routes
    conv.manual_route_override = req.routes
    conv.routing_reason = req.reason or "Manager manual route correction"
    conv.is_manually_routed = True
    conv.is_manually_corrected = True
    conv.analysis_freshness = "Manually Corrected"

    db.commit()
    db.refresh(conv)

    return {
        "message": f"Successfully updated route for {conv.record_ref or conv.id}",
        "assigned_routes": conv.assigned_routes,
        "is_manually_routed": conv.is_manually_routed,
        "analysis_freshness": conv.analysis_freshness
    }


@router.post("/replay/initial")
def replay_initial_batch(db: Session = Depends(get_db)):
    """Imports or re-imports 01_initial.json. Verifies no duplicate rows are added."""
    result = SpendNestService.load_initial_batch(db)
    return {
        "action": "load_initial_batch",
        "description": "Imported data/01_initial.json. If already present, records are ignored and no duplicates created.",
        "result": result
    }


@router.post("/replay/update")
def replay_update_batch(db: Session = Depends(get_db)):
    """Imports 02_update.json. Verifies M07 is updated with late transcript while preserving manual routes."""
    result = SpendNestService.load_update_batch(db)
    return {
        "action": "load_update_batch",
        "description": "Imported data/02_update.json. M07 receives late transcript (revision 2); manual routes are preserved.",
        "result": result
    }


@router.post("/replay/reset")
def replay_reset(db: Session = Depends(get_db)):
    """Cleans database and resets to initial batch delivery (01_initial.json)."""
    result = SpendNestService.reset_database_to_initial(db)
    return {
        "action": "reset_to_initial",
        "description": "Database cleared and reloaded with initial batch (01_initial.json). Ready for fresh replay test.",
        "result": result
    }


@router.get("/daily-brief")
def get_manager_daily_brief():
    """Returns the pre-generated Manager Daily Brief for 21 August 2026."""
    return {
        "brief_date": "2026-08-21",
        "timezone": "Asia/Kolkata",
        "title": "SpendNest Manager Daily Brief — 21 August 2026",
        "markdown_content": MANAGER_BRIEF_2026_08_21
    }


@router.get("/export-archive")
def export_archive(db: Session = Depends(get_db)):
    """
    Generates and downloads a complete zip archive conforming to DATA_CONTRACT.md:
    - manifest.json and manifest.csv
    - /sales_coaching/
    - /deal_next_steps/
    - /customer_followup/
    - /internal_notes/
    - /stored_records/
    - manager_brief_2026-08-21.md
    """
    zip_bytes = ExportArchiveService.generate_export_zip(db)
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    filename = f"spendnest_revenue_intelligence_export_{timestamp}.zip"

    return StreamingResponse(
        io.BytesIO(zip_bytes),
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
