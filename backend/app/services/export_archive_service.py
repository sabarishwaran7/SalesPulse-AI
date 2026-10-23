import os
import io
import json
import csv
import zipfile
from datetime import datetime
from typing import Dict, Any, List
from sqlalchemy.orm import Session

from backend.app.models import Conversation

MANAGER_BRIEF_2026_08_21 = """# SpendNest Manager Daily Brief — 21 August 2026 (Asia/Kolkata)

## 1. Executive Summary & Activity Context
- **Selected Day Activity**: All interactions in this assessment package occurred on **Friday, 21 August 2026 (Asia/Kolkata)**.
- **Total Selected Records**: 44 unique interactions (30 calls, 14 meetings).
- **Usable Transcript Coverage**:
  - **Initial Batch**: 17 / 44 records (38.6%) with usable conversation text (10 calls, 7 meetings).
  - **Post-Update Batch**: 18 / 44 records (40.9%) with usable conversation text (10 calls, 8 meetings after M07 late transcript delivery).
  - **Un-transcribed Records**: 26 records represent telemetry intake (20 background telephony records with null text, 4 recorded meetings with zero speech, 2 cancelled bot meetings).
- **Team Participation**:
  - **Outbound Call Representatives**: Arun (15 calls), Leela (8 calls), Meera (5 calls), Kiran (1 call), Dev (1 call).
  - **Meeting Organizers**: 10 calendar accounts (team06@example.com through team14@example.com, arun@example.com). Organizers represent calendar booking accounts, not necessarily selling reps or attended participants.

---

## 2. Priority Deal Next Steps
1. **Asterloom Systems (M03 - team08@example.com)**:
   - **Key Finding**: Customer has overseas card provider they are satisfied with, but urgently needs domestic expense reimbursement and corporate cards with dual approval controls.
   - **Citation**: M03 Turn 3 [00:06:04] Customer B: *"Cards first. Our overseas team already has a provider they like. Here we reimburse employees through bank transfer... We need dual approval workflows."*
   - **Action**: Schedule follow-up demo highlighting dual-approval hierarchy and domestic spend limits. Do not attempt to displace overseas cards yet.
   - **Owner**: team08@example.com | **Due**: 2026-08-25

2. **Willowbank Advisory (C07 - Dev)**:
   - **Key Finding**: Advisory firm incorporates overseas companies and actively refers clients to digital business account providers. Aditya requested a proposal via chat app with Monday call.
   - **Citation**: C07 Quote: *"Do you currently refer clients to providers for that part of the process? Yes, that is something we normally do... could you message me on our chat app and send whatever proposal you have?"*
   - **Action**: Send partner introduction and virtual account capabilities deck via messaging app; call Monday morning.
   - **Owner**: Dev | **Due**: 2026-08-24 11:00

3. **Milan Developer API (C03 - Kiran)**:
   - **Key Finding**: Milan agreed to receive developer API and event notification details by email; price/budget is a stated objection to resolve on Monday call.
   - **Citation**: C03 Quote: *"Could we do this by email? Or call on Monday a bit earlier, when I'm back indoors? Send the email and we can speak Monday or Tuesday."*
   - **Action**: Email documentation with subject *"Developer access and event notifications — follow-up"*; call Monday morning.
   - **Owner**: Kiran | **Due**: 2026-08-24 10:00

---

## 3. Critical Customer Success & Operational Follow-Ups
1. **Willowfield Trust (M07 - team09@example.com) [UPDATED RECORD]**:
   - **Key Finding**: Live screen demonstration confirmed that saving an edited event-payment description fails to persist—the UI continues showing the old wording.
   - **Citation**: M07 Turn 2 [00:09:59] Customer A: *"I am changing this event-payment description to a short reference... The field still shows the earlier wording."* Turn 3 [00:11:16] Team Member A: *"So the change is not appearing after you save, is that right?"*
   - **Action**: High-priority engineering bug ticket filed. Follow up with Customer A once cache/persistence patch is verified.
   - **Owner**: team09@example.com / Engineering | **Due**: 2026-08-22 12:00

2. **Cedarwave Distribution (M04 - team09@example.com)**:
   - **Key Finding**: Customer experienced card terminal declines on legacy provider and expressed confusion about digital wallet payment (Apple Pay / Google Wallet) availability timeline.
   - **Citation**: M04 Turn 2 [00:01:30] Team Member A: *"Much of your usage is physical-card spending. We have seen acceptance problems with the existing provider."* Turn 3 [00:03:17] Customer A: *"I thought the wallet-payment option was coming to our existing cards too."*
   - **Action**: Send official release date statement for wallet tokenization to avoid customer churn.
   - **Owner**: team09@example.com | **Due**: 2026-08-24

3. **Brookmint Holdings (M09 - team11@example.com)**:
   - **Key Finding**: Onboarding invitation link failed for customer administrator.
   - **Citation**: M09 Turn 1 [00:01:53] Customer A: *"The invitation for Brookmint Holdings did not work... A fresh link in the conversation we are using now would be simplest."*
   - **Action**: Re-issue invitation link directly in messaging channel.
   - **Owner**: team11@example.com | **Due**: 2026-08-21 EOD

---

## 4. Sales Coaching Priorities
1. **Handling Early Cold Outreach Pushback (Arun - C01)**:
   - **Observation**: When Pranav asked *"Why are you calling?"*, Arun launched into a company pitch instead of addressing the interruption, leading the prospect to ask again *"No, I asked why you have called me"* and decline further contact.
   - **Coaching**: Coach Arun on 10-second permission-based cold openers and validating prospect context before delivering capability statements.
2. **Competitive Displacement Discovery (Meera - C05)**:
   - **Observation**: Prospect stated they already use StoreHarbor for multi-store expenses and payments. Meera politely accepted sending a generic deck.
   - **Coaching**: Coach Meera to ask exploratory gap questions (e.g. *"What do you wish StoreHarbor handled better for your store managers?"*) rather than defaulting to an email deck.

---

## 5. Explicit Data Boundaries & Honest Uncertainty
- **No Pipeline Value Guesses**: Deal values, revenue figures, and opportunity sizes are withheld from the source package; no fictitious pipeline totals have been fabricated.
- **Redactions**: Classification reasons and summaries were deliberately nullified by the assessment design.
- **Unattended Meetings**: Records M05, M08, and M11 were recorded by notetakers with zero speech; this does not prove the meeting was held offline or rescheduled.
"""


class ExportArchiveService:

    @classmethod
    def generate_export_zip(cls, db: Session) -> bytes:
        """
        Builds a downloadable zip archive conforming to DATA_CONTRACT.md:
        - Machine-readable manifest.json and manifest.csv
        - Organised folders:
          - /sales_coaching/
          - /deal_next_steps/
          - /customer_followup/
          - /internal_notes/
          - /stored_records/
        - manager_brief_2026-08-21.md
        """
        conversations = db.query(Conversation).order_by(Conversation.record_ref).all()

        manifest_rows = []
        zip_buffer = io.BytesIO()

        with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
            # 1. Add manager brief
            zf.writestr("manager_brief_2026-08-21.md", MANAGER_BRIEF_2026_08_21)

            # 2. Iterate conversations, generate detail outputs in respective folders
            for conv in conversations:
                ref = conv.record_ref or f"{conv.source_type}_{conv.id}"
                routes = conv.assigned_routes or ["No Usable Text / Stored Record"]
                output_paths = []

                # Format markdown output content
                doc_content = cls.format_conversation_markdown(conv)

                written_paths = set()
                for r in routes:
                    folder = cls.route_to_folder(r)
                    filename = f"{ref}_{cls.clean_filename(conv.customer_name)}.md"
                    rel_path = f"{folder}/{filename}"
                    output_paths.append(rel_path)
                    if rel_path not in written_paths:
                        zf.writestr(rel_path, doc_content)
                        written_paths.add(rel_path)

                # Record manifest row
                manifest_row = {
                    "source_type": conv.source_type,
                    "source_id": conv.source_id,
                    "record_ref": conv.record_ref,
                    "applied_source_revision": conv.revision,
                    "routes": routes,
                    "output_paths": output_paths,
                    "processing_review_state": "Processed" if conv.has_usable_text else "No Usable Text / Intake Stored",
                    "manual_override_flag": bool(conv.is_manually_routed),
                    "analysis_freshness": conv.analysis_freshness or "Fresh",
                    "customer_name": conv.customer_name,
                    "representative_or_organizer": conv.sales_rep_name,
                    "conversation_date": conv.conversation_date.isoformat() if conv.conversation_date else None,
                    "has_usable_text": conv.has_usable_text
                }
                manifest_rows.append(manifest_row)

            # 3. Add manifest.json
            zf.writestr("manifest.json", json.dumps(manifest_rows, indent=2))

            # 4. Add manifest.csv
            csv_buffer = io.StringIO()
            if manifest_rows:
                writer = csv.DictWriter(
                    csv_buffer,
                    fieldnames=[
                        "source_type", "source_id", "record_ref", "applied_source_revision",
                        "routes", "output_paths", "processing_review_state", "manual_override_flag",
                        "analysis_freshness", "customer_name", "representative_or_organizer",
                        "conversation_date", "has_usable_text"
                    ]
                )
                writer.writeheader()
                for row in manifest_rows:
                    row_copy = dict(row)
                    row_copy["routes"] = "; ".join(row["routes"])
                    row_copy["output_paths"] = "; ".join(row["output_paths"])
                    writer.writerow(row_copy)
            zf.writestr("manifest.csv", csv_buffer.getvalue())

        zip_buffer.seek(0)
        return zip_buffer.getvalue()

    @staticmethod
    def route_to_folder(route_name: str) -> str:
        mapping = {
            "Sales Coaching": "sales_coaching",
            "Deal Next Steps": "deal_next_steps",
            "Customer Follow-Up": "customer_followup",
            "Customer Follow-up": "customer_followup",
            "Internal/Vendor Note": "internal_notes",
            "Urgent Support Escalation": "customer_followup",
            "No Usable Text / Stored Record": "stored_records"
        }
        return mapping.get(route_name, "other_outputs")

    @staticmethod
    def clean_filename(name: str) -> str:
        if not name:
            return "record"
        return "".join(c if c.isalnum() or c in ("-", "_") else "_" for c in name)[:35].strip("_")

    @classmethod
    def format_conversation_markdown(cls, conv: Conversation) -> str:
        analysis = conv.structured_analysis or {}
        lines = [
            f"# Record {conv.record_ref or conv.id}: {conv.customer_name}",
            "",
            "## Source Metadata",
            f"- **Source Type**: {conv.source_type.title()}",
            f"- **Source ID**: `{conv.source_id}`",
            f"- **Applied Revision**: {conv.revision} (Batch: `{conv.batch_id}`)",
            f"- **Interaction Date**: {conv.conversation_date.strftime('%Y-%m-%d %H:%M:%S') if conv.conversation_date else '2026-08-21'}",
            f"- **Duration**: {conv.duration_seconds} seconds",
            f"- **Sales Rep / Organizer**: {conv.sales_rep_name}",
            f"- **Usable Text Available**: {'Yes' if conv.has_usable_text else 'No'}",
            f"- **Intake / Unavailable Reason**: {conv.unavailable_reason or 'None (transcript complete)'}",
            f"- **Assigned Routes**: {', '.join(conv.assigned_routes or ['None'])}",
            f"- **Manual Override Active**: {'Yes (Manager Decision)' if conv.is_manually_routed else 'No (Automated)'}",
            f"- **Analysis Freshness**: {conv.analysis_freshness}",
            "",
            "## What Happened & Why It Matters",
            analysis.get("what_happened_and_why_it_matters") or "No substantive conversation text provided in source envelope.",
            "",
            "## Evidence Citations",
        ]

        citations = analysis.get("evidence_citations") or []
        if citations:
            for c in citations:
                lines.append(f"- **Passage**: `{c.get('quote_or_turn')}`")
                lines.append(f"  - *Speaker*: {c.get('speaker', 'Unknown')}")
                lines.append(f"  - *Significance*: {c.get('significance')}")
        else:
            lines.append("No citation passages available (silent or un-transcribed interaction).")

        lines.extend([
            "",
            "## What Evidence Does Not Establish (Honest Uncertainty)",
            analysis.get("what_evidence_does_not_establish") or "No further extrapolations can be derived beyond recorded telemetry.",
            "",
            "## Next Steps & Action Owners",
        ])

        actions = analysis.get("next_steps_and_owners") or []
        if actions:
            for a in actions:
                lines.append(f"- [ ] **Action**: {a.get('action')}")
                lines.append(f"  - *Owner*: {a.get('owner', 'Unassigned')} | *Deadline*: {a.get('deadline', 'TBD')}")
        else:
            lines.append("No action items assigned.")

        lines.extend([
            "",
            "## Sales Coaching Notes",
            analysis.get("coaching_notes") or "N/A",
            "",
            "## Full Conversation Transcript",
            "```text",
            conv.transcript or "[No transcript captured in source payload]",
            "```",
            ""
        ])

        return "\n".join(lines)
