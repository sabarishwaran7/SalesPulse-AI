from typing import List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from backend.app.core.database import get_db
from backend.app.models import ActionRecommendation, Conversation
from backend.app.schemas import ActionStatusUpdate

router = APIRouter(prefix="/actions", tags=["Follow-up Action Center"])


@router.get("")
def list_action_recommendations(
    priority: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    action_type: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(ActionRecommendation).join(Conversation)

    if priority and priority != "all":
        query = query.filter(ActionRecommendation.priority == priority)

    if status_filter and status_filter != "all":
        query = query.filter(ActionRecommendation.status == status_filter)

    if action_type and action_type != "all":
        query = query.filter(ActionRecommendation.action_type == action_type)

    actions = query.order_by(
        # Priority order: High first
        desc(ActionRecommendation.priority == "High"),
        desc(ActionRecommendation.priority == "Medium"),
        desc(ActionRecommendation.created_at)
    ).all()

    results = []
    for a in actions:
        results.append({
            "id": a.id,
            "conversation_id": a.conversation_id,
            "external_call_id": a.conversation.external_call_id if a.conversation else "N/A",
            "customer_name": a.conversation.customer_name if a.conversation else "Unknown",
            "sales_rep_name": a.conversation.sales_rep_name if a.conversation else "Unassigned",
            "action_type": a.action_type,
            "title": a.title,
            "reason": a.reason,
            "suggested_action": a.suggested_action,
            "priority": a.priority,
            "status": a.status,
            "created_at": a.created_at,
            "updated_at": a.updated_at
        })

    return results


@router.patch("/{action_id}/status")
def update_action_status(
    action_id: int,
    payload: ActionStatusUpdate,
    db: Session = Depends(get_db)
):
    action = db.query(ActionRecommendation).filter(ActionRecommendation.id == action_id).first()
    if not action:
        raise HTTPException(status_code=404, detail="Action recommendation not found.")

    valid_statuses = ["Open", "In Progress", "Completed", "Dismissed"]
    if payload.status not in valid_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status '{payload.status}'. Must be one of: {valid_statuses}"
        )

    action.status = payload.status
    db.commit()
    db.refresh(action)

    return {"success": True, "id": action.id, "status": action.status}
