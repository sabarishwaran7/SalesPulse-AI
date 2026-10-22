from typing import Optional, Dict, Any
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.app.core.config import settings
from backend.app.core.database import get_db
from backend.app.models import (
    Conversation, ConversationPurpose, AIAnalysis, AuditEvent,
    ActionRecommendation, ImportJob, Purpose
)
from backend.app.services.completeness_service import CompletenessService
from backend.app.services.groq_service import GroqService
from backend.app.services.action_service import ActionService
from backend.app.utils.text_cleaner import compute_transcript_hash

router = APIRouter(prefix="/settings", tags=["Settings"])


class SettingsUpdate(BaseModel):
    groq_api_key: Optional[str] = None
    groq_model: Optional[str] = None
    confidence_threshold: Optional[float] = None


@router.get("")
def get_current_settings():
    return {
        "project_name": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "has_groq_key": bool(settings.GROQ_API_KEY and not settings.GROQ_API_KEY.startswith("your_")),
        "groq_model": settings.GROQ_MODEL,
        "confidence_threshold": settings.CONFIDENCE_THRESHOLD,
        "max_upload_size_mb": settings.MAX_UPLOAD_SIZE_MB,
        "completeness_weights": CompletenessService.WEIGHTS
    }


@router.post("")
def update_settings(payload: SettingsUpdate):
    if payload.groq_api_key is not None:
        settings.GROQ_API_KEY = payload.groq_api_key.strip()
    if payload.groq_model is not None:
        settings.GROQ_MODEL = payload.groq_model.strip()
    if payload.confidence_threshold is not None:
        settings.CONFIDENCE_THRESHOLD = float(payload.confidence_threshold)

    return {
        "success": True,
        "message": "Settings updated successfully.",
        "settings": {
            "has_groq_key": bool(settings.GROQ_API_KEY and not settings.GROQ_API_KEY.startswith("your_")),
            "groq_model": settings.GROQ_MODEL,
            "confidence_threshold": settings.CONFIDENCE_THRESHOLD
        }
    }


SAMPLE_CALLS = [
    {
        "external_call_id": "CALL-2024-101",
        "customer_name": "Acme Global Industries",
        "sales_rep_name": "Sarah Jenkins",
        "conversation_date": datetime.utcnow() - timedelta(days=1, hours=3),
        "duration_seconds": 1840,
        "conversation_type": "Video Demo",
        "transcript_status": "completed",
        "transcript": """
Sarah (Sales Rep): Hi Mark, thanks for joining our platform architecture demo today. How is the team evaluating modern sales intelligence tools?
Mark (VP Sales, Acme): Good to connect Sarah. We have 85 account executives and we're struggling with call follow-ups slipping through the cracks. We need automated meeting summaries, multi-label tagging, and direct sync with Salesforce.
Sarah: Understood. Let me share my screen and show you our self-correcting review center and completeness scoring engine.
Mark: That look clean. How does the AI handle pricing objections or multi-threading?
Sarah: It extracts specific objections and maps them to follow-up tasks. Speaking of which, our Enterprise tier includes custom LLM fine-tuning and SOC2 compliance.
Mark: Great. Can you send over a formal proposal with pricing for 100 seats, plus a security pack for our IT team? We want to decide by end of next week.
Sarah: Absolutely Mark. I will email the enterprise quote and security overview by Thursday morning. Let's schedule a follow-up for next Tuesday at 2 PM.
Mark: Sounds like a plan. Thanks Sarah!
        """.strip(),
        "follow_up_status": "Pending",
        "purposes": ["Product Demo", "Pricing", "Sales"]
    },
    {
        "external_call_id": "CALL-2024-102",
        "customer_name": "FinTech Matrix",
        "sales_rep_name": "Michael Chang",
        "conversation_date": datetime.utcnow() - timedelta(days=2, hours=5),
        "duration_seconds": 1220,
        "conversation_type": "Call",
        "transcript_status": "completed",
        "transcript": """
Michael: Hello David, checking in on the contract agreement we sent last Friday.
David (FinTech Matrix): Hey Michael. Our legal team reviewed the contract terms. We have two main concerns: first, the annual payment upfront is tough for our current budget cycle. We'd prefer quarterly invoicing. Second, we need a 15% discount on the seat license if we commit to a 2-year deal.
Michael: I can definitely discuss quarterly terms with our finance VP. Regarding the 15% discount for a 2-year commitment, we can typically accommodate that for strategic accounts.
David: If you can get that approved and send an updated agreement by tomorrow, I can get executive sign-off before Friday.
Michael: Excellent. I'll get the revised terms approved and send the updated contract to your inbox today.
        """.strip(),
        "follow_up_status": "Pending",
        "purposes": ["Negotiation", "Pricing"]
    },
    {
        "external_call_id": "CALL-2024-103",
        "customer_name": "HealthPulse Bio",
        "sales_rep_name": "Elena Rostova",
        "conversation_date": datetime.utcnow() - timedelta(days=3, hours=1),
        "duration_seconds": 2100,
        "conversation_type": "Meeting",
        "transcript_status": "completed",
        "transcript": """
Elena: Good afternoon Rachel. How has your experience been with our API integration over the past 9 months?
Rachel (CTO, HealthPulse): Hi Elena. Overall the intelligence extraction is solid. However, our annual contract is up for renewal in 60 days, and our clinical team is asking if we can expand seat licenses to 50 more users.
Elena: Wonderful! We have an enterprise expansion package that discounts additional seat blocks by 20% for renewal commitments.
Rachel: That sounds appealing. We also experienced some latency with webhook delivery last month. We need an SLA guarantee before expanding.
Elena: I'll loop in our technical solutions architect to provide our Tier-1 SLA addendum and resolve any webhook concerns.
Rachel: Perfect, send that over with the renewal quote.
        """.strip(),
        "follow_up_status": "Pending",
        "purposes": ["Renewal", "Customer Support", "Pricing"]
    },
    {
        "external_call_id": "CALL-2024-104",
        "customer_name": "Nexus Retail Corp",
        "sales_rep_name": "Sarah Jenkins",
        "conversation_date": datetime.utcnow() - timedelta(days=4, hours=2),
        "duration_seconds": 950,
        "conversation_type": "Call",
        "transcript_status": "pending",
        "transcript": None,  # Late transcript pending demonstration!
        "follow_up_status": "None",
        "purposes": []
    },
    {
        "external_call_id": "CALL-2024-105",
        "customer_name": "Starlight Logistics",
        "sales_rep_name": "David Vance",
        "conversation_date": datetime.utcnow() - timedelta(days=5, hours=6),
        "duration_seconds": 880,
        "conversation_type": "Call",
        "transcript_status": "pending",
        "transcript": None,  # Another late transcript pending!
        "follow_up_status": "None",
        "purposes": []
    },
    {
        "external_call_id": "CALL-2024-106",
        "customer_name": "CyberShield Systems",
        "sales_rep_name": "Michael Chang",
        "conversation_date": datetime.utcnow() - timedelta(days=6, hours=4),
        "duration_seconds": 1560,
        "conversation_type": "Video Demo",
        "transcript_status": "completed",
        "transcript": """
Michael: Thanks for your time Arthur. What is your team's biggest objection to replacing your legacy CRM logging?
Arthur (Security Director): Frankly Michael, our biggest hurdle is data sovereignty and compliance. If our sales call audio or transcripts leave our private VPC or get stored without encryption, our InfoSec board will kill the deal immediately.
Michael: That is a very valid concern. SalesPulse AI is architected for zero-data retention on LLM prompts and provides dedicated enterprise private tenant deployments.
Arthur: Can you provide documentation on your zero-retention policy and third-party penetration test results?
Michael: Yes, I will share our SOC2 Type II report and privacy whitepaper right after this call.
Arthur: If that passes our Infosec review, we will schedule a proof-of-concept.
        """.strip(),
        "follow_up_status": "Overdue",
        "purposes": ["Objection Handling", "Sales"]
    },
    {
        "external_call_id": "CALL-2024-107",
        "customer_name": "OmniStream Media",
        "sales_rep_name": "Elena Rostova",
        "conversation_date": datetime.utcnow() - timedelta(days=7, hours=2),
        "duration_seconds": 1400,
        "conversation_type": "Meeting",
        "transcript_status": "completed",
        "transcript": """
Elena: Hello Liam, thanks for meeting. We noticed some tickets regarding your Zapier export connection.
Liam (Operations, OmniStream): Hi Elena. Yes, our webhooks timed out twice last Tuesday. We need to know if this is resolved before we commit to another quarter.
Elena: Our engineering team pushed a patch on Wednesday morning with exponential backoff and 99.99% queue uptime.
Liam: Excellent to hear. We also want to explore the new automated completeness scoring feature for our coaching calls. Can you walk us through it?
Elena: Let's do a quick live walkthrough right now.
        """.strip(),
        "follow_up_status": "Completed",
        "purposes": ["Customer Support", "Product Demo"]
    }
]


@router.post("/seed-sample-data")
def seed_sample_data(db: Session = Depends(get_db)):
    """Populate database with rich demonstration conversations, diff scenarios, and late transcripts."""
    # Ensure default purposes exist
    default_purposes = [
        ("Sales", "General sales discovery and exploration", "indigo"),
        ("Product Demo", "Technical product demonstration and walkthrough", "cyan"),
        ("Pricing", "Discussion regarding license tiers, costs, and budgets", "emerald"),
        ("Negotiation", "Contract terms, discounts, and custom commercial clauses", "amber"),
        ("Customer Support", "Technical questions, bug reports, and assistance", "rose"),
        ("Objection Handling", "Overcoming security, pricing, or competitor objections", "purple"),
        ("Follow-up", "Scheduled check-ins and next step coordination", "blue"),
        ("Renewal", "Subscription extensions and contract renewals", "teal"),
    ]
    for p_name, p_desc, p_color in default_purposes:
        existing_p = db.query(Purpose).filter(Purpose.name == p_name).first()
        if not existing_p:
            db.add(Purpose(name=p_name, description=p_desc, color=p_color))
    db.commit()

    created_count = 0
    for call_data in SAMPLE_CALLS:
        call_id = call_data["external_call_id"]
        existing = db.query(Conversation).filter(Conversation.external_call_id == call_id).first()
        if existing:
            continue

        transcript_text = call_data["transcript"]
        t_status = call_data["transcript_status"]
        t_hash = compute_transcript_hash(transcript_text)

        conv = Conversation(
            external_call_id=call_id,
            customer_name=call_data["customer_name"],
            sales_rep_name=call_data["sales_rep_name"],
            conversation_date=call_data["conversation_date"],
            duration_seconds=call_data["duration_seconds"],
            conversation_type=call_data["conversation_type"],
            transcript=transcript_text,
            transcript_status=t_status,
            transcript_hash=t_hash,
            follow_up_status=call_data["follow_up_status"],
            completeness_score=0.0
        )
        db.add(conv)
        db.flush()

        # If transcript is present, run AI analysis
        if transcript_text:
            ai_out = GroqService.analyze_transcript(
                transcript=transcript_text,
                customer_name=conv.customer_name,
                sales_rep_name=conv.sales_rep_name
            )
            conv.ai_summary = ai_out.summary
            conv.customer_requirements = ai_out.customer_requirements
            conv.objections = ai_out.objections
            conv.action_items = ai_out.action_items
            conv.recommended_next_steps = ai_out.recommended_next_steps
            conv.confidence_score = ai_out.confidence
            conv.ai_review_status = "needs_review" if ai_out.needs_review else "approved"

            for pred in ai_out.predicted_purposes:
                assoc = ConversationPurpose(
                    conversation_id=conv.id,
                    purpose_name=pred.purpose,
                    source="ai_predicted",
                    confidence=pred.confidence,
                    evidence_snippet=pred.evidence,
                    is_active=True
                )
                db.add(assoc)

            # Store AI Analysis record
            db.add(AIAnalysis(
                conversation_id=conv.id,
                summary=ai_out.summary,
                predicted_purposes=[p.model_dump() for p in ai_out.predicted_purposes],
                customer_requirements=ai_out.customer_requirements,
                objections=ai_out.objections,
                action_items=ai_out.action_items,
                recommended_next_steps=ai_out.recommended_next_steps,
                confidence=ai_out.confidence,
                needs_review=ai_out.needs_review,
                review_reason=ai_out.review_reason
            ))

        # Calculate completeness
        db.flush()
        active_purposes_count = len([p for p in conv.purpose_associations if p.is_active])
        score, missing, _ = CompletenessService.calculate_score(conv, active_purposes_count)
        conv.completeness_score = score
        conv.missing_fields = missing

        # Audit event
        db.add(AuditEvent(
            conversation_id=conv.id,
            external_call_id=conv.external_call_id,
            event_type="conversation_created",
            actor="System Seed",
            details=f"Conversation record initialized. Completeness: {score}%."
        ))

        # Generate action recommendations
        ActionService.sync_recommendations_for_conversation(conv, db)
        created_count += 1

    # Record sample import job
    if created_count > 0:
        db.add(ImportJob(
            filename="enterprise_sales_q4_batch.csv",
            file_type="csv",
            file_size_bytes=14200,
            status="committed",
            total_rows=created_count,
            new_rows=created_count,
            updated_rows=0,
            unchanged_rows=0,
            duplicate_rows=0,
            conflicting_rows=0,
            invalid_rows=0,
            committed_at=datetime.utcnow()
        ))

    db.commit()
    return {
        "success": True,
        "message": f"Successfully seeded {created_count} demonstration sales conversations."
    }
