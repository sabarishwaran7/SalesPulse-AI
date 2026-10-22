from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, Query, HTTPException, Response
from sqlalchemy.orm import Session
from sqlalchemy import desc

from backend.app.core.database import get_db
from backend.app.models import Conversation, ConversationPurpose, ActionRecommendation, ImportJob
from backend.app.services.export_service import ExportService

router = APIRouter(prefix="/reports", tags=["Reports & Exports"])


@router.get("/export")
def export_report(
    report_type: str = Query(..., description="all_conversations, incomplete_conversations, pending_transcripts, ai_review_queue, follow_up_actions, import_history"),
    format: str = Query("csv", description="'csv' or 'xlsx'"),
    sales_rep: Optional[str] = Query(None),
    purpose: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    data: List[Dict[str, Any]] = []
    sheet_name = "Report"

    if report_type in ("all_conversations", "filtered_conversations"):
        sheet_name = "Conversations"
        q = db.query(Conversation)
        if sales_rep and sales_rep != "all":
            q = q.filter(Conversation.sales_rep_name == sales_rep)
        if purpose and purpose != "all":
            q = q.join(Conversation.purpose_associations).filter(
                ConversationPurpose.purpose_name == purpose,
                ConversationPurpose.is_active == True
            )
        convs = q.order_by(desc(Conversation.conversation_date)).all()
        for c in convs:
            data.append({
                "Call ID": c.external_call_id,
                "Customer Name": c.customer_name,
                "Sales Rep": c.sales_rep_name,
                "Date": c.conversation_date.strftime("%Y-%m-%d %H:%M") if c.conversation_date else "N/A",
                "Duration (s)": c.duration_seconds,
                "Type": c.conversation_type,
                "Transcript Status": c.transcript_status,
                "Completeness (%)": c.completeness_score,
                "AI Review Status": c.ai_review_status,
                "Confidence Score": c.confidence_score,
                "Purposes": ", ".join(c.active_purposes),
                "Follow-up Status": c.follow_up_status,
                "AI Summary": c.ai_summary or "N/A"
            })

    elif report_type == "incomplete_conversations":
        sheet_name = "Incomplete Conversations"
        convs = db.query(Conversation).filter(Conversation.completeness_score < 80.0).all()
        for c in convs:
            data.append({
                "Call ID": c.external_call_id,
                "Customer Name": c.customer_name,
                "Sales Rep": c.sales_rep_name,
                "Completeness (%)": c.completeness_score,
                "Missing Fields": ", ".join(c.missing_fields or []),
                "Transcript Status": c.transcript_status,
                "Follow-up Status": c.follow_up_status
            })

    elif report_type == "pending_transcripts":
        sheet_name = "Pending Transcripts"
        convs = db.query(Conversation).filter(
            (Conversation.transcript_status == "pending") | (Conversation.transcript == None)
        ).all()
        for c in convs:
            data.append({
                "Call ID": c.external_call_id,
                "Customer Name": c.customer_name,
                "Sales Rep": c.sales_rep_name,
                "Date": c.conversation_date.strftime("%Y-%m-%d") if c.conversation_date else "N/A",
                "Status": c.transcript_status,
                "Completeness (%)": c.completeness_score
            })

    elif report_type == "ai_review_queue":
        sheet_name = "AI Review Queue"
        convs = db.query(Conversation).filter(
            (Conversation.ai_review_status == "needs_review") |
            (Conversation.confidence_score < 0.75)
        ).all()
        for c in convs:
            data.append({
                "Call ID": c.external_call_id,
                "Customer Name": c.customer_name,
                "Sales Rep": c.sales_rep_name,
                "Confidence Score": c.confidence_score,
                "Review Status": c.ai_review_status,
                "Predicted Purposes": ", ".join(c.active_purposes),
                "Summary": c.ai_summary or "N/A"
            })

    elif report_type == "follow_up_actions":
        sheet_name = "Follow-up Actions"
        actions = db.query(ActionRecommendation).join(Conversation).all()
        for a in actions:
            data.append({
                "Action ID": a.id,
                "Call ID": a.conversation.external_call_id if a.conversation else "N/A",
                "Customer Name": a.conversation.customer_name if a.conversation else "N/A",
                "Title": a.title,
                "Priority": a.priority,
                "Status": a.status,
                "Reason": a.reason,
                "Suggested Action": a.suggested_action
            })

    elif report_type == "import_history":
        sheet_name = "Import History"
        jobs = db.query(ImportJob).order_by(desc(ImportJob.created_at)).all()
        for j in jobs:
            data.append({
                "Job ID": j.id,
                "Filename": j.filename,
                "File Type": j.file_type,
                "Status": j.status,
                "Total Rows": j.total_rows,
                "New Rows": j.new_rows,
                "Updated Rows": j.updated_rows,
                "Unchanged Rows": j.unchanged_rows,
                "Duplicate Rows": j.duplicate_rows,
                "Conflicting Rows": j.conflicting_rows,
                "Invalid Rows": j.invalid_rows,
                "Imported At": j.committed_at.strftime("%Y-%m-%d %H:%M") if j.committed_at else "Not committed"
            })
    else:
        raise HTTPException(status_code=400, detail=f"Invalid report_type: {report_type}")

    filename_base = f"salespulse_{report_type}"
    if format.lower() == "xlsx":
        content = ExportService.generate_excel(data, sheet_name=sheet_name)
        return Response(
            content=content,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={filename_base}.xlsx"}
        )
    else:
        content = ExportService.generate_csv(data)
        return Response(
            content=content,
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename_base}.csv"}
        )
