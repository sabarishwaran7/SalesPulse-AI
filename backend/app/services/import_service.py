import io
import json
from datetime import datetime
from typing import List, Dict, Any, Tuple, Optional
import pandas as pd
from sqlalchemy.orm import Session

from backend.app.models import (
    Conversation, ImportJob, ImportRowError, AuditEvent,
    Customer, SalesRepresentative, ConversationPurpose
)
from backend.app.schemas import (
    FieldDiff, RecordDiff, ImportDiffPreview, ImportCommitResponse
)
from backend.app.utils.date_parser import parse_date
from backend.app.utils.text_cleaner import clean_string, compute_transcript_hash
from backend.app.utils.diff_engine import compare_records
from backend.app.services.completeness_service import CompletenessService


COLUMN_MAPPINGS = {
    # external_call_id
    "call_id": "external_call_id",
    "call id": "external_call_id",
    "external_call_id": "external_call_id",
    "external id": "external_call_id",
    "meeting_id": "external_call_id",
    "id": "external_call_id",
    # customer_name
    "customer": "customer_name",
    "customer_name": "customer_name",
    "client": "customer_name",
    "account": "customer_name",
    "prospect": "customer_name",
    # sales_rep_name
    "sales_rep": "sales_rep_name",
    "sales_rep_name": "sales_rep_name",
    "rep": "sales_rep_name",
    "representative": "sales_rep_name",
    "agent": "sales_rep_name",
    # conversation_date
    "conversation_date": "conversation_date",
    "date": "conversation_date",
    "call_date": "conversation_date",
    "meeting_date": "conversation_date",
    "timestamp": "conversation_date",
    # duration_seconds
    "duration": "duration_seconds",
    "duration_seconds": "duration_seconds",
    "call_duration": "duration_seconds",
    "length": "duration_seconds",
    # conversation_type
    "conversation_type": "conversation_type",
    "type": "conversation_type",
    "call_type": "conversation_type",
    # transcript
    "transcript": "transcript",
    "call_transcript": "transcript",
    "notes": "transcript",
    "conversation_text": "transcript",
    # follow_up_status
    "follow_up_status": "follow_up_status",
    "follow_up": "follow_up_status",
    "followup": "follow_up_status",
    "followup_status": "follow_up_status",
    "status": "follow_up_status",
}


class ImportService:

    @staticmethod
    def normalize_column_name(col: str) -> str:
        cleaned = col.strip().lower().replace("-", "_")
        return COLUMN_MAPPINGS.get(cleaned, cleaned)

    @classmethod
    def parse_file(cls, file_bytes: bytes, filename: str) -> pd.DataFrame:
        """Parse CSV or Excel file bytes into a normalized pandas DataFrame."""
        if filename.endswith(".csv"):
            try:
                df = pd.read_csv(io.BytesIO(file_bytes), encoding="utf-8")
            except UnicodeDecodeError:
                df = pd.read_csv(io.BytesIO(file_bytes), encoding="latin1")
        elif filename.endswith((".xlsx", ".xls")):
            df = pd.read_excel(io.BytesIO(file_bytes))
        else:
            raise ValueError("Unsupported file format. Please upload a .csv or .xlsx file.")

        # Normalize column headers
        df.rename(columns=lambda c: cls.normalize_column_name(str(c)), inplace=True)
        return df

    @classmethod
    def generate_diff_preview(
        cls,
        df: pd.DataFrame,
        filename: str,
        file_size_bytes: int,
        db: Session
    ) -> ImportDiffPreview:
        """Analyze incoming data against PostgreSQL database and generate preview diff."""
        file_type = "xlsx" if filename.endswith((".xlsx", ".xls")) else "csv"
        total_rows = len(df)

        seen_call_ids_in_file = set()
        record_diffs: List[RecordDiff] = []
        errors_to_log: List[Dict[str, Any]] = []

        new_count = 0
        updated_count = 0
        unchanged_count = 0
        duplicate_count = 0
        conflict_count = 0
        invalid_count = 0

        # Query all existing records for matching
        all_existing = {
            c.external_call_id: c
            for c in db.query(Conversation).all()
        }

        for idx, row in df.iterrows():
            row_num = idx + 1
            raw_call_id = clean_string(row.get("external_call_id"))
            customer_name = clean_string(row.get("customer_name"))
            sales_rep_name = clean_string(row.get("sales_rep_name"))
            date_val = parse_date(row.get("conversation_date"))
            duration_val = row.get("duration_seconds", 0)
            transcript_val = clean_string(row.get("transcript"))
            conv_type = clean_string(row.get("conversation_type")) or "Call"
            follow_up = clean_string(row.get("follow_up_status")) or "None"

            # Construct normalized incoming data dict
            incoming_dict = {
                "external_call_id": raw_call_id,
                "customer_name": customer_name,
                "sales_rep_name": sales_rep_name,
                "conversation_date": date_val.isoformat() if date_val else None,
                "duration_seconds": int(duration_val) if pd.notna(duration_val) else 0,
                "conversation_type": conv_type,
                "transcript": transcript_val,
                "follow_up_status": follow_up
            }

            validation_errors = []
            if not raw_call_id:
                validation_errors.append("Missing Call ID (external_call_id)")
            if not customer_name:
                validation_errors.append("Missing Customer Name")
            if not sales_rep_name:
                validation_errors.append("Missing Sales Representative")
            if not date_val:
                validation_errors.append("Missing or Invalid Conversation Date")

            if validation_errors:
                invalid_count += 1
                rec_diff = RecordDiff(
                    row_number=row_num,
                    external_call_id=raw_call_id or f"UNKNOWN-ROW-{row_num}",
                    status="invalid",
                    validation_errors=validation_errors,
                    incoming_data=incoming_dict
                )
                record_diffs.append(rec_diff)
                errors_to_log.append({
                    "row_number": row_num,
                    "external_call_id": raw_call_id,
                    "error_type": "invalid_fields",
                    "message": "; ".join(validation_errors),
                    "raw_data": incoming_dict
                })
                continue

            # Check duplicate within the uploaded file
            if raw_call_id in seen_call_ids_in_file:
                duplicate_count += 1
                rec_diff = RecordDiff(
                    row_number=row_num,
                    external_call_id=raw_call_id,
                    status="duplicate",
                    validation_errors=["Duplicate Call ID within the uploaded file"],
                    incoming_data=incoming_dict
                )
                record_diffs.append(rec_diff)
                errors_to_log.append({
                    "row_number": row_num,
                    "external_call_id": raw_call_id,
                    "error_type": "duplicate_in_file",
                    "message": f"Row {row_num} has duplicate Call ID '{raw_call_id}' already seen earlier in file.",
                    "raw_data": incoming_dict
                })
                continue

            seen_call_ids_in_file.add(raw_call_id)

            # Compare against existing DB record
            existing_record = all_existing.get(raw_call_id)
            if not existing_record:
                new_count += 1
                record_diffs.append(RecordDiff(
                    row_number=row_num,
                    external_call_id=raw_call_id,
                    status="new",
                    incoming_data=incoming_dict
                ))
            else:
                field_diffs, is_conflict, conflict_reason = compare_records(incoming_dict, existing_record)
                existing_summary = {
                    "customer_name": existing_record.customer_name,
                    "sales_rep_name": existing_record.sales_rep_name,
                    "conversation_date": existing_record.conversation_date.isoformat() if existing_record.conversation_date else None,
                    "duration_seconds": existing_record.duration_seconds,
                    "conversation_type": existing_record.conversation_type,
                    "has_transcript": bool(existing_record.transcript),
                    "follow_up_status": existing_record.follow_up_status
                }

                if is_conflict:
                    conflict_count += 1
                    record_diffs.append(RecordDiff(
                        row_number=row_num,
                        external_call_id=raw_call_id,
                        status="conflict",
                        fields_changed=field_diffs,
                        conflict_reason=conflict_reason,
                        incoming_data=incoming_dict,
                        existing_data=existing_summary
                    ))
                    errors_to_log.append({
                        "row_number": row_num,
                        "external_call_id": raw_call_id,
                        "error_type": "conflict",
                        "message": conflict_reason or "Conflicting record changes detected",
                        "raw_data": incoming_dict
                    })
                elif field_diffs:
                    updated_count += 1
                    record_diffs.append(RecordDiff(
                        row_number=row_num,
                        external_call_id=raw_call_id,
                        status="updated",
                        fields_changed=field_diffs,
                        incoming_data=incoming_dict,
                        existing_data=existing_summary
                    ))
                else:
                    unchanged_count += 1
                    record_diffs.append(RecordDiff(
                        row_number=row_num,
                        external_call_id=raw_call_id,
                        status="unchanged",
                        incoming_data=incoming_dict,
                        existing_data=existing_summary
                    ))

        # Store ImportJob record
        serialized_records = [r.model_dump() for r in record_diffs]
        import_job = ImportJob(
            filename=filename,
            file_type=file_type,
            file_size_bytes=file_size_bytes,
            status="previewed",
            total_rows=total_rows,
            new_rows=new_count,
            updated_rows=updated_count,
            unchanged_rows=unchanged_count,
            duplicate_rows=duplicate_count,
            conflicting_rows=conflict_count,
            invalid_rows=invalid_count,
            diff_summary={"records": serialized_records}
        )
        db.add(import_job)
        db.flush()

        for err in errors_to_log:
            row_err = ImportRowError(
                import_job_id=import_job.id,
                row_number=err["row_number"],
                external_call_id=err.get("external_call_id"),
                error_type=err["error_type"],
                message=err["message"],
                raw_data=err.get("raw_data")
            )
            db.add(row_err)

        db.commit()
        db.refresh(import_job)

        summary_msg = (
            f"{new_count} new conversations, {updated_count} existing updated, "
            f"{unchanged_count} unchanged, {duplicate_count} duplicates in file, "
            f"{conflict_count} conflicts requiring review, {invalid_count} invalid."
        )

        return ImportDiffPreview(
            job_id=import_job.id,
            filename=filename,
            file_type=file_type,
            file_size_bytes=file_size_bytes,
            total_rows=total_rows,
            new_count=new_count,
            updated_count=updated_count,
            unchanged_count=unchanged_count,
            duplicate_count=duplicate_count,
            conflict_count=conflict_count,
            invalid_count=invalid_count,
            records=record_diffs,
            summary_message=summary_msg
        )

    @classmethod
    def commit_import(
        cls,
        job_id: int,
        action: str,
        conflict_resolutions: Dict[str, str],
        db: Session
    ) -> ImportCommitResponse:
        """Commit or cancel proposed import changes within a database transaction."""
        job = db.query(ImportJob).filter(ImportJob.id == job_id).first()
        if not job:
            raise ValueError(f"Import job {job_id} not found.")

        if job.status == "committed":
            return ImportCommitResponse(
                job_id=job.id,
                status="committed",
                message="This import job was already committed.",
                created_count=job.new_rows,
                updated_count=job.updated_rows,
                unchanged_count=job.unchanged_rows,
                skipped_count=job.duplicate_rows + job.invalid_rows,
                timestamp=job.committed_at or datetime.utcnow()
            )

        if action == "cancel":
            job.status = "cancelled"
            db.commit()
            return ImportCommitResponse(
                job_id=job.id,
                status="cancelled",
                message="Import cancelled by user. No database records were modified.",
                created_count=0,
                updated_count=0,
                unchanged_count=0,
                skipped_count=job.total_rows,
                timestamp=datetime.utcnow()
            )

        # Action == "commit"
        diff_summary = job.diff_summary or {}
        records = diff_summary.get("records", [])

        created_count = 0
        updated_count = 0
        unchanged_count = 0
        skipped_count = 0

        # Preload existing conversations
        existing_map = {
            c.external_call_id: c
            for c in db.query(Conversation).all()
        }

        for item in records:
            status = item.get("status")
            inc = item.get("incoming_data", {})
            call_id = item.get("external_call_id")

            if status in ("invalid", "duplicate"):
                skipped_count += 1
                continue

            if status == "unchanged":
                unchanged_count += 1
                continue

            if status == "conflict":
                # Check user resolution
                res = conflict_resolutions.get(call_id, "skip")
                if res != "overwrite":
                    skipped_count += 1
                    continue
                # If resolved to overwrite, treat as update
                status = "updated"

            if status == "new":
                transcript_text = clean_string(inc.get("transcript"))
                transcript_hash = compute_transcript_hash(transcript_text)
                t_status = "completed" if transcript_text else "pending"

                new_conv = Conversation(
                    external_call_id=call_id,
                    customer_name=inc["customer_name"],
                    sales_rep_name=inc["sales_rep_name"],
                    conversation_date=parse_date(inc["conversation_date"]),
                    duration_seconds=int(inc.get("duration_seconds", 0)),
                    conversation_type=inc.get("conversation_type", "Call"),
                    transcript=transcript_text,
                    transcript_status=t_status,
                    transcript_hash=transcript_hash,
                    follow_up_status=inc.get("follow_up_status", "None"),
                    completeness_score=0.0
                )
                db.add(new_conv)
                db.flush()

                # Calculate completeness
                score, missing, _ = CompletenessService.calculate_score(new_conv, 0)
                new_conv.completeness_score = score
                new_conv.missing_fields = missing

                # Audit Event
                audit = AuditEvent(
                    conversation_id=new_conv.id,
                    external_call_id=call_id,
                    event_type="conversation_created",
                    actor="Smart Import Pipeline",
                    details=f"Conversation imported from {job.filename}. Transcript status: {t_status}."
                )
                db.add(audit)
                created_count += 1

            elif status == "updated":
                conv = existing_map.get(call_id)
                if not conv:
                    continue

                before_state = {
                    "customer_name": conv.customer_name,
                    "sales_rep_name": conv.sales_rep_name,
                    "conversation_date": conv.conversation_date.isoformat() if conv.conversation_date else None,
                    "transcript_status": conv.transcript_status,
                    "follow_up_status": conv.follow_up_status
                }

                # Update customer/rep
                if inc.get("customer_name"):
                    conv.customer_name = inc["customer_name"]
                if inc.get("sales_rep_name"):
                    conv.sales_rep_name = inc["sales_rep_name"]
                if inc.get("conversation_date"):
                    conv.conversation_date = parse_date(inc["conversation_date"])
                if inc.get("duration_seconds"):
                    conv.duration_seconds = int(inc["duration_seconds"])
                if inc.get("conversation_type"):
                    conv.conversation_type = inc["conversation_type"]
                if inc.get("follow_up_status") and inc["follow_up_status"] != "None":
                    conv.follow_up_status = inc["follow_up_status"]

                # Transcript update (Rule: Never erase existing transcript with empty cell!)
                inc_transcript = clean_string(inc.get("transcript"))
                if inc_transcript:
                    new_hash = compute_transcript_hash(inc_transcript)
                    if new_hash != conv.transcript_hash:
                        conv.transcript = inc_transcript
                        conv.transcript_hash = new_hash
                        conv.transcript_status = "completed"
                        # Reset AI review status so new transcript triggers reanalysis
                        conv.ai_review_status = "unreviewed"

                        audit_t = AuditEvent(
                            conversation_id=conv.id,
                            external_call_id=call_id,
                            event_type="transcript_received" if not conv.transcript else "transcript_updated",
                            actor="Smart Import Pipeline",
                            details="Late or updated transcript received during import."
                        )
                        db.add(audit_t)

                # Re-calculate completeness score
                active_purposes_count = len([p for p in conv.purpose_associations if p.is_active])
                score, missing, _ = CompletenessService.calculate_score(conv, active_purposes_count)
                conv.completeness_score = score
                conv.missing_fields = missing

                after_state = {
                    "customer_name": conv.customer_name,
                    "sales_rep_name": conv.sales_rep_name,
                    "conversation_date": conv.conversation_date.isoformat() if conv.conversation_date else None,
                    "transcript_status": conv.transcript_status,
                    "follow_up_status": conv.follow_up_status
                }

                audit_up = AuditEvent(
                    conversation_id=conv.id,
                    external_call_id=call_id,
                    event_type="record_updated",
                    actor="Smart Import Pipeline",
                    before_state=before_state,
                    after_state=after_state,
                    details=f"Record updated from {job.filename}."
                )
                db.add(audit_up)
                updated_count += 1

        job.status = "committed"
        job.committed_at = datetime.utcnow()
        db.commit()

        return ImportCommitResponse(
            job_id=job.id,
            status="committed",
            message=f"Import committed successfully: {created_count} new, {updated_count} updated, {unchanged_count} unchanged, {skipped_count} skipped.",
            created_count=created_count,
            updated_count=updated_count,
            unchanged_count=unchanged_count,
            skipped_count=skipped_count,
            timestamp=job.committed_at
        )
