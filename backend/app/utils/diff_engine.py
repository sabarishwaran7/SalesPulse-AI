from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime
from backend.app.schemas import FieldDiff
from backend.app.utils.date_parser import parse_date
from backend.app.utils.text_cleaner import clean_string, compute_transcript_hash


def compare_records(
    incoming: Dict[str, Any],
    existing: Any
) -> Tuple[List[FieldDiff], bool, Optional[str]]:
    """
    Compare an incoming dictionary against an existing Conversation DB record.
    Returns: (list_of_field_diffs, is_conflict, conflict_reason)
    """
    diffs: List[FieldDiff] = []
    is_conflict = False
    conflict_reason = None

    # 1. Customer Name
    inc_cust = clean_string(incoming.get("customer_name"))
    if inc_cust and inc_cust.lower() != (existing.customer_name or "").strip().lower():
        diffs.append(FieldDiff(
            field_name="customer_name",
            old_value=existing.customer_name,
            new_value=inc_cust
        ))

    # 2. Sales Rep Name
    inc_rep = clean_string(incoming.get("sales_rep_name"))
    if inc_rep and inc_rep.lower() != (existing.sales_rep_name or "").strip().lower():
        diffs.append(FieldDiff(
            field_name="sales_rep_name",
            old_value=existing.sales_rep_name,
            new_value=inc_rep
        ))

    # 3. Conversation Date
    inc_date = parse_date(incoming.get("conversation_date"))
    if inc_date and existing.conversation_date:
        # Compare dates disregarding microsecond discrepancies
        date_diff_seconds = abs((inc_date - existing.conversation_date).total_seconds())
        if date_diff_seconds > 60:
            diffs.append(FieldDiff(
                field_name="conversation_date",
                old_value=existing.conversation_date.isoformat(),
                new_value=inc_date.isoformat()
            ))
            # If dates differ by more than 7 days, flag as potential conflict
            if date_diff_seconds > (7 * 86400):
                is_conflict = True
                conflict_reason = f"Date difference > 7 days ({existing.conversation_date.date()} vs {inc_date.date()})"

    # 4. Duration
    try:
        inc_dur = int(incoming.get("duration_seconds", 0) or 0)
        if inc_dur > 0 and inc_dur != existing.duration_seconds:
            diffs.append(FieldDiff(
                field_name="duration_seconds",
                old_value=existing.duration_seconds,
                new_value=inc_dur
            ))
    except (ValueError, TypeError):
        pass

    # 5. Conversation Type
    inc_type = clean_string(incoming.get("conversation_type"))
    if inc_type and inc_type.lower() != (existing.conversation_type or "").lower():
        diffs.append(FieldDiff(
            field_name="conversation_type",
            old_value=existing.conversation_type,
            new_value=inc_type
        ))

    # 6. Follow-up Status
    inc_fu = clean_string(incoming.get("follow_up_status"))
    if inc_fu and inc_fu.lower() != (existing.follow_up_status or "").lower():
        diffs.append(FieldDiff(
            field_name="follow_up_status",
            old_value=existing.follow_up_status,
            new_value=inc_fu
        ))

    # 7. Transcript comparison:
    # RULE: Existing valid transcripts must NOT be erased by empty incoming cells!
    inc_transcript = clean_string(incoming.get("transcript"))
    if inc_transcript:
        inc_hash = compute_transcript_hash(inc_transcript)
        existing_hash = existing.transcript_hash or compute_transcript_hash(existing.transcript)
        if inc_hash != existing_hash:
            diffs.append(FieldDiff(
                field_name="transcript",
                old_value=(existing.transcript[:80] + "...") if existing.transcript else None,
                new_value=(inc_transcript[:80] + "...")
            ))
            # If existing transcript was long and new transcript is substantially shorter, flag conflict
            if existing.transcript and len(inc_transcript) < (len(existing.transcript) * 0.5):
                is_conflict = True
                conflict_reason = "Incoming transcript is significantly shorter than existing stored transcript."

    # If the record has been manually corrected by a sales manager, flag conflict before automated overwrite
    if existing.is_manually_corrected and diffs:
        is_conflict = True
        conflict_reason = "Record has manual corrections that would be modified."

    return diffs, is_conflict, conflict_reason
