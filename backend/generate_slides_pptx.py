import os
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN

def create_presentation():
    prs = Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)

    blank_layout = prs.slide_layouts[6]

    def add_header(slide, title_text, category_text):
        # Header background banner
        header_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.5), Inches(11.733), Inches(1.2))
        tf = header_box.text_frame
        tf.word_wrap = True
        tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0

        p0 = tf.paragraphs[0]
        p0.text = category_text.upper()
        p0.font.size = Pt(11)
        p0.font.bold = True
        p0.font.color.rgb = RGBColor(79, 70, 229)  # Indigo

        p1 = tf.add_paragraph()
        p1.text = title_text
        p1.font.size = Pt(24)
        p1.font.bold = True
        p1.font.color.rgb = RGBColor(15, 23, 42)  # Slate-900

    # ==================== SLIDE 1 ====================
    slide1 = prs.slides.add_slide(blank_layout)
    add_header(slide1, "The Manager Problem & 3 Key Findings", "Slide 1 • Problem Context & Analytical Evidence")

    tb1 = slide1.shapes.add_textbox(Inches(0.8), Inches(1.8), Inches(11.733), Inches(5.2))
    tf1 = tb1.text_frame
    tf1.word_wrap = True

    p = tf1.paragraphs[0]
    p.text = "The Manager Problem: On 21 Aug 2026, SpendNest received 44 interaction records (30 calls, 14 meetings), but only 17 had initial transcripts (18 post-update). Managers face noisy labels, delayed transcripts, and fragmented records without CRM ground truth."
    p.font.size = Pt(13)
    p.font.color.rgb = RGBColor(71, 85, 105)

    bullets1 = [
        ("Finding 1: Asterloom Systems (M03) — Domestic Card Reimbursement & Dual Approvals",
         "• Citation: M03 Turn 3 [00:06:04] Customer B: 'Cards first. Our overseas team already has a provider they like. Here we reimburse employees through bank transfer... We need dual approval workflows.'\n• Impact: Routed to Deal Next Steps; scheduled dual-approval demo. Avoided pitching against overseas incumbent."),
        ("Finding 2: Willowfield Trust (M07) — Live Screen Bug Reproduction (Late Batch)",
         "• Citation: M07 Turn 2 & 3 [00:09:59] Customer A: 'I am changing this event-payment description... The field still shows the earlier wording. So the change is not appearing after you save, is that right? Yes.'\n• Impact: Routed to Customer Success & Bug Escalation; created urgent engineering defect ticket."),
        ("Finding 3: Pranav / Harborlight Advisory (C01) — Cold Outreach Disqualification",
         "• Citation: C01 Quote: 'Our processes are already very automated. We have a fairly advanced setup, so I don't think this is something we need... where did you find my details?'\n• Impact: Routed to Sales Coaching on permission openers; marked disqualified rather than logging fake pipeline.")
    ]

    for title, desc in bullets1:
        p_t = tf1.add_paragraph()
        p_t.text = title
        p_t.font.size = Pt(13)
        p_t.font.bold = True
        p_t.font.color.rgb = RGBColor(30, 41, 59)
        p_t.space_before = Pt(8)

        p_d = tf1.add_paragraph()
        p_d.text = desc
        p_d.font.size = Pt(11)
        p_d.font.color.rgb = RGBColor(51, 65, 85)

    # ==================== SLIDE 2 ====================
    slide2 = prs.slides.add_slide(blank_layout)
    add_header(slide2, "Interface Choices & Deliberate Omissions", "Slide 2 • UI/UX Architecture & Restraint")

    tb2 = slide2.shapes.add_textbox(Inches(0.8), Inches(1.8), Inches(11.733), Inches(5.2))
    tf2 = tb2.text_frame
    tf2.word_wrap = True

    sections2 = [
        ("Deliberate Design Choices",
         "• Evaluation Replay Controller: 1-click execution of initial batch (01_initial), repeat deduplication, and late update (02_update) with live toast confirmation.\n• Explicit Denominators: Headline KPIs display explicit denominators (e.g. 18 / 44 usable texts (40.9%), 11 / 30 connected calls (36.7%)).\n• Rep vs. Organizer Separation: Separate selectors distinguish Call Reps (Arun, Leela, Meera, Kiran, Dev) from Meeting Organizers (team06–team14).\n• Manager Daily Briefing: Dedicated 4-tab briefing covering Deal Next Steps, Customer Escalations, Coaching, and Boundaries."),
        ("What Was Deliberately Left Out (Honest Uncertainty)",
         "• No Fabricated Pipeline Values: Deal amounts are withheld from the dataset; we declined to invent speculative pipeline currency sums.\n• No Silent AI Guessing on Un-transcribed Records: Records B01–B20 (telephony) and M05, M08, M11 (silent notetakers) are classified as 'No Usable Text / Stored Record' rather than hallucinated AI summaries.\n• No Cross-Meeting Speaker Extrapolations: Speaker labels ('Team member A', 'Customer A') are strictly local to individual meetings.")
    ]

    for title, desc in sections2:
        p_t = tf2.add_paragraph() if tf2.paragraphs[0].text else tf2.paragraphs[0]
        p_t.text = title
        p_t.font.size = Pt(14)
        p_t.font.bold = True
        p_t.font.color.rgb = RGBColor(15, 23, 42)
        p_t.space_before = Pt(12)

        p_d = tf2.add_paragraph()
        p_d.text = desc
        p_d.font.size = Pt(12)
        p_d.font.color.rgb = RGBColor(51, 65, 85)

    # ==================== SLIDE 3 ====================
    slide3 = prs.slides.add_slide(blank_layout)
    add_header(slide3, "Routing Taxonomy & The Difficult Case (M07)", "Slide 3 • Categorization & Judgment Preservation")

    tb3 = slide3.shapes.add_textbox(Inches(0.8), Inches(1.8), Inches(11.733), Inches(5.2))
    tf3 = tb3.text_frame
    tf3.word_wrap = True

    sections3 = [
        ("Differentiated Routing Taxonomy",
         "• Sales Coaching: Cold call objections (C01), StoreHarbor displacement discovery (C05), listening in roaming conditions (C03).\n• Deal Next Steps: Commercial agreements with owners and due dates (Asterloom M03, Willowbank C07, Milan API C03).\n• Customer Follow-Up: Onboarding links (Brookmint M09), card acceptance concerns (Cedarwave M04), voicemails (C02, C04).\n• Internal / Vendor Note: Electronic invoicing webhooks (LedgerBridge M02), billing training (M10).\n• No Usable Text / Stored Record: Preserved intake evidence for background telephony and silent meetings."),
        ("The Difficult Case: Preserving Judgment on M07 (Willowfield Trust)",
         "• The Conflict: Meeting M07 arrives in 01_initial with 0 turns. The manager inspects metadata and manually routes it to Customer Follow-Up / Urgent Escalation. Later, 02_update arrives with Revision 2 and 27 turns.\n• The Risk: Naive systems erase manual manager decisions upon receiving fresh upstream data.\n• Our Solution (Rule 4 & 5): We isolate manual_route_override from upstream payload fields. When Revision 2 arrives:\n  1. Source payload and transcript turns are completely updated.\n  2. The manager's manual route remains in effect (is_manually_routed: true).\n  3. Analysis freshness is explicitly flagged as 'Stale (Awaiting Review)' so the manager knows late evidence arrived.")
    ]

    for title, desc in sections3:
        p_t = tf3.add_paragraph() if tf3.paragraphs[0].text else tf3.paragraphs[0]
        p_t.text = title
        p_t.font.size = Pt(14)
        p_t.font.bold = True
        p_t.font.color.rgb = RGBColor(15, 23, 42)
        p_t.space_before = Pt(12)

        p_d = tf3.add_paragraph()
        p_d.text = desc
        p_d.font.size = Pt(12)
        p_d.font.color.rgb = RGBColor(51, 65, 85)

    # ==================== SLIDE 4 ====================
    slide4 = prs.slides.add_slide(blank_layout)
    add_header(slide4, "Verification of Numbers & Evidence Citations", "Slide 4 • Mathematical Rigor & Denominators")

    tb4 = slide4.shapes.add_textbox(Inches(0.8), Inches(1.8), Inches(11.733), Inches(5.2))
    tf4 = tb4.text_frame
    tf4.word_wrap = True

    sections4 = [
        ("Source-Verified Metrics & Baseline Calculations",
         "• Total Selected Records: 44 interactions (30 calls, 14 meetings). Keyed strictly by (source_type, source_id).\n• Initial Coverage: 17 / 44 (38.6%) = 10 calls (C01–C10) + 7 meetings (M01–M04, M06, M09, M10).\n• Post-Update Coverage: 18 / 44 (40.9%) = M07 added with 27 turns. Total unique records remains exactly 44.\n• Source-Reported Connection Rate: 11 / 30 (36.7%) = calls with is_connected=true / calls with non-null is_connected.\n• Call Rep Activity: Arun (15 calls), Leela (8 calls), Meera (5 calls), Kiran (1 call), Dev (1 call).\n• Meeting Organizers: team08 (3), team09 (3), team06 (1), team07 (1), team10 (1), team11 (1), team12 (1), team13 (1), team14 (1), arun (1)."),
        ("Verification Against Repeat Ingestion",
         "• Repeat Import Test: Re-importing 01_initial.json results in 0 created, 0 updated, and 44 ignored records.\n• Evidence Traceability: Every recommendation in the Manager Brief cites an exact turn number (meetings) or verbatim quote (calls).")
    ]

    for title, desc in sections4:
        p_t = tf4.add_paragraph() if tf4.paragraphs[0].text else tf4.paragraphs[0]
        p_t.text = title
        p_t.font.size = Pt(14)
        p_t.font.bold = True
        p_t.font.color.rgb = RGBColor(15, 23, 42)
        p_t.space_before = Pt(12)

        p_d = tf4.add_paragraph()
        p_d.text = desc
        p_d.font.size = Pt(12)
        p_d.font.color.rgb = RGBColor(51, 65, 85)

    # ==================== SLIDE 5 ====================
    slide5 = prs.slides.add_slide(blank_layout)
    add_header(slide5, "Trade-offs, AI Usage & Future Roadmap", "Slide 5 • Technical Trade-offs & Engineering Next Steps")

    tb5 = slide5.shapes.add_textbox(Inches(0.8), Inches(1.8), Inches(11.733), Inches(5.2))
    tf5 = tb5.text_frame
    tf5.word_wrap = True

    sections5 = [
        ("1 Deliberately Rejected Decision & Accepted Trade-off",
         "• Rejected: Generating synthetic AI summaries for silent notetaker meetings (M05, M08, M11) based on calendar titles.\n• Accepted Trade-off: Manager sees 'No Usable Text / Stored Record' for 6 meetings rather than artificial summaries.\n• Rationale: Titles like 'SpendNest setup - Pinehaven Studio' are unverified hints; fabricating deal context without speech creates dangerous manager blind spots."),
        ("AI Implementation Architecture",
         "• Pre-Generated SpendNest Intelligence: Deterministic, high-accuracy analysis citing exact quotes/turns; guarantees instantaneous test reproducibility without external API downtime.\n• Dynamic Groq LLM Engine (LLaMA 3.3 70B): Active for real-time transcript analysis, custom diff reviews, and interactive routing suggestions."),
        ("Known Limitations & Future Roadmap",
         "1. Calendar Attendee Verification: Upstream payload provides organizer email without participant attendance records; future sync with calendar attendee status.\n2. Audio Playback: Current dataset provides abridged text; integrating synchronized waveform players when audio is unredacted.\n3. Bi-directional CRM Sync: Webhooks to sync approved route decisions directly to HubSpot/Salesforce.")
    ]

    for title, desc in sections5:
        p_t = tf5.add_paragraph() if tf5.paragraphs[0].text else tf5.paragraphs[0]
        p_t.text = title
        p_t.font.size = Pt(14)
        p_t.font.bold = True
        p_t.font.color.rgb = RGBColor(15, 23, 42)
        p_t.space_before = Pt(10)

        p_d = tf5.add_paragraph()
        p_d.text = desc
        p_d.font.size = Pt(11.5)
        p_d.font.color.rgb = RGBColor(51, 65, 85)

    output_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "slides.pptx")
    prs.save(output_path)
    print(f"Presentation saved successfully to: {output_path}")

if __name__ == "__main__":
    create_presentation()
