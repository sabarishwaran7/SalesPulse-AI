from typing import Tuple, List, Dict, Any
from backend.app.models import Conversation


class CompletenessService:
    """Calculates transparent, explainable conversation completeness scores."""

    WEIGHTS = {
        "identity": 25.0,        # Call ID, customer name, sales rep, valid date
        "transcript": 25.0,      # Transcript present and non-empty
        "purpose": 20.0,         # At least one verified or predicted purpose
        "ai_summary": 20.0,      # AI summary generated and available
        "follow_up": 10.0,       # Follow-up status explicitly determined
    }

    @classmethod
    def calculate_score(
        cls,
        conversation: Conversation,
        active_purposes_count: int = 0
    ) -> Tuple[float, List[str], Dict[str, Any]]:
        """
        Calculate conversation completeness percentage and identify missing fields.
        Returns: (score, missing_fields_list, explanation_dict)
        """
        missing = []
        breakdown = {}
        score = 0.0

        # 1. Identity Check
        has_identity = bool(
            conversation.external_call_id
            and conversation.customer_name
            and conversation.sales_rep_name
            and conversation.conversation_date
        )
        if has_identity:
            score += cls.WEIGHTS["identity"]
            breakdown["identity"] = {"points": cls.WEIGHTS["identity"], "status": "present"}
        else:
            missing.append("Conversation Identity (Customer, Rep, or Date)")
            breakdown["identity"] = {"points": 0.0, "status": "missing"}

        # 2. Transcript Check
        has_transcript = bool(
            conversation.transcript
            and len(conversation.transcript.strip()) >= 20
            and conversation.transcript_status == "completed"
        )
        if has_transcript:
            score += cls.WEIGHTS["transcript"]
            breakdown["transcript"] = {"points": cls.WEIGHTS["transcript"], "status": "present"}
        else:
            if conversation.transcript_status == "pending" or not conversation.transcript:
                missing.append("Transcript (Pending or Missing)")
            elif conversation.transcript_status == "failed":
                missing.append("Transcript Processing Failed")
            else:
                missing.append("Transcript (Incomplete)")
            breakdown["transcript"] = {"points": 0.0, "status": "missing"}

        # 3. Purpose Check
        if active_purposes_count > 0:
            score += cls.WEIGHTS["purpose"]
            breakdown["purpose"] = {"points": cls.WEIGHTS["purpose"], "status": "present"}
        else:
            missing.append("Conversation Purpose Label")
            breakdown["purpose"] = {"points": 0.0, "status": "missing"}

        # 4. AI Summary Check
        has_summary = bool(
            conversation.ai_summary
            and len(conversation.ai_summary.strip()) >= 10
        )
        if has_summary:
            score += cls.WEIGHTS["ai_summary"]
            breakdown["ai_summary"] = {"points": cls.WEIGHTS["ai_summary"], "status": "present"}
        else:
            missing.append("AI Summary & Analysis")
            breakdown["ai_summary"] = {"points": 0.0, "status": "missing"}

        # 5. Follow-up Status Check
        has_follow_up = bool(
            conversation.follow_up_status
            and conversation.follow_up_status.lower() not in ("none", "unassigned", "")
        )
        if has_follow_up:
            score += cls.WEIGHTS["follow_up"]
            breakdown["follow_up"] = {"points": cls.WEIGHTS["follow_up"], "status": "present"}
        else:
            missing.append("Follow-up Status")
            breakdown["follow_up"] = {"points": 0.0, "status": "missing"}

        return round(score, 1), missing, breakdown
