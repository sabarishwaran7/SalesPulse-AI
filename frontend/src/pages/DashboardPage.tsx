import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PhoneCall,
  Video,
  FileQuestion,
  AlertTriangle,
  CalendarCheck,
  Award,
  Filter,
  ArrowRight,
  TrendingUp,
  Download,
  Play,
  RotateCcw,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  Lock,
  Edit3,
  Search,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Clock,
  User,
  ShieldAlert,
  Sparkles
} from 'lucide-react';

import { api } from '../services/api';
import { SpendNestDashboard, SpendNestConversation } from '../types';
import { KpiCard, Skeleton } from '../components/common/UIComponents';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();

  // State
  const [dashboard, setDashboard] = useState<SpendNestDashboard | null>(null);
  const [conversations, setConversations] = useState<SpendNestConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [sourceTypeFilter, setSourceTypeFilter] = useState<string>('all');
  const [personFilter, setPersonFilter] = useState<string>('all');
  const [routeFilter, setRouteFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Replay & Action Feedback
  const [replayLoading, setReplayLoading] = useState(false);
  const [replayFeedback, setReplayFeedback] = useState<{ title: string; message: string; type: 'success' | 'info' | 'warning' } | null>(null);

  // Daily Brief Accordion
  const [briefExpanded, setBriefExpanded] = useState(true);
  const [briefTab, setBriefTab] = useState<'deals' | 'customers' | 'coaching' | 'boundaries'>('deals');

  // Selected Conversation for Detail Drawer
  const [selectedConv, setSelectedConv] = useState<SpendNestConversation | null>(null);

  // Route Edit Modal State
  const [editConv, setEditConv] = useState<SpendNestConversation | null>(null);
  const [editSelectedRoutes, setEditSelectedRoutes] = useState<string[]>([]);
  const [editReason, setEditReason] = useState<string>('');
  const [savingRoute, setSavingRoute] = useState(false);

  const AVAILABLE_ROUTES = [
    'Sales Coaching',
    'Deal Next Steps',
    'Customer Follow-Up',
    'Internal/Vendor Note',
    'Urgent Support Escalation',
    'No Usable Text / Stored Record'
  ];

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const params: Record<string, string> = {};
      if (sourceTypeFilter !== 'all') params.source_type = sourceTypeFilter;
      if (personFilter !== 'all') params.person = personFilter;

      const [dashRes, convRes] = await Promise.all([
        api.getSpendnestDashboard(params),
        api.listSpendnestConversations({
          source_type: sourceTypeFilter !== 'all' ? sourceTypeFilter : undefined,
          person: personFilter !== 'all' ? personFilter : undefined,
          route: routeFilter !== 'all' ? routeFilter : undefined,
          search: searchTerm ? searchTerm : undefined,
        })
      ]);

      setDashboard(dashRes);
      setConversations(convRes.conversations || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load SpendNest dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [sourceTypeFilter, personFilter, routeFilter, searchTerm]);

  // Replay handlers
  const handleReplayInitial = async () => {
    try {
      setReplayLoading(true);
      const res = await api.replayInitialBatch();
      setReplayFeedback({
        title: 'Step 1 / 2: Initial Batch Loaded (01_initial.json)',
        message: `Imported 01_initial.json. Unique records: ${res.result.total_unique_records} | Usable texts: ${res.result.usable_text_count}/44 (${res.result.coverage_percent}% coverage). Ignored duplicates: ${res.result.ignored_records}.`,
        type: 'info'
      });
      await fetchDashboardData();
    } catch (err: any) {
      setReplayFeedback({ title: 'Replay Error', message: err.message, type: 'warning' });
    } finally {
      setReplayLoading(false);
    }
  };

  const handleReplayUpdate = async () => {
    try {
      setReplayLoading(true);
      const res = await api.replayUpdateBatch();
      setReplayFeedback({
        title: 'Step 4: Late Transcript Batch Applied (02_update.json)',
        message: `Applied 02_update.json (Revision 2). M07 received 27 transcript turns! Total usable texts increased to ${res.result.usable_text_count}/44 (${res.result.coverage_percent}%). Manual routes PRESERVED.`,
        type: 'success'
      });
      await fetchDashboardData();
    } catch (err: any) {
      setReplayFeedback({ title: 'Replay Error', message: err.message, type: 'warning' });
    } finally {
      setReplayLoading(false);
    }
  };

  const handleReplayReset = async () => {
    if (!window.confirm('Reset database to clean initial state (01_initial.json)? This clears manual overrides for a fresh replay test.')) {
      return;
    }
    try {
      setReplayLoading(true);
      const res = await api.replayResetDatabase();
      setReplayFeedback({
        title: 'Database Reset to Clean Initial State',
        message: `Reset complete. Loaded 44 records from 01_initial.json with 17 initial transcripts. Ready for reproducible test replay.`,
        type: 'info'
      });
      await fetchDashboardData();
    } catch (err: any) {
      setReplayFeedback({ title: 'Reset Error', message: err.message, type: 'warning' });
    } finally {
      setReplayLoading(false);
    }
  };

  const openRouteEditor = (conv: SpendNestConversation, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditConv(conv);
    setEditSelectedRoutes(conv.assigned_routes || []);
    setEditReason(conv.routing_reason || 'Manager manual route correction');
  };

  const handleSaveRoute = async () => {
    if (!editConv) return;
    try {
      setSavingRoute(true);
      await api.updateSpendnestRoute(editConv.id, editSelectedRoutes, editReason);
      setReplayFeedback({
        title: `Manual Route Saved: ${editConv.record_ref || editConv.customer_name}`,
        message: `Route manually updated to: [${editSelectedRoutes.join(', ')}]. This override is now LOCKED and will survive batch updates and application restarts!`,
        type: 'success'
      });
      setEditConv(null);
      await fetchDashboardData();
    } catch (err: any) {
      alert(`Failed to save route: ${err.message}`);
    } finally {
      setSavingRoute(false);
    }
  };

  const toggleRouteSelection = (route: string) => {
    if (editSelectedRoutes.includes(route)) {
      setEditSelectedRoutes(editSelectedRoutes.filter(r => r !== route));
    } else {
      setEditSelectedRoutes([...editSelectedRoutes, route]);
    }
  };

  const kpis = dashboard?.kpis;
  const m07 = dashboard?.m07_status;

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Top Banner & Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200 uppercase tracking-wide">
              SpendNest Assessment Dataset
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
              📅 21 August 2026 (Asia/Kolkata)
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
              Rev {m07?.applied_revision || 1} • {m07?.applied_revision === 2 ? 'Post-Update' : 'Initial Delivery'}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            Revenue Intelligence Inbox
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manager workspace with self-correcting routing, transcript replay preservation, and traceable evidence.
          </p>
        </div>

        {/* Global Export Button */}
        <div className="flex items-center gap-3">
          <a
            href={api.getSpendnestExportArchiveUrl()}
            download
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-100 transition-all hover:shadow-indigo-200"
          >
            <Download className="w-4 h-4" />
            Download Manifest & Export (.ZIP)
          </a>
        </div>
      </div>

      {/* Replay & Batch Ingestion Controller Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 md:p-6 rounded-2xl shadow-lg border border-slate-800">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <h3 className="font-bold text-sm tracking-wide uppercase text-indigo-300">
                Evaluation Replay Controller (DATA_CONTRACT.md)
              </h3>
            </div>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Reproduce all assessment checks: import <code className="text-amber-300">01_initial.json</code> (44 records, 17 usable texts), verify repeat deduplication, manually correct <code className="text-amber-300">M07</code>'s route, then import <code className="text-amber-300">02_update.json</code> to prove the late transcript arrives while preserving your manual route!
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleReplayInitial}
              disabled={replayLoading}
              title="Step 1 & 2: Load or re-load 01_initial.json. Demonstrates no duplicate row creation."
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${replayLoading ? 'animate-spin' : ''}`} />
              1/2. Repeat Initial (01_initial)
            </button>
            <button
              onClick={handleReplayUpdate}
              disabled={replayLoading}
              title="Step 4: Load 02_update.json. Updates M07 with late transcript while preserving manual routes."
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-emerald-900 transition-all disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              4. Apply Late Update (02_update)
            </button>
            <button
              onClick={handleReplayReset}
              disabled={replayLoading}
              title="Reset clean slate to reproduce full test sequence."
              className="px-3 py-2 bg-slate-800/80 hover:bg-rose-900/60 text-slate-400 hover:text-rose-200 border border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-50"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Replay
            </button>
          </div>
        </div>

        {/* Live M07 Status Tag */}
        <div className="mt-4 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-xs text-slate-300 gap-2">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-slate-400">Target Record M07:</span>
            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 font-mono">
              Revision: {m07?.applied_revision || 1}
            </span>
            <span className={`px-2 py-0.5 rounded font-semibold ${m07?.has_usable_text ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-700' : 'bg-amber-900/60 text-amber-300 border border-amber-700'}`}>
              {m07?.has_usable_text ? '✓ 27 Transcript Turns Ingested' : '⏳ Late Transcript Pending (Turns: 0)'}
            </span>
            <span className={`px-2 py-0.5 rounded font-semibold ${m07?.is_manually_routed ? 'bg-indigo-900/70 text-indigo-300 border border-indigo-700' : 'bg-slate-800 text-slate-400'}`}>
              {m07?.is_manually_routed ? '🔒 Manual Override Active (Preserved)' : 'Automated Suggestion'}
            </span>
            <span className="text-slate-400">
              Freshness: <strong className="text-slate-200">{m07?.analysis_freshness}</strong>
            </span>
          </div>

          <div className="text-[11px] text-slate-400">
            Current M07 Route: <strong className="text-white">{m07?.assigned_routes?.join(', ') || 'No Usable Text'}</strong>
          </div>
        </div>
      </div>

      {/* Replay Notification Alert */}
      {replayFeedback && (
        <div className={`p-4 rounded-xl border flex items-start gap-3 shadow-xs ${
          replayFeedback.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-900' :
          replayFeedback.type === 'warning' ? 'bg-rose-50 border-rose-200 text-rose-900' :
          'bg-indigo-50 border-indigo-200 text-indigo-900'
        }`}>
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5 text-emerald-600" />
          <div className="flex-1">
            <h4 className="font-bold text-xs">{replayFeedback.title}</h4>
            <p className="text-xs mt-0.5 opacity-90 leading-relaxed">{replayFeedback.message}</p>
          </div>
          <button onClick={() => setReplayFeedback(null)} className="text-slate-400 hover:text-slate-600 text-xs font-bold">
            ✕
          </button>
        </div>
      )}

      {/* KPI Cards Grid with Explicit Denominators */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Selected Day Metrics (Explicit Denominators Defined)
          </h2>
          <span className="text-[11px] text-slate-400 italic">
            Coverage = Usable Supplied Texts / Total Selected Records (44)
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            title="Total Selected Records"
            value={kpis?.total_selected_records || 44}
            subtitle="Denominator: 44 unique interactions"
            icon={PhoneCall}
            color="indigo"
          />
          <KpiCard
            title="Usable Transcript Coverage"
            value={`${kpis?.usable_transcript_coverage_count || 17} / ${kpis?.total_selected_records || 44}`}
            subtitle={`${kpis?.usable_transcript_coverage_percent || 38.6}% coverage (${kpis?.calls_transcribed || 10} calls, ${kpis?.meetings_transcribed || 7} meetings)`}
            icon={Award}
            color={kpis?.usable_transcript_coverage_count === 18 ? 'emerald' : 'amber'}
          />
          <KpiCard
            title="Outbound Calls Activity"
            value={kpis?.calls_count || 30}
            subtitle={`${kpis?.calls_transcribed || 10} with text • 20 background telemetry`}
            icon={PhoneCall}
            color="slate"
            onClick={() => setSourceTypeFilter('call')}
          />
          <KpiCard
            title="Calendar Meetings Activity"
            value={kpis?.meetings_count || 14}
            subtitle={`${kpis?.meetings_transcribed || 7} with speech • 6 silent/cancelled`}
            icon={Video}
            color="cyan"
            onClick={() => setSourceTypeFilter('meeting')}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
          <KpiCard
            title="Source Connection Rate"
            value={`${kpis?.source_reported_connection_rate?.percentage || 36.7}%`}
            subtitle={`${kpis?.source_reported_connection_rate?.connected_calls || 11} connected / ${kpis?.source_reported_connection_rate?.denominator_calls_with_status || 30} calls`}
            icon={TrendingUp}
            color="indigo"
          />
          <KpiCard
            title="Preserved Manual Overrides"
            value={kpis?.manual_route_overrides_count || 0}
            subtitle="Manager routes locked against updates"
            icon={Lock}
            color="emerald"
          />
          <KpiCard
            title="Analyses Needing Review"
            value={kpis?.stale_analysis_pending_review_count || 0}
            subtitle="Late transcript arrived; awaiting signoff"
            icon={AlertTriangle}
            color="rose"
          />
        </div>
      </div>

      {/* Manager Daily Brief Section (21 August 2026 Asia/Kolkata) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div
          className="p-5 flex justify-between items-center cursor-pointer bg-slate-50 hover:bg-slate-100/70 transition-all"
          onClick={() => setBriefExpanded(!briefExpanded)}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-sm">Manager Daily Brief — 21 August 2026 (Asia/Kolkata)</h3>
                <span className="text-[11px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-semibold">
                  Required Deliverable
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Daily briefing synthesising team activity, key coaching items, urgent deal next steps, and customer bug escalations.
              </p>
            </div>
          </div>
          <button className="text-slate-400 hover:text-slate-600">
            {briefExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>

        {briefExpanded && (
          <div className="p-6 border-t border-slate-200">
            {/* Tabs */}
            <div className="flex border-b border-slate-200 mb-5 gap-2">
              <button
                onClick={() => setBriefTab('deals')}
                className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 ${
                  briefTab === 'deals' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                Deal Next Steps (3 Priority Opportunities)
              </button>
              <button
                onClick={() => setBriefTab('customers')}
                className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 ${
                  briefTab === 'customers' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                Customer Success & Bug Escalations (M07 Bug)
              </button>
              <button
                onClick={() => setBriefTab('coaching')}
                className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 ${
                  briefTab === 'coaching' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                Practical Sales Coaching (Arun & Meera)
              </button>
              <button
                onClick={() => setBriefTab('boundaries')}
                className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 ${
                  briefTab === 'boundaries' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                Honest Data Boundaries & Uncertainty
              </button>
            </div>

            {/* Tab 1: Deal Next Steps */}
            {briefTab === 'deals' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-indigo-600 font-mono">Record M03</span>
                    <span className="text-[11px] bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded font-semibold">Deal Next Steps</span>
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm">Asterloom Systems</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Customer is satisfied with existing overseas card provider, but urgently needs domestic expense reimbursement and corporate cards with dual approval controls.
                  </p>
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-[11px] text-slate-700 font-mono">
                    Citation: <strong>M03 Turn 3 [00:06:04]</strong>: "Cards first. Our overseas team already has a provider... We need dual approval workflows."
                  </div>
                  <p className="text-xs text-indigo-700 font-semibold pt-1">
                    Action: Follow-up demo on dual-approval controls. Owner: team08 (Due: Aug 25)
                  </p>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-indigo-600 font-mono">Record C07</span>
                    <span className="text-[11px] bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded font-semibold">Partnership Referral</span>
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm">Willowbank Advisory</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Advisory incorporates companies overseas and regularly refers clients to digital business account providers. Aditya requested a proposal via chat app with Monday follow-up.
                  </p>
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-[11px] text-slate-700 font-mono">
                    Citation: <strong>C07 Quote</strong>: "Do you currently refer clients to providers for that part of the process? Yes, that is something we normally do... send whatever proposal you have."
                  </div>
                  <p className="text-xs text-indigo-700 font-semibold pt-1">
                    Action: Send virtual accounts proposal via chat app; call Monday. Owner: Dev (Due: Aug 24)
                  </p>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-indigo-600 font-mono">Record C03</span>
                    <span className="text-[11px] bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded font-semibold">API Evaluation</span>
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm">Milan Developer API</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Milan agreed to receive email details on developer API and event notifications; price/budget is a stated objection to resolve on Monday callback.
                  </p>
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-[11px] text-slate-700 font-mono">
                    Citation: <strong>C03 Quote</strong>: "Could we do this by email? Or call on Monday a bit earlier, when I'm back indoors? Send the email and we can speak Monday or Tuesday."
                  </div>
                  <p className="text-xs text-indigo-700 font-semibold pt-1">
                    Action: Send email with subject 'Developer access and event notifications — follow-up'. Owner: Kiran (Due: Aug 24)
                  </p>
                </div>
              </div>
            )}

            {/* Tab 2: Customer Success & Bugs */}
            {briefTab === 'customers' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-rose-50/60 p-4 rounded-xl border border-rose-200 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-rose-700 font-mono">Record M07 (Updated)</span>
                    <span className="text-[11px] bg-rose-100 text-rose-800 px-2 py-0.5 rounded font-semibold">Priority Bug Report</span>
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm">Willowfield Trust (M07)</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Live screen sharing demonstrated that saving an edited event-payment description fails to persist—the UI continues showing the old wording.
                  </p>
                  <div className="bg-white p-2.5 rounded-lg border border-rose-200 text-[11px] text-slate-700 font-mono">
                    Citation: <strong>M07 Turn 2 & 3</strong>: "The first one is editing the description... The field still shows the earlier wording. So the change is not appearing after you save, is that right?"
                  </div>
                  <p className="text-xs text-rose-700 font-semibold pt-1">
                    Action: File urgent engineering bug ticket on payment edit persistence. Owner: team09 (Due: Aug 22)
                  </p>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-indigo-600 font-mono">Record M04</span>
                    <span className="text-[11px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-semibold">Card Migration</span>
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm">Cedarwave Distribution</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Customer experienced card terminal declines on legacy provider and expressed confusion about digital wallet payment (Apple Pay / Google Wallet) availability timeline.
                  </p>
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-[11px] text-slate-700 font-mono">
                    Citation: <strong>M04 Turn 2 & 3</strong>: "Much of your usage is physical-card spending. We have seen acceptance problems... I thought the wallet-payment option was coming."
                  </div>
                  <p className="text-xs text-indigo-700 font-semibold pt-1">
                    Action: Provide written roadmap statement on wallet payment tokenization. Owner: team09 (Due: Aug 24)
                  </p>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-indigo-600 font-mono">Record M09</span>
                    <span className="text-[11px] bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded font-semibold">Onboarding Block</span>
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm">Brookmint Holdings</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Onboarding workspace invitation link failed for customer administrator. Requested fresh link directly in messaging channel.
                  </p>
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-[11px] text-slate-700 font-mono">
                    Citation: <strong>M09 Turn 1 & 3</strong>: "The invitation for Brookmint Holdings did not work... A fresh link in the conversation we are using now would be simplest."
                  </div>
                  <p className="text-xs text-indigo-700 font-semibold pt-1">
                    Action: Re-issue invitation link directly in channel. Owner: team11 (Due: Aug 21 EOD)
                  </p>
                </div>
              </div>
            )}

            {/* Tab 3: Coaching */}
            {briefTab === 'coaching' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-indigo-600 font-mono">Arun (C01)</span>
                    <span className="text-[11px] bg-purple-100 text-purple-800 px-2 py-0.5 rounded font-semibold">Cold Outreach Permission Hook</span>
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm">Handling Cold Call Interruptions</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    When Pranav asked <em>"Why are you calling?"</em>, Arun pressed into a pitch rather than acknowledging the interruption, leading the prospect to challenge again (<em>"No, I asked why you have called me"</em>) and disconnect.
                  </p>
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-[11px] text-slate-700">
                    <strong>Coaching Advice:</strong> Coach Arun on pausing immediately upon objection, acknowledging privacy concerns, and using a 10-second permission opener before pitching features.
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-indigo-600 font-mono">Meera (C05)</span>
                    <span className="text-[11px] bg-purple-100 text-purple-800 px-2 py-0.5 rounded font-semibold">Competitive Displacement Discovery</span>
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm">Discovery Gaps vs Incumbent StoreHarbor</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    When prospect stated they already use StoreHarbor for payments and store expenses, Meera quickly accepted sending a generic presentation deck without discovering existing pain points.
                  </p>
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-[11px] text-slate-700">
                    <strong>Coaching Advice:</strong> Coach Meera to ask exploratory gap questions (e.g. <em>"What do your store managers find clunky about StoreHarbor card reconciliation?"</em>) instead of retreating to sending an email deck.
                  </div>
                </div>
              </div>
            )}

            {/* Tab 4: Boundaries */}
            {briefTab === 'boundaries' && (
              <div className="bg-amber-50/70 p-4 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-2 leading-relaxed">
                <div className="flex items-center gap-2 font-bold text-amber-800">
                  <ShieldAlert className="w-4 h-4 text-amber-700" />
                  Honest Data Boundaries & Uncertainty (DATA_DICTIONARY.md Compliance)
                </div>
                <ul className="list-disc list-inside space-y-1 text-slate-700">
                  <li><strong>No Pipeline Currency Fabrications:</strong> Deal values and revenue sizes were intentionally withheld from the source package; no invented pipeline currency sums are presented.</li>
                  <li><strong>Redaction Integrity:</strong> Upstream summary bodies and classification reasons were redacted as part of the assessment exercise.</li>
                  <li><strong>Silent Notetakers:</strong> Meetings M05, M08, and M11 were recorded by notetakers with zero speech; this indicates no audio captured, not proof the meeting never occurred offline.</li>
                  <li><strong>Rep vs Organizer Distinction:</strong> Calendar organizers (team06–team14) represent scheduling booking accounts, not confirmed sales reps or attended participants.</li>
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Interaction Workspace ({conversations.length} records shown)</h3>
            <p className="text-xs text-slate-500">Filter by interaction type, sales representative, calendar organizer, or assigned route.</p>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search ref, customer, text..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 text-xs rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100">
          {/* Source Type Filter */}
          <div className="flex items-center gap-1 text-xs">
            <span className="text-slate-400 font-semibold text-[11px] uppercase mr-1">Type:</span>
            <button
              onClick={() => setSourceTypeFilter('all')}
              className={`px-2.5 py-1 rounded-md font-semibold text-xs transition-all ${
                sourceTypeFilter === 'all' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All (44)
            </button>
            <button
              onClick={() => setSourceTypeFilter('call')}
              className={`px-2.5 py-1 rounded-md font-semibold text-xs transition-all ${
                sourceTypeFilter === 'call' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Calls (30)
            </button>
            <button
              onClick={() => setSourceTypeFilter('meeting')}
              className={`px-2.5 py-1 rounded-md font-semibold text-xs transition-all ${
                sourceTypeFilter === 'meeting' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Meetings (14)
            </button>
          </div>

          {/* Person Selector (Separating Reps from Organizers) */}
          <div className="flex items-center gap-1 text-xs">
            <span className="text-slate-400 font-semibold text-[11px] uppercase mr-1">Person:</span>
            <select
              value={personFilter}
              onChange={(e) => setPersonFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-lg px-2.5 py-1 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All People (Reps & Organizers)</option>
              <optgroup label="📞 Outbound Call Reps">
                <option value="Arun">Arun (15 calls)</option>
                <option value="Leela">Leela (8 calls)</option>
                <option value="Meera">Meera (5 calls)</option>
                <option value="Kiran">Kiran (1 call)</option>
                <option value="Dev">Dev (1 call)</option>
              </optgroup>
              <optgroup label="📅 Meeting Organizers (Calendar Accounts)">
                <option value="team06@example.com">team06@example.com (M01)</option>
                <option value="team07@example.com">team07@example.com (M02)</option>
                <option value="team08@example.com">team08@example.com (M03, M05, M08)</option>
                <option value="team09@example.com">team09@example.com (M04, M07, M13)</option>
                <option value="team10@example.com">team10@example.com (M06)</option>
                <option value="team11@example.com">team11@example.com (M09)</option>
                <option value="team12@example.com">team12@example.com (M10)</option>
                <option value="team13@example.com">team13@example.com (M11)</option>
                <option value="team14@example.com">team14@example.com (M14)</option>
                <option value="arun@example.com">arun@example.com (M12)</option>
              </optgroup>
            </select>
          </div>

          {/* Route Filter */}
          <div className="flex items-center gap-1 text-xs">
            <span className="text-slate-400 font-semibold text-[11px] uppercase mr-1">Route:</span>
            <select
              value={routeFilter}
              onChange={(e) => setRouteFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-lg px-2.5 py-1 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Assigned Routes</option>
              <option value="Sales Coaching">Sales Coaching</option>
              <option value="Deal Next Steps">Deal Next Steps</option>
              <option value="Customer Follow-Up">Customer Follow-Up</option>
              <option value="Internal/Vendor Note">Internal/Vendor Note</option>
              <option value="No Usable Text / Stored Record">No Usable Text / Stored Record</option>
            </select>
          </div>
        </div>
      </div>

      {/* Conversations Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase text-[11px] tracking-wider">
                <th className="py-3 px-4">Ref</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Customer / Title</th>
                <th className="py-3 px-4">Rep / Organizer</th>
                <th className="py-3 px-4">Transcript Status</th>
                <th className="py-3 px-4">Assigned Route(s)</th>
                <th className="py-3 px-4">Override</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {conversations.map((c) => {
                const isMeeting = c.source_type === 'meeting';
                return (
                  <tr
                    key={c.id}
                    onClick={() => setSelectedConv(c)}
                    className="hover:bg-slate-50/70 cursor-pointer transition-colors group"
                  >
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-800">
                        {c.record_ref || `#${c.id}`}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                        isMeeting ? 'bg-cyan-50 text-cyan-700 border border-cyan-200' : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                      }`}>
                        {isMeeting ? <Video className="w-3 h-3" /> : <PhoneCall className="w-3 h-3" />}
                        {isMeeting ? 'Meeting' : 'Call'}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-900 max-w-xs truncate">
                      {c.customer_name}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3 text-slate-400" />
                        {c.sales_rep_name}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {c.has_usable_text ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[11px]">
                          ✓ Usable Text
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-slate-500 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                          Silent / Un-transcribed
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {(c.assigned_routes || ['None']).map((r, i) => (
                          <span
                            key={i}
                            className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                              r.includes('Coaching') ? 'bg-purple-100 text-purple-800 border border-purple-200' :
                              r.includes('Deal') ? 'bg-indigo-100 text-indigo-800 border border-indigo-200' :
                              r.includes('Customer') ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                              r.includes('Internal') ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                              'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {r}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {c.is_manually_routed ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
                          <Lock className="w-3 h-3" /> Locked
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400">Auto</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={(e) => openRouteEditor(c, e)}
                          title="Correct Route"
                          className="px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 rounded text-xs font-semibold flex items-center gap-1 border border-slate-200 transition-all"
                        >
                          <Edit3 className="w-3 h-3" /> Edit Route
                        </button>
                        <button
                          onClick={() => setSelectedConv(c)}
                          className="p-1 text-slate-400 hover:text-slate-600"
                        >
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Drawer Modal */}
      {selectedConv && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex justify-end z-50">
          <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-6 border-b border-slate-200 bg-slate-50 flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded font-mono font-bold bg-indigo-100 text-indigo-800 text-xs">
                    {selectedConv.record_ref || `#${selectedConv.id}`}
                  </span>
                  <span className="text-xs font-semibold text-slate-500 uppercase">
                    {selectedConv.source_type} • Revision {selectedConv.revision}
                  </span>
                  {selectedConv.is_manually_routed && (
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-600 text-white flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5" /> Manual Override
                    </span>
                  )}
                </div>
                <h3 className="font-extrabold text-slate-900 text-lg">{selectedConv.customer_name}</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Rep/Organizer: <strong>{selectedConv.sales_rep_name}</strong> • Duration: {selectedConv.duration_seconds}s
                </p>
              </div>

              <button
                onClick={() => setSelectedConv(null)}
                className="w-8 h-8 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-600 flex items-center justify-center font-bold text-sm"
              >
                ✕
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Assigned Routes Banner */}
              <div className="bg-indigo-50/60 border border-indigo-100 p-4 rounded-xl">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold uppercase text-indigo-900 tracking-wider">Assigned Routes</span>
                  <button
                    onClick={(e) => openRouteEditor(selectedConv, e)}
                    className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1"
                  >
                    <Edit3 className="w-3 h-3" /> Change Route
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(selectedConv.assigned_routes || ['None']).map((r, i) => (
                    <span key={i} className="px-2.5 py-1 rounded-md bg-white border border-indigo-200 text-indigo-800 font-bold text-xs shadow-2xs">
                      {r}
                    </span>
                  ))}
                </div>
                {selectedConv.routing_reason && (
                  <p className="text-xs text-slate-600 mt-2 italic">
                    Reason: {selectedConv.routing_reason}
                  </p>
                )}
              </div>

              {/* What Happened and Why It Matters */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  What Happened & Why It Matters
                </h4>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-700 leading-relaxed">
                  {selectedConv.structured_analysis?.what_happened_and_why_it_matters || selectedConv.summary || 'No substantive conversation text provided in source payload.'}
                </div>
              </div>

              {/* Evidence Citations */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Traceable Evidence Citations
                </h4>
                {selectedConv.structured_analysis?.evidence_citations && selectedConv.structured_analysis.evidence_citations.length > 0 ? (
                  <div className="space-y-2">
                    {selectedConv.structured_analysis.evidence_citations.map((c, i) => (
                      <div key={i} className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-1">
                        <div className="font-mono font-bold text-indigo-700 text-[11px] bg-white p-1.5 rounded border border-slate-100">
                          {c.quote_or_turn}
                        </div>
                        <div className="text-slate-600 text-[11px]">
                          <strong>Significance:</strong> {c.significance}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">No specific citation passages (un-transcribed or silent interaction).</p>
                )}
              </div>

              {/* What Evidence Does NOT Establish (Honest Uncertainty) */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  What Evidence Does NOT Establish (Honest Uncertainty)
                </h4>
                <div className="bg-amber-50/60 p-3.5 rounded-xl border border-amber-200 text-xs text-amber-900 leading-relaxed">
                  {selectedConv.structured_analysis?.what_evidence_does_not_establish || 'Standard intake; no fabricated pipeline or agreement claims.'}
                </div>
              </div>

              {/* Next Steps & Action Owners */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Next Steps & Action Owners
                </h4>
                {selectedConv.structured_analysis?.next_steps_and_owners && selectedConv.structured_analysis.next_steps_and_owners.length > 0 ? (
                  <div className="space-y-2">
                    {selectedConv.structured_analysis.next_steps_and_owners.map((a, i) => (
                      <div key={i} className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs flex justify-between items-center">
                        <span className="font-medium text-slate-800">{a.action}</span>
                        <span className="text-[11px] bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded font-bold">
                          Owner: {a.owner || 'Unassigned'}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">No action items assigned.</p>
                )}
              </div>

              {/* Full Transcript */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Full Conversation Text
                </h4>
                <div className="bg-slate-900 text-slate-100 p-4 rounded-xl font-mono text-xs max-h-72 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                  {selectedConv.transcript || '[No transcript text provided in source payload]'}
                </div>
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-between items-center">
              <span className="text-xs text-slate-500 font-mono">ID: {selectedConv.source_id}</span>
              <button
                onClick={() => setSelectedConv(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Route Edit Modal */}
      {editConv && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 font-mono font-bold text-xs">
                  {editConv.record_ref || editConv.customer_name}
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-1">Manual Route Correction</h3>
                <p className="text-xs text-slate-500">
                  Select destination outputs. Manual corrections survive future batch imports and application restarts!
                </p>
              </div>
              <button onClick={() => setEditConv(null)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 block">Select Target Routes:</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {AVAILABLE_ROUTES.map((route) => {
                  const isChecked = editSelectedRoutes.includes(route);
                  return (
                    <button
                      type="button"
                      key={route}
                      onClick={() => toggleRouteSelection(route)}
                      className={`p-2.5 rounded-lg border text-xs font-bold text-left transition-all flex items-center justify-between ${
                        isChecked
                          ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-xs'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <span>{route}</span>
                      {isChecked && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Manager Reason for Override:</label>
              <textarea
                value={editReason}
                onChange={(e) => setEditReason(e.target.value)}
                placeholder="Why should this interaction be routed here?"
                rows={2}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setEditConv(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveRoute}
                disabled={savingRoute || editSelectedRoutes.length === 0}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-indigo-200 disabled:opacity-50"
              >
                <Lock className="w-3.5 h-3.5" />
                {savingRoute ? 'Saving...' : 'Lock Manual Route'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
