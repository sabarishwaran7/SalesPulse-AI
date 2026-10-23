# SalesPulse AI — Revenue Intelligence Inbox
## 5-Slide Executive Submission Presentation

---

# Slide 1: The Manager Problem & Main Findings

### The Manager Problem:
Sales managers are flooded with raw telephony records, disparate calendar bookings, delayed transcripts, and unreliable machine tags. On **21 August 2026 (Asia/Kolkata)**, SpendNest generated **44 interaction records** (30 calls, 14 meetings), but only **17 had initial transcripts** (rising to **18** after late delivery). A manager cannot manually listen to 44 calls or decipher unverified summaries.

### 3 Most Important Findings:

1. **Asterloom Systems (M03) — Dual Approval & Domestic Reimbursement**:
   - *Observation*: Customer has an overseas corporate card vendor they like, but has an urgent, immediate need for domestic employee reimbursements and card controls with dual-approval tiers.
   - *Passage*: **M03 Turn 3 [00:06:04] Customer B**: *"Cards first. Our overseas team already has a provider they like. Here we reimburse employees through bank transfer... We need dual approval workflows."*
   - *Product Decision*: Routed to **Deal Next Steps**; scheduled follow-up demo on dual-approval controls. Avoided pitching against overseas incumbent.

2. **Willowfield Trust (M07) — Live UI Description Persistence Defect**:
   - *Observation*: In meeting M07 (late transcript batch), Customer A demonstrated that saving an edited event-payment description fails silently—the screen continues displaying previous text.
   - *Passage*: **M07 Turn 2 & 3 [00:09:59 - 00:11:16]**: *"The first one is editing the description... The field still shows the earlier wording. So the change is not appearing after you save, is that right? Yes."*
   - *Product Decision*: Routed to **Customer Success & Bug Escalation**; created automated high-priority engineering defect.

3. **Pranav / Harborlight Advisory (C01) — Cold Call Disqualification & Rep Coaching**:
   - *Observation*: Rep Arun pitched through an initial interruption. The prospect challenged how his number was obtained and stated their finance operations are already fully automated.
   - *Passage*: **C01 Quote**: *"Our processes are already very automated. We have a fairly advanced setup, so I don't think this is something we need... where did you find my details?"*
   - *Product Decision*: Routed to **Sales Coaching** on permission-based cold openers; marked account as disqualified rather than logging an inflated pipeline stage.

---

# Slide 2: Interface Choices & What Was Deliberately Left Out

### Deliberate Design Choices:
- **Evaluation Replay Controller**: Placed prominently at the top of the workspace. Enables one-click verification of the 5-step replay contract (initial batch &rarr; repeat deduplication &rarr; manual route change &rarr; late transcript update &rarr; override preservation).
- **Explicit Denominator Displays**: Every headline KPI explicitly displays its denominator (e.g. `18 / 44 usable texts (40.9%)`, `11 / 30 connected calls (36.7%)`).
- **Rep vs. Organizer Separation**: Separate filter menus distinguish **Call Representatives** (Arun, Leela, Meera, Kiran, Dev) from **Calendar Organizers** (team06@example.com through team14@example.com).
- **Manager Daily Brief for 21 August 2026**: Embedded actionable briefing tabs for Deal Next Steps, Customer Bug Escalations, Sales Coaching, and Data Boundaries.

### What Was Deliberately Left Out (Honest Restraint):
- ❌ **No Fabricated Pipeline Totals**: The source dataset withholds deal sizes and opportunity values. We deliberately declined to display synthetic revenue totals or speculative weighted pipeline charts.
- ❌ **No Silent Guessing on Un-transcribed Records**: Records `B01`–`B20` (telephony without audio) and `M05`, `M08`, `M11` (silent notetakers) are classified as `No Usable Text / Stored Record` with intake telemetry rather than hallucinated AI summaries.
- ❌ **No Cross-Meeting Speaker Assumptions**: Speaker labels such as *"Team member A"* and *"Customer A"* are scoped strictly to individual meetings, obeying the data contract boundary.

---

# Slide 3: Routing Architecture & One Difficult Decision

### Differentiated Routing Taxonomy:
1. **Sales Coaching**: Early cold call objections, incumbent displacementdiscovery (StoreHarbor C05), listening patience in noisy roaming conditions (Kiran C03).
2. **Deal Next Steps**: Concrete commercial actions with explicit owners and due dates (Asterloom M03, Willowbank C07, Milan API C03).
3. **Customer Follow-Up**: Onboarding blockers (Brookmint M09), card acceptance concerns (Cedarwave M04), voicemails (Fernhaven C02, Lanternpath C04).
4. **Internal / Vendor Note**: Webhook and electronic invoicing specifications (LedgerBridge M02), billing training (M10).
5. **No Usable Text / Stored Record**: Background telephony and silent notetaker captures.

### The Difficult Case: Preserving Judgment on M07 (Willowfield Trust):
- **Challenge**: Meeting `M07` arrives initially in `01_initial.json` with 0 turns and status `"Transcript not included in this delivery; a later assessment batch supplies it."` The manager evaluates the metadata and manually routes it to `Customer Follow-Up` / `Urgent Support Escalation`. Later, `02_update.json` arrives with Revision 2 and 27 turns.
- **The Problem**: A naive system either erases the manager's route with a newly generated AI suggestion or refuses to update the record.
- **Our Solution**: Strict adherence to DATA_CONTRACT.md Rule 4 & 5. We store `manual_route_override` separately from upstream payload fields. When Revision 2 arrives:
  1. The source payload and transcript turns are completely updated.
  2. The manager's manual route remains in effect (`is_manually_routed: true`).
  3. The analysis freshness is explicitly flagged as `"Stale (Awaiting Review)"` so the manager knows late evidence has arrived.

---

# Slide 4: Verification of Numbers & Evidence-Backed Conclusions

### Exact Mathematical Verification Against Source Files:

| Metric | Computed Value | Verification & Denominator Formula |
| :--- | :--- | :--- |
| **Total Selected Records** | **44** | 30 calls + 14 meetings in `01_initial.json`. Identity = `(source_type, source_id)`. |
| **Initial Usable Transcript Coverage** | **17 / 44 (38.6%)** | 10 calls (C01–C10) + 7 meetings (M01–M04, M06, M09, M10). Denominator: 44. |
| **Post-Update Usable Coverage** | **18 / 44 (40.9%)** | 10 calls + 8 meetings (M07 added with 27 turns). Unique count remains 44. |
| **Source Reported Connection Rate** | **11 / 30 (36.7%)** | `is_connected == true` on 11 calls; denominator = 30 calls with non-null status. |
| **Outbound Call Rep Distribution** | **30 Calls Total** | Arun (15 calls), Leela (8 calls), Meera (5 calls), Kiran (1 call), Dev (1 call). |
| **Meeting Organizer Distribution** | **14 Meetings Total** | team08 (3), team09 (3), team06 (1), team07 (1), team10 (1), team11 (1), team12 (1), team13 (1), team14 (1), arun (1). |

### Analytical Verification:
- All conclusions in the Manager Brief are strictly tethered to **source passage citations** (turn number or exact quote).
- Re-importing `01_initial.json` results in `created: 0, updated: 0, ignored: 44`—proving zero duplicate inflation.

---

# Slide 5: Trade-offs, AI Usage, Known Limitations & Roadmap

### 1 Deliberately Rejected Decision & Accepted Trade-off:
- **Rejected Decision**: Automatically generating synthetic AI summaries for silent notetaker records (`M05`, `M08`, `M11`) based on calendar meeting titles.
- **Accepted Trade-off**: The manager sees empty transcript notices for 6 meetings rather than polished-looking AI summaries.
- **Why It Matters**: Stored calendar titles like *"SpendNest setup - Pinehaven Studio"* are weak hints, not verified evidence. Fabricating customer requirements without transcript audio creates dangerous false confidence for sales managers.

### AI Usage & Execution Architecture:
- **Groq LLaMA 3.3 70B Versatile / Pre-generated Pipeline**: High-confidence pre-generated analysis provides instantaneous, deterministic replay results without relying on external API uptime during evaluation.
- **Live Groq LLM Fallback**: Available for ad-hoc transcript ingestion, diff analysis, and custom prompts.

### Known Limitations & Future Improvements:
1. **Calendar Attendee Mapping**: Upstream source data provides calendar organizer email but no confirmed attendance directory. Future enhancement: cross-referencing speaker turn audio with calendar participant lists.
2. **Audio Waveform Visualizer**: The current package provides paraphrased text; integrating synchronized audio playback when audio recordings are unredacted.
3. **CRM Integration**: Bi-directional sync with HubSpot/Salesforce once authoritative opportunity tables are provisioned.
