import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  Clock,
  User,
  Building,
  CheckCircle2,
  AlertCircle,
  FileText,
  Brain,
  History,
  Sparkles,
  Upload,
  Send,
  Edit3,
  Check,
  ShieldCheck,
  Tag
} from 'lucide-react';
import { api } from '../services/api';
import { Conversation } from '../types';
import { CompletenessBadge, StatusBadge, Skeleton } from '../components/common/UIComponents';

export const ConversationDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Late transcript arrival form
  const [transcriptInput, setTranscriptInput] = useState('');
  const [submittingTranscript, setSubmittingTranscript] = useState(false);
  const [showTranscriptEditor, setShowTranscriptEditor] = useState(false);

  // Re-run AI analysis
  const [reanalyzing, setReanalyzing] = useState(false);

  const fetchDetails = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await api.getConversationDetails(parseInt(id, 10));
      setConversation(res);
      setTranscriptInput(res.transcript || '');
    } catch (err: any) {
      setError(err.message || 'Failed to load conversation details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [id]);

  const handleSaveTranscript = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!conversation || !transcriptInput.trim()) return;

    try {
      setSubmittingTranscript(true);
      await api.updateTranscript(conversation.id, transcriptInput.trim());
      setShowTranscriptEditor(false);
      await fetchDetails();
    } catch (err: any) {
      alert(`Error saving transcript: ${err.message}`);
    } finally {
      setSubmittingTranscript(false);
    }
  };

  const handleReanalyze = async () => {
    if (!conversation) return;
    try {
      setReanalyzing(true);
      await api.reanalyzeConversation(conversation.id);
      await fetchDetails();
    } catch (err: any) {
      alert(`Error reanalyzing call: ${err.message}`);
    } finally {
      setReanalyzing(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 max-w-6xl mx-auto space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-96 lg:col-span-2" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (error || !conversation) {
    return (
      <div className="p-8 max-w-2xl mx-auto text-center space-y-4">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
        <h3 className="font-bold text-slate-800 text-lg">Conversation Not Found</h3>
        <p className="text-sm text-slate-500">{error || 'Unable to retrieve requested conversation record.'}</p>
        <button
          onClick={() => navigate('/conversations')}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold"
        >
          Return to Conversations
        </button>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      {/* Back Button & Header */}
      <div>
        <button
          onClick={() => navigate('/conversations')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 mb-4 transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Conversations
        </button>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-slate-900">{conversation.external_call_id}</h2>
              <span className="px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                {conversation.conversation_type}
              </span>
              <StatusBadge status={conversation.transcript_status} type="transcript" />
              <StatusBadge status={conversation.ai_review_status} type="review" />
            </div>

            <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-slate-600">
              <span className="flex items-center gap-1 font-semibold text-slate-800">
                <Building className="w-4 h-4 text-slate-400" /> {conversation.customer_name}
              </span>
              <span className="flex items-center gap-1">
                <User className="w-4 h-4 text-slate-400" /> Rep: {conversation.sales_rep_name}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4 text-slate-400" />{' '}
                {new Date(conversation.conversation_date).toLocaleString()}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4 text-slate-400" />{' '}
                {Math.floor(conversation.duration_seconds / 60)}m {conversation.duration_seconds % 60}s
              </span>
            </div>
          </div>

          <div className="text-right flex flex-col items-start md:items-end">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Completeness Score
            </span>
            <CompletenessBadge score={conversation.completeness_score} />
          </div>
        </div>
      </div>

      {/* Completeness Breakdown Widget */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              Completeness Score Breakdown ({conversation.completeness_score.toFixed(0)}%)
            </h3>
            <p className="text-xs text-slate-500">Transparent assessment of mandatory and analytical fields</p>
          </div>
          {conversation.missing_fields && conversation.missing_fields.length > 0 && (
            <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-md border border-rose-200">
              {conversation.missing_fields.length} Missing Field(s)
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 pt-2">
          {/* Identity */}
          <div className="p-3 rounded-lg border border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Identity (25%)
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Call ID, rep, customer</p>
          </div>

          {/* Transcript */}
          <div className={`p-3 rounded-lg border ${
            conversation.transcript ? 'border-slate-100 bg-slate-50/50' : 'border-amber-200 bg-amber-50/50'
          }`}>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
              {conversation.transcript ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-500" />
              )}
              Transcript (25%)
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {conversation.transcript ? 'Ingested' : 'Pending Upload'}
            </p>
          </div>

          {/* Purpose */}
          <div className={`p-3 rounded-lg border ${
            conversation.active_purposes.length > 0 ? 'border-slate-100 bg-slate-50/50' : 'border-amber-200 bg-amber-50/50'
          }`}>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
              {conversation.active_purposes.length > 0 ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-500" />
              )}
              Purpose Tags (20%)
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {conversation.active_purposes.length} Classified
            </p>
          </div>

          {/* AI Summary */}
          <div className={`p-3 rounded-lg border ${
            conversation.ai_summary ? 'border-slate-100 bg-slate-50/50' : 'border-amber-200 bg-amber-50/50'
          }`}>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
              {conversation.ai_summary ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-500" />
              )}
              AI Summary (20%)
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {conversation.ai_summary ? 'Generated' : 'Awaiting Transcript'}
            </p>
          </div>

          {/* Follow-up */}
          <div className={`p-3 rounded-lg border ${
            conversation.follow_up_status !== 'None' ? 'border-slate-100 bg-slate-50/50' : 'border-slate-200 bg-slate-50/50'
          }`}>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
              {conversation.follow_up_status !== 'None' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              ) : (
                <AlertCircle className="w-4 h-4 text-slate-400" />
              )}
              Follow-up (10%)
            </div>
            <p className="text-[11px] text-slate-500 mt-1">{conversation.follow_up_status}</p>
          </div>
        </div>

        {conversation.missing_fields && conversation.missing_fields.length > 0 && (
          <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-lg text-xs text-rose-800 space-y-1">
            <span className="font-bold">Items requiring attention:</span>
            <ul className="list-disc list-inside space-y-0.5 text-[11px]">
              {conversation.missing_fields.map((field, i) => (
                <li key={i}>{field}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Main Content 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Col (2): Transcript & Late Transcript Manager */}
        <div className="lg:col-span-2 space-y-6">
          {/* Late Transcript Arrival Card */}
          {(!conversation.transcript || showTranscriptEditor) ? (
            <div className="bg-amber-50/50 border border-amber-200 rounded-xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                  <Upload className="w-4 h-4 text-amber-600" />
                  Late Transcript Arrival — Ingest Call Audio / Text
                </div>
                {conversation.transcript && (
                  <button
                    onClick={() => setShowTranscriptEditor(false)}
                    className="text-xs text-slate-500 hover:text-slate-700 font-semibold"
                  >
                    Cancel
                  </button>
                )}
              </div>
              <p className="text-xs text-amber-800">
                This conversation metadata arrived earlier without a transcript. Ingesting the transcript now will automatically update the completeness score and trigger Groq AI intelligence extraction.
              </p>

              <form onSubmit={handleSaveTranscript} className="space-y-3">
                <textarea
                  rows={8}
                  value={transcriptInput}
                  onChange={(e) => setTranscriptInput(e.target.value)}
                  placeholder="Paste call transcript here (e.g. speaker dialogue, call notes, meeting recording text)..."
                  className="w-full bg-white border border-amber-300 rounded-lg p-3 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                  required
                ></textarea>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={submittingTranscript || !transcriptInput.trim()}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg text-xs font-semibold hover:bg-amber-700 transition disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{submittingTranscript ? 'Analyzing with Groq AI...' : 'Save Transcript & Run AI Analysis'}</span>
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  Ingested Call Transcript
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowTranscriptEditor(true)}
                    className="text-xs text-slate-600 hover:text-slate-900 font-semibold px-2.5 py-1 rounded border border-slate-200 hover:bg-slate-50 flex items-center gap-1"
                  >
                    <Edit3 className="w-3 h-3" /> Edit Transcript
                  </button>
                  <button
                    onClick={handleReanalyze}
                    disabled={reanalyzing}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold px-2.5 py-1 rounded bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 flex items-center gap-1"
                  >
                    <Sparkles className={`w-3 h-3 ${reanalyzing ? 'animate-spin' : ''}`} />
                    {reanalyzing ? 'Analyzing...' : 'Re-run AI Analysis'}
                  </button>
                </div>
              </div>

              <div className="bg-slate-50/70 p-4 rounded-lg border border-slate-200 max-h-96 overflow-y-auto text-xs text-slate-700 font-mono leading-relaxed whitespace-pre-wrap">
                {conversation.transcript}
              </div>
            </div>
          )}

          {/* AI Intelligence Output */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Brain className="w-4 h-4 text-indigo-600" />
                Groq AI Intelligence Analysis
              </h3>
              <span className="text-xs text-slate-500">
                Confidence: <span className="font-bold text-slate-800">{((conversation.confidence_score || 0) * 100).toFixed(0)}%</span>
              </span>
            </div>

            {/* AI Executive Summary */}
            <div>
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Executive Summary</h4>
              <p className="text-xs text-slate-800 bg-slate-50 p-3.5 rounded-lg border border-slate-200 leading-relaxed">
                {conversation.ai_summary || 'No AI summary generated yet. Upload transcript to analyze.'}
              </p>
            </div>

            {/* Purposes with Evidence */}
            <div>
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Classified Purposes & Supporting Evidence
              </h4>
              <div className="space-y-2">
                {conversation.purpose_associations && conversation.purpose_associations.length > 0 ? (
                  conversation.purpose_associations.filter((p) => p.is_active).map((p) => (
                    <div key={p.id} className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                          {p.purpose_name}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          Confidence: {(p.confidence * 100).toFixed(0)}% • Source: {p.source}
                        </span>
                      </div>
                      {p.evidence_snippet && (
                        <p className="text-xs text-slate-600 italic pl-1 border-l-2 border-indigo-300">
                          "{p.evidence_snippet}"
                        </p>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 italic">No purpose labels assigned.</p>
                )}
              </div>
            </div>

            {/* Extracted Requirements & Objections */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg border border-slate-200 bg-slate-50/50 space-y-2">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Customer Requirements</h4>
                {conversation.customer_requirements && conversation.customer_requirements.length > 0 ? (
                  <ul className="list-disc list-inside text-xs text-slate-700 space-y-1">
                    {conversation.customer_requirements.map((req, i) => (
                      <li key={i}>{req}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-slate-400 italic">None identified</p>
                )}
              </div>

              <div className="p-4 rounded-lg border border-slate-200 bg-slate-50/50 space-y-2">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Objections Raised</h4>
                {conversation.objections && conversation.objections.length > 0 ? (
                  <ul className="list-disc list-inside text-xs text-rose-800 space-y-1">
                    {conversation.objections.map((obj, i) => (
                      <li key={i}>{obj}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-slate-400 italic">No explicit objections detected</p>
                )}
              </div>
            </div>

            {/* Action Items */}
            <div>
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">Committed Action Items</h4>
              {conversation.action_items && conversation.action_items.length > 0 ? (
                <div className="space-y-1.5">
                  {conversation.action_items.map((act, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-slate-800 bg-slate-50 p-2.5 rounded border border-slate-200">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{act}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">No action items found.</p>
              )}
            </div>
          </div>
        </div>

        {/* Right Col (1): Action Recommendations & Audit History */}
        <div className="space-y-6">
          {/* Action Recommendations Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
            <h3 className="font-bold text-slate-900 text-sm">Recommended Next Actions</h3>
            {conversation.action_recommendations && conversation.action_recommendations.length > 0 ? (
              <div className="space-y-2">
                {conversation.action_recommendations.map((action) => (
                  <div key={action.id} className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        action.priority === 'High' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'
                      }`}>
                        {action.priority} Priority
                      </span>
                      <span className="font-medium text-slate-500 capitalize">{action.status}</span>
                    </div>
                    <h5 className="font-bold text-slate-800 mt-1">{action.title}</h5>
                    <p className="text-slate-600 text-[11px]">{action.suggested_action}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">No open action recommendations.</p>
            )}
          </div>

          {/* Audit History Timeline */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <History className="w-4 h-4 text-indigo-600" />
              Chronological Audit Trail
            </h3>

            <div className="relative pl-5 border-l-2 border-slate-200 space-y-4">
              {conversation.audit_events && conversation.audit_events.length > 0 ? (
                conversation.audit_events.map((event) => (
                  <div key={event.id} className="relative group">
                    <span className="absolute -left-[27px] top-1 w-3 h-3 rounded-full bg-indigo-500 ring-4 ring-white"></span>
                    <div>
                      <p className="text-xs font-bold text-slate-800 capitalize">
                        {event.event_type.replace(/_/g, ' ')}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {new Date(event.timestamp).toLocaleString()} • {event.actor}
                      </p>
                      {event.details && <p className="text-xs text-slate-600 mt-1">{event.details}</p>}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 italic">No audit events recorded.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
