from typing import List
from datetime import datetime
from sqlalchemy.orm import Session
from backend.app.models import Conversation, ActionRecommendation


class ActionService:

    @classmethod
    def sync_recommendations_for_conversation(cls, conv: Conversation, db: Session):
        """
        Evaluate a conversation's state and ensure appropriate action recommendations exist.
        """
        existing_actions = {
            a.action_type: a
            for a in conv.action_recommendations
        }

        # 1. Missing Transcript
        if conv.transcript_status == "pending" or not conv.transcript:
            if "request_transcript" not in existing_actions:
                act = ActionRecommendation(
                    conversation_id=conv.id,
                    action_type="request_transcript",
                    title=f"Upload Transcript for {conv.external_call_id}",
                    reason=f"Call metadata for '{conv.customer_name}' was imported, but transcript is pending. AI analysis cannot run until transcript is provided.",
                    suggested_action="Upload or paste call transcript in the Conversation Detail page.",
                    priority="High",
                    status="Open"
                )
                db.add(act)
        else:
            # If transcript is now present, mark request_transcript completed if still open
            if "request_transcript" in existing_actions and existing_actions["request_transcript"].status == "Open":
                existing_actions["request_transcript"].status = "Completed"

        # 2. Failed AI Analysis
        if conv.transcript_status == "failed" or (conv.transcript and not conv.ai_summary and conv.transcript_status == "completed"):
            if "retry_ai" not in existing_actions:
                act = ActionRecommendation(
                    conversation_id=conv.id,
                    action_type="retry_ai",
                    title=f"Run AI Analysis for {conv.external_call_id}",
                    reason="Transcript is present, but AI intelligence summary has not completed successfully.",
                    suggested_action="Trigger AI re-analysis from Conversation Details or the AI Review Center.",
                    priority="High",
                    status="Open"
                )
                db.add(act)

        # 3. Low Confidence / Needs Review
        if conv.ai_review_status == "needs_review":
            if "review_purpose" not in existing_actions:
                act = ActionRecommendation(
                    conversation_id=conv.id,
                    action_type="review_purpose",
                    title=f"Review AI Classification for {conv.customer_name}",
                    reason=f"AI model flagged this conversation for human review due to low confidence ({conv.confidence_score:.2f}) or conflicting evidence.",
                    suggested_action="Review predicted purposes, approve or correct labels in the AI Review Center.",
                    priority="Medium",
                    status="Open"
                )
                db.add(act)
        elif conv.ai_review_status in ("approved", "corrected"):
            if "review_purpose" in existing_actions and existing_actions["review_purpose"].status == "Open":
                existing_actions["review_purpose"].status = "Completed"

        # 4. Overdue Follow-up
        if conv.follow_up_status == "Overdue":
            if "overdue_followup" not in existing_actions:
                act = ActionRecommendation(
                    conversation_id=conv.id,
                    action_type="overdue_followup",
                    title=f"Overdue Follow-Up with {conv.customer_name}",
                    reason=f"Scheduled follow-up by rep {conv.sales_rep_name} has exceeded its due date.",
                    suggested_action="Contact customer to verify status of action items and update follow-up state.",
                    priority="High",
                    status="Open"
                )
                db.add(act)

        # 5. Product Demo Follow-up
        active_purposes = [p.purpose_name for p in conv.purpose_associations if p.is_active]
        if "Product Demo" in active_purposes and conv.follow_up_status in ("None", "Pending"):
            if "schedule_demo" not in existing_actions:
                act = ActionRecommendation(
                    conversation_id=conv.id,
                    action_type="schedule_demo",
                    title=f"Send Demo Follow-Up & Next Steps to {conv.customer_name}",
                    reason="Product demonstration was conducted during this call. Prompt follow-up dramatically increases conversion.",
                    suggested_action="Send recording, architectural overview, and propose a commercial discussion meeting.",
                    priority="Medium",
                    status="Open"
                )
                db.add(act)

        db.flush()
