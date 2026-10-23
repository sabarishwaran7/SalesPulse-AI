# SalesPulse AI — Revenue Intelligence Inbox (SpendNest)

A clickable, production-grade sales conversation intelligence platform designed for sales managers to analyze calls and meetings, identify missing information, detect incorrect classifications, safely import batch deliveries, preserve human judgment across revisions, and export machine-readable manifests with traceable evidence.

---

## ⚡ Quick Start (Local Setup)

### Prerequisites
- Python 3.10+ (Python 3.13 tested)
- Node.js 18+ and npm
- PostgreSQL database (Supabase PostgreSQL configured or local PostgreSQL)

### 1. Backend Startup
```bash
# In project root
# 1. Activate virtual environment
.\venv\Scripts\Activate.ps1    # On Windows PowerShell
# or: source venv/bin/activate # On macOS/Linux

# 2. Run database migrations
alembic upgrade head

# 3. Start FastAPI backend (port 8000)
uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```
Backend API will be active at: `http://127.0.0.1:8000` (Swagger docs: `http://127.0.0.1:8000/docs`).

### 2. Frontend Startup
```bash
# In another terminal window:
cd frontend
npm install
npm run dev
```
Frontend Web Application will be live at: `http://127.0.0.1:5173`.

---

## 🔁 How to Reproduce Each Replay Step (DATA_CONTRACT.md)

The platform provides a dedicated **Evaluation Replay Controller** directly at the top of the main dashboard (`http://127.0.0.1:5173/`), as well as command-line script runners:

| Step | Action in UI or Terminal | Expected & Verified Behavior |
| :--- | :--- | :--- |
| **1. Initial Import** | Click **"Reset Replay"** or run: `python -m backend.seed_spendnest` | Exactly 44 unique records loaded (30 calls, 14 meetings). Exactly 17 records have usable transcripts (10 calls, 7 meetings). M07 has 0 turns and status *"Transcript not included in this delivery..."*. |
| **2. Repeat Batch** | Click **"Repeat Initial (01_initial)"** | Re-imports `01_initial.json`. System reports `0 created, 0 updated, 44 ignored`. Zero duplicates created; total unique records remains strictly 44. |
| **3. Manual Correction** | On conversation `M07`, click **"Edit Route"**, select `Customer Follow-Up` & `Urgent Support Escalation`, enter reason, and click **"Lock Manual Route"**. | `is_manually_routed` is set to `true`. Route changes immediately to `Customer Follow-Up` with `[Locked 🔒]` badge. |
| **4. Late Update Batch** | Click **"Apply Late Update (02_update)"** | Ingests `02_update.json` (Revision 2). Record `M07` is updated with its 27 turns! Total usable transcript count increases to **18 / 44 (40.9%)**. Total unique records remains strictly 44. |
| **5. Preserve Judgment** | Refresh browser or restart application. | **`M07`'s manual route remains in full effect** (`Customer Follow-Up` / `Urgent Support Escalation`), its 27 turns are inspectable, and its analysis freshness is flagged as `Stale (Awaiting Review)` rather than silently overwritten. |
| **6. Repeat Initial Again** | Click **"Repeat Initial"** again. | `01_initial.json` (Revision 1) is completely ignored because `revision 1 < revision 2`. Total records stays 44 and M07 stays at revision 2 with 18 usable texts. |

### Running the Automated Replay Test Suite
Execute the end-to-end replay test suite verifying all 6 steps:
```bash
pytest backend/tests/test_spendnest_contract_and_replay.py -v
```
*(Result: 1 passed in ~15s, 0 failures)*.

---

## 📊 Metric Definitions & Explicit Denominators (DATA_DICTIONARY.md)

All interaction records fall on **Friday, 21 August 2026 in Asia/Kolkata**. Every headline number defines its explicit denominator:

1. **Total Selected Records (`44`)**:
   - *Denominator*: 44 unique source interactions (30 calls + 14 meetings).
   - *Identity*: Strict pair `(source_type, source_id)`. Names, record refs, and phone tokens are never used as primary keys.
2. **Usable Supplied Transcript Coverage (`17/44` &rarr; `18/44`)**:
   - *Definition*: Records having a non-blank call transcript or at least one non-blank meeting turn divided by total selected records.
   - *Initial Batch*: `17 / 44` (38.6%) = 10 calls (`C01`–`C10`) + 7 meetings (`M01`–`M04`, `M06`, `M09`, `M10`).
   - *Post-Update*: `18 / 44` (40.9%) = `M07` receives 27 turns in `02_update.json`.
3. **Outbound Calls Activity (`30`)**:
   - 10 calls with usable text (`C01`–`C10`), 20 background telephony calls without text (`B01`–`B20`).
4. **Calendar Meetings Activity (`14`)**:
   - 7 meetings with speech initially (8 post-update), 4 recorded with zero speech (`M05`, `M08`, `M11`), 2 cancelled notetakers (`M12`, `M14`), and 1 unscheduled (`M13`).
5. **Source-Reported Connection Rate (`11 / 30 = 36.7%`)**:
   - *Formula*: Calls with `is_connected == true` (11) divided by calls with non-null `is_connected` status (30).
   - *Scope*: Upstream telephony telemetry classification.
6. **Rep vs Organizer Distinction**:
   - **Call Representatives**: Arun (15 calls), Leela (8 calls), Meera (5 calls), Kiran (1 call), Dev (1 call).
   - **Calendar Organizers**: `team06@example.com` through `team14@example.com`, `arun@example.com`. Meeting organizers are calendar booking accounts, not automatically selling reps or attended participants.

---

## 🔍 Three Most Important Findings

Each finding is tethered to an exact source passage citation and states the exact product screen, rule, and output it influenced:

### Finding 1: Asterloom Systems (M03) — Dual-Approval Corporate Card Controls
- **What Was Noticed**: Customer B stated their overseas team already has an international card provider they are satisfied with. However, they have an urgent domestic problem: employee reimbursements are currently handled via manual bank transfer, and they require corporate cards with tiered dual-approval workflows.
- **Passage Citation**: **M03 Turn 3 [00:06:04] Customer B**: *"Cards first. Our overseas team already has a provider they like. Here we reimburse employees through bank transfer... We need dual approval workflows."*
- **Product Influence**:
  - *Screen*: Dashboard KPI Priority Card & Conversations Drawer.
  - *Rule / Route*: Assigned to **`Deal Next Steps`**.
  - *Output*: Created action item: *"Provide demonstration of dual-approval workflow and card limits for domestic staff (Owner: team08@example.com, Due: 2026-08-25)"*. Explicitly instructed rep not to displace overseas incumbent.

### Finding 2: Willowfield Trust (M07) — Event-Payment Description Persistence Defect
- **What Was Noticed**: In meeting `M07` (late transcript update), Customer A shared their screen and demonstrated a software bug: editing the description on an event payment fails to persist after saving—the screen continues displaying previous wording.
- **Passage Citation**: **M07 Turn 2 & 3 [00:09:59 - 00:11:16] Customer A & Team Member A**: *"The first one is editing the description. I am changing this event-payment description to a short reference... The field still shows the earlier wording. So the change is not appearing after you save, is that right? Yes, it is still the old description."*
- **Product Influence**:
  - *Screen*: Replay Banner, Manager Daily Briefing, and Drawer.
  - *Rule / Route*: Escalated to **`Customer Follow-Up`** & **`Urgent Support Escalation`**.
  - *Output*: Triggered high-priority engineering defect ticket; marked analysis freshness as `Stale (Awaiting Review)` upon update arrival while strictly preserving manager's manual route override.

### Finding 3: Pranav / Harborlight Advisory (C01) — Cold Call Disqualification & Permission Coaching
- **What Was Noticed**: Rep Arun pitched through an initial prospect interruption. When Pranav asked *"Why are you calling?"*, Arun launched into capability claims. The prospect interrupted again (*"No, I asked why you have called me"*), challenged how his number was obtained, and confirmed their finance operations are already fully automated.
- **Passage Citation**: **C01 Quote**: *"Our processes are already very automated. We have a fairly advanced setup, so I don't think this is something we need... where did you find my details?"*
- **Product Influence**:
  - *Screen*: Daily Briefing Coaching Tab & Conversation Detail.
  - *Rule / Route*: Assigned to **`Sales Coaching`**.
  - *Output*: Marked account as *Disqualified* (preventing fictitious pipeline inflation); generated coaching guidance for Arun on 10-second permission-based cold openers and validating prospect context before delivering capability statements.

---

## 🚫 One Deliberately Rejected Decision & Accepted Trade-off

- **Rejected Decision**: Automatically generating synthetic AI summaries for silent notetaker records (`M05`, `M08`, `M11`) based on their calendar meeting titles.
- **Why It Was Rejected**: Upstream calendar titles like *"SpendNest setup - Pinehaven Studio"* are weak hints, not verified ground truth. Upstream notetaker telemetry indicates that although the meeting was recorded, zero speech occurred (`turns: []`). Inventing deal next steps or customer requirements without verbal evidence fabricates dangerous false confidence for sales leadership.
- **Accepted Trade-off**: The manager sees empty transcript notices and intake telemetry (`No Usable Text / Stored Record`) for 6 calendar meetings rather than polished, artificial summaries.
- **Resulting Product Choice**: In the UI and export manifest, silent records are explicitly designated as `No Usable Text / Stored Record` with intake telemetry rather than fictitious analysis.

---

## 📦 Export Archive & Machine-Readable Manifest (DATA_CONTRACT.md)

Clicking **"Download Manifest & Export (.ZIP)"** in the UI or calling `GET /api/v1/spendnest/export-archive` generates a compliant zip archive containing:

```
spendnest_revenue_intelligence_export/
├── manifest.json                  # Machine-readable JSON manifest
├── manifest.csv                   # Machine-readable CSV manifest
├── manager_brief_2026-08-21.md    # Pre-generated Daily Brief for 21 Aug 2026
├── sales_coaching/                # Coaching markdown documents (e.g. C01, C05)
├── deal_next_steps/               # Opportunity action documents (e.g. M03, C07, C03)
├── customer_followup/             # Customer issue documents (e.g. M07, M04, M09)
├── internal_notes/                # Vendor & technical documents (e.g. M02, M10)
└── stored_records/                # Intake telemetry files for un-transcribed records
```

### Manifest Fields (`manifest.json` and `manifest.csv`):
- `source_type`: `"call"` | `"meeting"`
- `source_id`: UUID string (e.g. `4f304fff-fd40-5cfc-a366-0a134c445c2a`)
- `record_ref`: Human-readable reference (`C01`, `M07`, `B01`)
- `applied_source_revision`: `1` or `2`
- `routes`: Array of assigned destination routes
- `output_paths`: Array of relative paths inside the archive
- `processing_review_state`: `"Processed"` | `"No Usable Text / Intake Stored"`
- `manual_override_flag`: Boolean (`true` if manager explicitly corrected route)
- `analysis_freshness`: `"Fresh"` | `"Stale (Awaiting Review)"` | `"Pre-generated"`
- `customer_name`: Target entity or non-dialable phone token
- `representative_or_organizer`: Call rep name or meeting organizer email
- `conversation_date`: ISO timestamp normalized to Asia/Kolkata
- `has_usable_text`: Boolean

---

## 🤖 Dynamic vs. Pre-Generated Operations

- **Pre-Generated SpendNest Intelligence**: Analysis, evidence citations, coaching notes, and the 21 August 2026 Manager Daily Brief are curated deterministically from the adapted conversation library. This ensures instantaneous test execution and zero dependency on third-party AI service quotas during review.
- **Dynamic Operations**:
  - Ingestion diff engine, batch revision comparison (`revision 1` vs `revision 2`), and deduplication logic run dynamically in real time on PostgreSQL.
  - Manual route overrides, locking, and freshness flag transitions (`Stale (Awaiting Review)`) execute dynamically upon user interaction.
  - Live Groq AI integration (`llama-3.3-70b-versatile`) is fully configured for dynamic ad-hoc transcript ingestion, diff generation, and purpose extraction.

---

## ⏱️ Hours Spent & Known Limitations

- **Approximate Hours Spent**: ~7.5 hours (architecture design, schema modeling, import replay engine, Alembic migrations, UI dashboard, and slide decks).
- **Known Limitations**:
  1. *Calendar Attendee Directory*: Calendar payloads supply `organizer_email` but no verified human participation list. We do not assume meeting organizers were the salespeople.
  2. *Paraphrased Audio*: Telephony and meeting recordings are adapted text; playable audio waveforms are non-operational.
  3. *Static Sample Date*: All supplied interactions fall on 21 August 2026 (Asia/Kolkata); temporal analysis across multiple days is outside the supplied dataset.

---

## 📄 Presentation Slides
The required 5-slide deck is available in two formats:
1. **PowerPoint Deck**: [`slides.pptx`](file:///c:/Users/sabar/OneDrive/Documents/sales%20project/slides.pptx) (16:9 widescreen presentation)
2. **Markdown Format**: [`SLIDES.md`](file:///c:/Users/sabar/OneDrive/Documents/sales%20project/SLIDES.md)
