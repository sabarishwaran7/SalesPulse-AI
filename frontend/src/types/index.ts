export interface Conversation {
  id: number;
  external_call_id: string;
  customer_name: string;
  sales_rep_name: string;
  conversation_date: string;
  duration_seconds: number;
  conversation_type: string;
  transcript_status: string;
  has_transcript: boolean;
  transcript?: string;
  ai_summary?: string;
  customer_requirements?: string[];
  objections?: string[];
  action_items?: string[];
  recommended_next_steps?: string[];
  follow_up_status: string;
  completeness_score: number;
  missing_fields?: string[];
  ai_review_status: string;
  confidence_score: number;
  is_manually_corrected?: boolean;
  active_purposes: string[];
  purpose_associations?: PurposeAssociation[];
  ai_analyses?: AIAnalysis[];
  action_recommendations?: ActionRecommendation[];
  audit_events?: AuditEvent[];
  created_at: string;
  updated_at: string;
}

export interface PurposeAssociation {
  id: number;
  purpose_name: string;
  source: string;
  confidence: number;
  evidence_snippet?: string;
  is_active: boolean;
}

export interface AIAnalysis {
  id: number;
  model_name: string;
  summary?: string;
  predicted_purposes: { purpose: string; confidence: number; evidence: string }[];
  customer_requirements: string[];
  objections: string[];
  action_items: string[];
  recommended_next_steps: string[];
  confidence: number;
  needs_review: boolean;
  review_reason?: string;
  created_at: string;
}

export interface AuditEvent {
  id: number;
  event_type: string;
  actor: string;
  before_state?: any;
  after_state?: any;
  details?: string;
  timestamp: string;
}

export interface ActionRecommendation {
  id: number;
  conversation_id: number;
  external_call_id?: string;
  customer_name?: string;
  sales_rep_name?: string;
  action_type: string;
  title: string;
  reason: string;
  suggested_action: string;
  priority: 'High' | 'Medium' | 'Low';
  status: 'Open' | 'In Progress' | 'Completed' | 'Dismissed';
  created_at: string;
  updated_at: string;
}

export interface FieldDiff {
  field_name: string;
  old_value: any;
  new_value: any;
}

export interface RecordDiff {
  row_number: number;
  external_call_id: string;
  status: 'new' | 'updated' | 'unchanged' | 'duplicate' | 'conflict' | 'invalid';
  fields_changed: FieldDiff[];
  conflict_reason?: string;
  validation_errors: string[];
  incoming_data: Record<string, any>;
  existing_data?: Record<string, any>;
}

export interface ImportDiffPreview {
  job_id: number;
  filename: string;
  file_type: string;
  file_size_bytes: number;
  total_rows: number;
  new_count: number;
  updated_count: number;
  unchanged_count: number;
  duplicate_count: number;
  conflict_count: number;
  invalid_count: number;
  records: RecordDiff[];
  summary_message: string;
}

export interface DashboardAnalytics {
  kpis: {
    total_conversations: number;
    calls_count: number;
    meetings_count: number;
    transcript_pending_count: number;
    incomplete_count: number;
    ai_review_needed_count: number;
    follow_ups_due_count: number;
    average_completeness: number;
  };
  volume_over_time: { date: string; calls: number; meetings: number; total: number }[];
  purpose_distribution: { purpose: string; count: number; percentage: number; color: string }[];
  transcript_status_breakdown: { status: string; count: number; color: string }[];
  completeness_distribution: { tier: string; count: number }[];
  follow_up_breakdown: Record<string, number>;
  rep_activity: {
    rep_name: string;
    total_conversations: number;
    completed_transcripts: number;
    avg_completeness: number;
    follow_ups_open: number;
  }[];
}

export interface SpendNestEvidenceCitation {
  quote_or_turn: string;
  speaker: string;
  timecode?: string;
  significance: string;
}

export interface SpendNestActionItem {
  action: string;
  owner?: string;
  deadline?: string;
}

export interface SpendNestStructuredAnalysis {
  what_happened_and_why_it_matters?: string;
  evidence_citations?: SpendNestEvidenceCitation[];
  what_evidence_does_not_establish?: string;
  next_steps_and_owners?: SpendNestActionItem[];
  coaching_notes?: string;
  requirements?: string[];
  objections?: string[];
}

export interface SpendNestConversation {
  id: number;
  record_ref: string;
  source_type: 'call' | 'meeting';
  source_id: string;
  customer_name: string;
  sales_rep_name: string;
  rep_email?: string;
  organizer_email?: string;
  conversation_date: string;
  duration_seconds: number;
  direction?: string;
  has_usable_text: boolean;
  unavailable_reason?: string;
  revision: number;
  batch_id: string;
  assigned_routes: string[];
  routing_reason?: string;
  manual_route_override?: string[];
  is_manually_routed: boolean;
  analysis_freshness: string;
  summary?: string;
  transcript?: string;
  structured_analysis?: SpendNestStructuredAnalysis;
}

export interface SpendNestDashboard {
  dataset_date: string;
  timezone: string;
  kpis: {
    total_selected_records: number;
    total_records_denominator: number;
    usable_transcript_coverage_count: number;
    usable_transcript_coverage_percent: number;
    calls_count: number;
    calls_transcribed: number;
    meetings_count: number;
    meetings_transcribed: number;
    source_reported_connection_rate: {
      connected_calls: number;
      denominator_calls_with_status: number;
      percentage: number;
    };
    manual_route_overrides_count: number;
    stale_analysis_pending_review_count: number;
  };
  m07_status: {
    record_ref: string;
    applied_revision: number;
    has_usable_text: boolean;
    assigned_routes: string[];
    is_manually_routed: boolean;
    analysis_freshness: string;
  };
  reps_activity: Record<string, number>;
  organizers_activity: Record<string, number>;
  route_distribution: Record<string, number>;
}
