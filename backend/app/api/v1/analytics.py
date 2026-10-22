from datetime import datetime, timedelta
from typing import Optional, List, Dict
from collections import defaultdict
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.app.core.database import get_db
from backend.app.models import Conversation, ConversationPurpose, ActionRecommendation
from backend.app.schemas import (
    DashboardAnalyticsResponse, KpiMetrics, VolumeDataPoint,
    PurposeDistribution, TranscriptStatusMetric, CompletenessDistribution,
    RepActivityMetric
)

router = APIRouter(prefix="/analytics", tags=["Analytics"])

PURPOSE_COLORS = {
    "Sales": "#4f46e5",            # Indigo
    "Product Demo": "#06b6d4",     # Cyan
    "Pricing": "#10b981",          # Emerald
    "Negotiation": "#f59e0b",      # Amber
    "Customer Support": "#ef4444", # Rose/Red
    "Objection Handling": "#8b5cf6",# Violet
    "Follow-up": "#3b82f6",        # Blue
    "Renewal": "#14b8a6",          # Teal
}


@router.get("/dashboard", response_model=DashboardAnalyticsResponse)
def get_dashboard_analytics(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    sales_rep: Optional[str] = Query(None),
    purpose: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(Conversation)

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

    if sales_rep and sales_rep != "all":
        query = query.filter(Conversation.sales_rep_name == sales_rep)

    if purpose and purpose != "all":
        query = query.join(Conversation.purpose_associations).filter(
            ConversationPurpose.purpose_name == purpose,
            ConversationPurpose.is_active == True
        )

    conversations: List[Conversation] = query.all()
    total_convs = len(conversations)

    calls_count = sum(1 for c in conversations if (c.conversation_type or "").lower() == "call")
    meetings_count = sum(1 for c in conversations if (c.conversation_type or "").lower() in ("meeting", "video demo"))
    pending_transcripts = sum(1 for c in conversations if c.transcript_status == "pending" or not c.transcript)
    incomplete_count = sum(1 for c in conversations if (c.completeness_score or 0) < 80.0)
    ai_review_count = sum(1 for c in conversations if c.ai_review_status == "needs_review")
    follow_ups_due = sum(1 for c in conversations if c.follow_up_status in ("Pending", "Overdue"))
    avg_completeness = (sum(c.completeness_score or 0 for c in conversations) / total_convs) if total_convs > 0 else 0.0

    kpis = KpiMetrics(
        total_conversations=total_convs,
        calls_count=calls_count,
        meetings_count=meetings_count,
        transcript_pending_count=pending_transcripts,
        incomplete_count=incomplete_count,
        ai_review_needed_count=ai_review_count,
        follow_ups_due_count=follow_ups_due,
        average_completeness=round(avg_completeness, 1)
    )

    # 1. Volume Over Time (Group by Date)
    volume_dict = defaultdict(lambda: {"calls": 0, "meetings": 0, "total": 0})
    for c in conversations:
        if c.conversation_date:
            d_str = c.conversation_date.strftime("%Y-%m-%d")
            is_call = (c.conversation_type or "").lower() == "call"
            if is_call:
                volume_dict[d_str]["calls"] += 1
            else:
                volume_dict[d_str]["meetings"] += 1
            volume_dict[d_str]["total"] += 1

    volume_over_time = [
        VolumeDataPoint(
            date=d,
            calls=data["calls"],
            meetings=data["meetings"],
            total=data["total"]
        )
        for d, data in sorted(volume_dict.items())
    ]

    # 2. Purpose Distribution
    conv_ids = [c.id for c in conversations]
    purpose_counts = defaultdict(int)
    if conv_ids:
        active_purposes = db.query(ConversationPurpose).filter(
            ConversationPurpose.conversation_id.in_(conv_ids),
            ConversationPurpose.is_active == True
        ).all()
        for p in active_purposes:
            purpose_counts[p.purpose_name] += 1

    total_purposes = sum(purpose_counts.values()) or 1
    purpose_distribution = [
        PurposeDistribution(
            purpose=p_name,
            count=count,
            percentage=round((count / total_purposes) * 100, 1),
            color=PURPOSE_COLORS.get(p_name, "#6366f1")
        )
        for p_name, count in sorted(purpose_counts.items(), key=lambda x: x[1], reverse=True)
    ]

    # 3. Transcript Processing Status
    transcript_counts = defaultdict(int)
    for c in conversations:
        transcript_counts[c.transcript_status or "pending"] += 1

    transcript_colors = {
        "completed": "#10b981",
        "pending": "#f59e0b",
        "processing": "#3b82f6",
        "failed": "#ef4444"
    }
    transcript_breakdown = [
        TranscriptStatusMetric(
            status=status.capitalize(),
            count=count,
            color=transcript_colors.get(status.lower(), "#94a3b8")
        )
        for status, count in transcript_counts.items()
    ]

    # 4. Completeness Distribution (Tiers: 0-25%, 26-50%, 51-75%, 76-100%)
    tiers = {"0-25%": 0, "26-50%": 0, "51-75%": 0, "76-100%": 0}
    for c in conversations:
        score = c.completeness_score or 0.0
        if score <= 25.0:
            tiers["0-25%"] += 1
        elif score <= 50.0:
            tiers["26-50%"] += 1
        elif score <= 75.0:
            tiers["51-75%"] += 1
        else:
            tiers["76-100%"] += 1

    completeness_distribution = [
        CompletenessDistribution(tier=tier, count=count)
        for tier, count in tiers.items()
    ]

    # 5. Follow-Up Breakdown
    follow_up_counts = defaultdict(int)
    for c in conversations:
        follow_up_counts[c.follow_up_status or "None"] += 1

    # 6. Rep Activity Metrics
    rep_dict = defaultdict(lambda: {"total": 0, "completed_transcripts": 0, "scores": [], "follow_ups": 0})
    for c in conversations:
        rep = c.sales_rep_name or "Unassigned"
        rep_dict[rep]["total"] += 1
        if c.transcript_status == "completed":
            rep_dict[rep]["completed_transcripts"] += 1
        rep_dict[rep]["scores"].append(c.completeness_score or 0.0)
        if c.follow_up_status in ("Pending", "Overdue"):
            rep_dict[rep]["follow_ups"] += 1

    rep_activity = [
        RepActivityMetric(
            rep_name=rep,
            total_conversations=info["total"],
            completed_transcripts=info["completed_transcripts"],
            avg_completeness=round(sum(info["scores"]) / len(info["scores"]), 1) if info["scores"] else 0.0,
            follow_ups_open=info["follow_ups"]
        )
        for rep, info in sorted(rep_dict.items(), key=lambda x: x[1]["total"], reverse=True)
    ]

    return DashboardAnalyticsResponse(
        kpis=kpis,
        volume_over_time=volume_over_time,
        purpose_distribution=purpose_distribution,
        transcript_status_breakdown=transcript_breakdown,
        completeness_distribution=completeness_distribution,
        follow_up_breakdown=dict(follow_up_counts),
        rep_activity=rep_activity
    )
