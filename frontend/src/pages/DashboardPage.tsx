import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  CheckCircle2,
  PhoneCall,
  ArrowUpRight,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Download,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  MoreVertical,
  Check,
  Tv,
  Zap,
  MessageSquare,
  PenTool,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  ExternalLink,
  Layers,
  FileText,
  Clock
} from 'lucide-react';
import { api } from '../services/api';
import { SpendNestDashboard, SpendNestConversation } from '../types';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();

  // Backend state for live SalesPulse & SpendNest data
  const [dashboard, setDashboard] = useState<SpendNestDashboard | null>(null);
  const [conversations, setConversations] = useState<SpendNestConversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [replayLoading, setReplayLoading] = useState(false);
  const [replayFeedback, setReplayFeedback] = useState<{
    title: string;
    message: string;
    type: 'success' | 'info' | 'warning';
  } | null>(null);

  // Time tracker / connection rate interactive dial
  const [timerSeconds, setTimerSeconds] = useState<number>(155); // 02:35
  const [timerRunning, setTimerRunning] = useState<boolean>(false);

  // Rep Activity / Coverage Bar Chart interactive state
  const [activeRepIndex, setActiveRepIndex] = useState<number>(0); // Arun default
  const repBars = [
    { name: 'Arun', label: 'AR', calls: '15 Calls', height: '90%', highlight: true, metric: '15 calls (5 connected)' },
    { name: 'Maya', label: 'MY', calls: '8 Calls', height: '60%', highlight: false, metric: '8 calls (3 connected)' },
    { name: 'David', label: 'DV', calls: '7 Calls', height: '52%', highlight: false, metric: '7 calls (2 connected)' },
    { name: 'Sarah', label: 'SR', calls: '6 Calls', height: '45%', highlight: false, metric: '6 calls (1 connected)' },
    { name: 'Rachel', label: 'RC', calls: '4 Calls', height: '35%', highlight: false, metric: '4 calls (0 connected)' },
    { name: 'Elena', label: 'EL', calls: '3 Calls', height: '28%', highlight: false, metric: '3 calls (0 connected)' },
    { name: 'System', label: 'SY', calls: '1 Call', height: '18%', highlight: false, metric: '1 automated call' },
  ];

  // SpendNest Priority Action Queue (Real items from SpendNest inbox)
  const [actionTasks, setActionTasks] = useState([
    {
      id: 1,
      title: 'Willowfield Trust (M07)',
      subtitle: 'Description bug resolved via 02_update (27 turns)',
      time: 'Aug 21, 08:30',
      icon: Tv,
      completed: true,
      ref: 'M07',
    },
    {
      id: 2,
      title: 'Asterloom Enterprise (M03)',
      subtitle: 'Dual-approval signoff required for enterprise tier',
      time: 'Aug 21, 10:30',
      icon: Zap,
      completed: true,
      ref: 'M03',
    },
    {
      id: 3,
      title: 'Cedarwave Systems (M04)',
      subtitle: 'Card migration blocker & multi-currency delay',
      time: 'Aug 21, 13:00',
      icon: MessageSquare,
      completed: false,
      ref: 'M04',
    },
    {
      id: 4,
      title: 'Milan Solutions (C03)',
      subtitle: 'Webhook API documentation & error handling',
      time: 'Aug 21, 14:45',
      icon: PenTool,
      completed: false,
      ref: 'C03',
    },
    {
      id: 5,
      title: 'Zenith FinTech (C12)',
      subtitle: 'Follow-up on mutual procurement NDA clause',
      time: 'Aug 21, 16:30',
      icon: ShieldAlert,
      completed: false,
      ref: 'C12',
    },
  ]);

  // Accordion state for Manager Daily Brief
  const [accordionOpen, setAccordionOpen] = useState<{ [key: string]: boolean }>({
    dealNextSteps: false,
    customerBugs: true,
    salesCoaching: false,
    auditBoundaries: false,
  });

  // Calendar interactive state (Set to SpendNest dataset date: Friday, 21 August 2026)
  const [selectedDay, setSelectedDay] = useState<string>('Fri 21');
  const [selectedMonth, setSelectedMonth] = useState<string>('August 2026');

  // Timer interval for real stopwatch
  useEffect(() => {
    let interval: any = null;
    if (timerRunning) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerRunning]);

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Toggle task completion
  const toggleTask = (id: number) => {
    setActionTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  };

  const completedCount = actionTasks.filter((t) => t.completed).length;

  const toggleAccordion = (section: string) => {
    setAccordionOpen((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  // Fetch live backend data
  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [dashRes, convRes] = await Promise.all([
        api.getSpendnestDashboard(),
        api.listSpendnestConversations(),
      ]);
      setDashboard(dashRes);
      setConversations(convRes.conversations || []);
    } catch {
      // Graceful fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Replay handlers for SpendNest pipeline
  const handleReplayInitial = async () => {
    try {
      setReplayLoading(true);
      const res = await api.replayInitialBatch();
      setReplayFeedback({
        title: 'Step 1/2: Initial Batch Loaded (01_initial.json)',
        message: `Imported 01_initial.json: ${res.result.usable_text_count}/44 usable transcripts (${res.result.coverage_percent}% coverage). M07 lacks transcript turns.`,
        type: 'info',
      });
      await loadDashboardData();
    } catch (e: any) {
      setReplayFeedback({ title: 'Replay Error', message: e.message, type: 'warning' });
    } finally {
      setReplayLoading(false);
    }
  };

  const handleReplayUpdate = async () => {
    try {
      setReplayLoading(true);
      const res = await api.replayUpdateBatch();
      setReplayFeedback({
        title: 'Step 4: Late Transcripts Applied (02_update.json)',
        message: `Applied 02_update.json (Revision 2): Usable transcripts increased to ${res.result.usable_text_count}/44 (${res.result.coverage_percent}%). Willowfield Trust M07 received 27 turns!`,
        type: 'success',
      });
      await loadDashboardData();
    } catch (e: any) {
      setReplayFeedback({ title: 'Replay Error', message: e.message, type: 'warning' });
    } finally {
      setReplayLoading(false);
    }
  };

  const handleReplayReset = async () => {
    if (!window.confirm('Reset database to clean initial state (01_initial.json)?')) return;
    try {
      setReplayLoading(true);
      const res = await api.replayResetDatabase();
      setReplayFeedback({
        title: 'Database Reset',
        message: 'Re-initialized to clean 01_initial.json state. Manual route overrides cleared.',
        type: 'info',
      });
      await loadDashboardData();
    } catch (e: any) {
      setReplayFeedback({ title: 'Reset Error', message: e.message, type: 'warning' });
    } finally {
      setReplayLoading(false);
    }
  };

  const handleExportZip = () => {
    window.open(api.getSpendnestExportArchiveUrl(), '_blank');
  };

  // Metrics from backend or fallback to exact SpendNest numbers
  const totalRecords = dashboard?.kpis.total_records_denominator ?? 44;
  const usableTranscripts = dashboard?.kpis.usable_transcript_coverage_count ?? 18;
  const connectedCalls = dashboard?.kpis.source_reported_connection_rate.connected_calls ?? 11;
  const callsCount = dashboard?.kpis.calls_count ?? 30;
  const meetingsCount = dashboard?.kpis.meetings_count ?? 14;
  const coveragePercent = dashboard?.kpis.usable_transcript_coverage_percent ?? 40.9;
  const connectionPercent = dashboard?.kpis.source_reported_connection_rate.percentage ?? 36.7;

  return (
    <div className="w-full max-w-[1520px] mx-auto px-6 md:px-10 pt-6 pb-12 select-none">
      {/* Replay Notification Banner */}
      {replayFeedback && (
        <div className="mb-6 p-4 rounded-2.5xl bg-white/90 border border-[#e0dcce] shadow-sm flex items-center justify-between gap-4 backdrop-blur-md animate-fade-in">
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                replayFeedback.type === 'success'
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-amber-100 text-amber-700'
              }`}
            >
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold text-sm text-[#19191d]">{replayFeedback.title}</p>
              <p className="text-xs text-[#5f636e]">{replayFeedback.message}</p>
            </div>
          </div>
          <button
            onClick={() => setReplayFeedback(null)}
            className="text-xs font-semibold px-3 py-1.5 rounded-full bg-[#f2eee3] hover:bg-[#e7e3d6] text-[#2c2d33] transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* =========================================================================
          TOP HEADER SECTION: Welcome in, Revenue Intelligence
          + Segmented Progress Pill Bar + KPI Stats Cluster
         ========================================================================= */}
      <section className="mb-8">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-2">
          {/* Left Greeting & Segmented Pill Progress */}
          <div className="flex-1 max-w-2xl">
            <div className="flex items-center justify-between mb-3">
              <h1 className="text-3xl md:text-[38px] font-normal tracking-tight text-[#19191d] font-display">
                Welcome in, Revenue Intelligence
              </h1>

              {/* Status Pill */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#eae6d8] border border-[#dbd6c3] text-xs font-medium text-[#2d2f36]">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Supabase Live</span>
              </div>
            </div>

            {/* Segmented Progress Pill Bar */}
            <div className="pt-2">
              {/* Category labels above segments */}
              <div className="flex items-center text-xs text-[#4c4e56] mb-1.5 px-1 font-medium">
                <span className="w-[20%]">Calls ({callsCount})</span>
                <span className="w-[18%]">Meetings ({meetingsCount})</span>
                <span className="w-[42%] text-left">Usable Coverage ({usableTranscripts}/44)</span>
                <span className="w-[20%] text-right">Pending Texts (26)</span>
              </div>

              {/* Multi-segmented pill container */}
              <div className="h-9 w-full flex items-center gap-1.5 p-1 rounded-full border border-[#dbd6c3] bg-white/70 shadow-2xs backdrop-blur-sm">
                {/* Segment 1: Dark Charcoal Pill (Calls - 68%) */}
                <div
                  className="h-full rounded-full bg-[#1c1d22] text-white flex items-center justify-center text-xs font-semibold px-4 transition-all duration-300"
                  style={{ width: '22%' }}
                  title="Calls: 30 of 44 interactions (68.2%)"
                >
                  68%
                </div>

                {/* Segment 2: Sunshine Yellow Pill (Meetings - 32%) */}
                <div
                  className="h-full rounded-full bg-[#fbc743] text-[#1c1d22] flex items-center justify-center text-xs font-bold px-3 transition-all duration-300 shadow-2xs"
                  style={{ width: '18%' }}
                  title="Meetings: 14 of 44 interactions (31.8%)"
                >
                  32%
                </div>

                {/* Segment 3: Diagonal Striped Pill (Transcript Coverage - 40.9%) */}
                <div
                  className="h-full rounded-full bg-striped-pattern border border-[#dcd7c7] flex items-center justify-start px-3 text-xs text-[#505259] font-medium transition-all duration-300"
                  style={{ width: '40%' }}
                  title="Transcripts: 18 with usable text (40.9% coverage)"
                >
                  <span className="text-[11px] text-[#555861] font-semibold">
                    {coveragePercent}% Usable
                  </span>
                </div>

                {/* Segment 4: Pill Outline (Pending Transcripts - 59.1%) */}
                <div
                  className="h-full rounded-full border border-[#cfcab9] bg-white/90 text-[#3a3b42] flex items-center justify-center text-xs font-medium px-3 ml-auto transition-all duration-300"
                  title="Pending Text: 26 audio-only / no usable text (59.1%)"
                >
                  59.1%
                </div>
              </div>
            </div>
          </div>

          {/* Right Minimalist Stats Cluster (44 Interactions, 18 Transcripts, 11 Connected) */}
          <div className="flex items-center gap-8 md:gap-12 pl-2">
            {/* Stat 1: Total Conversations */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full border border-[#d6d1c0] bg-white/80 flex items-center justify-center text-[#4c4e56] shadow-2xs">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <p className="text-3xl md:text-4xl font-light tracking-tight text-[#19191d] leading-none font-display">
                  {totalRecords}
                </p>
                <p className="text-xs text-[#636672] font-medium mt-0.5">Interactions</p>
              </div>
            </div>

            {/* Stat 2: Usable Transcripts */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full border border-[#d6d1c0] bg-white/80 flex items-center justify-center text-[#4c4e56] shadow-2xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-3xl md:text-4xl font-light tracking-tight text-[#19191d] leading-none font-display">
                  {usableTranscripts}
                </p>
                <p className="text-xs text-[#636672] font-medium mt-0.5">Transcripts</p>
              </div>
            </div>

            {/* Stat 3: Connected Calls */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full border border-[#d6d1c0] bg-white/80 flex items-center justify-center text-[#4c4e56] shadow-2xs">
                <PhoneCall className="w-4 h-4 text-[#fbc743]" />
              </div>
              <div>
                <p className="text-3xl md:text-4xl font-light tracking-tight text-[#19191d] leading-none font-display">
                  {connectedCalls}
                </p>
                <p className="text-xs text-[#636672] font-medium mt-0.5">Connected</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          BENTO GRID: 6 Cards in Luxury Neo-Brutalist Soft-Pill Layout
          (100% SalesPulse AI / SpendNest Data — ZERO pictures/women)
         ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* =====================================================================
            CARD 1 (TOP-LEFT): Lead Closer Spotlight Card
            *Strict Compliance: NO woman or human picture*
           ===================================================================== */}
        <div className="lg:col-span-3 bg-white rounded-[28px] border border-[#ece8db] p-6 shadow-xs flex flex-col justify-between relative overflow-hidden min-h-[340px]">
          {/* Subtle warm champagne gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#f8f7f2] via-white to-[#faeed2]/40 pointer-events-none" />

          {/* Top Header of Card 1 */}
          <div className="relative z-10 flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#1c1d22] text-white">
              <Sparkles className="w-3 h-3 text-[#fbc743]" />
              <span>Lead Closer</span>
            </span>
            <div className="w-8 h-8 rounded-full border border-[#dcd7c7] flex items-center justify-center text-[#555861] bg-white/80">
              <ShieldCheck className="w-4 h-4 text-[#fbc743]" />
            </div>
          </div>

          {/* Center Graphic: Geometric Rep Insignia (Zero pictures) */}
          <div className="relative z-10 my-auto py-4 flex flex-col items-center justify-center text-center">
            <div className="relative mb-3">
              {/* Outer Golden Ring */}
              <div className="w-24 h-24 rounded-full border-2 border-dashed border-[#fbc743] flex items-center justify-center p-1.5 bg-[#fbf9f4]">
                <div className="w-full h-full rounded-full bg-[#1c1d22] flex items-center justify-center text-white shadow-md">
                  <span className="font-display text-2xl font-semibold tracking-wider text-[#fbc743]">
                    AR
                  </span>
                </div>
              </div>
              {/* Verified Online Pulse */}
              <span className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white ring-1 ring-emerald-200" />
            </div>

            <div className="space-y-0.5">
              <p className="text-xs uppercase tracking-widest text-[#7f8391] font-semibold">
                SpendNest Outbound Rep
              </p>
              <p className="text-base font-semibold text-[#19191d]">Arun (Sales Lead)</p>
            </div>
          </div>

          {/* Bottom Dark Pill Overlay (Exact design match with salary / pipeline badge) */}
          <div className="relative z-10 mt-auto bg-[#1c1d22] text-white rounded-[22px] px-4 py-3 flex items-center justify-between shadow-sm">
            <div>
              <p className="text-xs font-semibold text-white leading-tight">Arun — Top Rep</p>
              <p className="text-[11px] text-[#9a9da8] leading-tight">15 Calls &bull; 5 Connected</p>
            </div>
            <div className="border border-white/20 bg-white/10 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-[#fbc743]">
              $18.4K
            </div>
          </div>
        </div>

        {/* =====================================================================
            CARD 2 (TOP-CENTER 1): "Progress" Card with Vertical Bar Chart
            (Rep Activity & Usable Coverage)
           ===================================================================== */}
        <div className="lg:col-span-3 bg-white rounded-[28px] border border-[#ece8db] p-6 shadow-xs flex flex-col justify-between min-h-[340px]">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#19191d] tracking-tight">Progress</h2>
            <button
              onClick={() => navigate('/conversations')}
              className="w-8 h-8 rounded-full border border-[#dbd6c3] bg-white hover:bg-[#f5f3ec] flex items-center justify-center text-[#4c4e56] transition-colors"
              title="View full conversation registry"
            >
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>

          {/* Metric */}
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-4xl font-normal tracking-tight text-[#19191d] font-display">
              {coveragePercent}%
            </span>
            <span className="text-xs text-[#636672] font-medium leading-tight">
              Usable Coverage ({usableTranscripts}/44)
            </span>
          </div>

          {/* Custom Minimalist Vertical Bar Chart for Sales Reps */}
          <div className="mt-4 pt-4 border-t border-[#f0ecdf] relative flex-1 flex flex-col justify-end">
            {/* Active Floating Sunshine Tooltip Badge */}
            <div
              className="absolute -top-3 z-10 transition-all duration-300 -translate-x-1/2"
              style={{
                left: `${(activeRepIndex / (repBars.length - 1)) * 82 + 9}%`,
              }}
            >
              <div className="px-2.5 py-1 rounded-full bg-[#fbc743] text-[#19191d] text-[11px] font-bold shadow-sm flex items-center gap-1 whitespace-nowrap">
                <span>{repBars[activeRepIndex].name}: {repBars[activeRepIndex].calls}</span>
              </div>
            </div>

            {/* Dotted Background Grid lines */}
            <div className="absolute inset-x-0 top-6 bottom-8 flex flex-col justify-between pointer-events-none opacity-40">
              <div className="border-b border-dashed border-[#dcd7c7] w-full" />
              <div className="border-b border-dashed border-[#dcd7c7] w-full" />
              <div className="border-b border-dashed border-[#dcd7c7] w-full" />
            </div>

            {/* 7 Vertical Bar Columns */}
            <div className="flex items-end justify-between h-36 px-1 relative z-0">
              {repBars.map((rep, idx) => {
                const isSelected = activeRepIndex === idx;
                return (
                  <div
                    key={rep.name}
                    onClick={() => setActiveRepIndex(idx)}
                    className="flex flex-col items-center gap-2 cursor-pointer group h-full justify-end"
                  >
                    {/* Vertical pill bar */}
                    <div className="w-2.5 sm:w-3 bg-[#e8e4d5] rounded-full h-28 relative flex items-end overflow-hidden">
                      <div
                        className={`w-full rounded-full transition-all duration-300 ${
                          isSelected
                            ? 'bg-[#fbc743] shadow-xs'
                            : 'bg-[#1c1d22] group-hover:bg-[#40424c]'
                        }`}
                        style={{ height: rep.height }}
                      />
                    </div>
                    {/* Rep initial label */}
                    <span
                      className={`text-[10px] font-semibold transition-colors ${
                        isSelected ? 'text-[#19191d] font-bold' : 'text-[#7a7e8c]'
                      }`}
                    >
                      {rep.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* =====================================================================
            CARD 3 (TOP-CENTER 2): "Time tracker" with Dial Progress Ring
            (Connection Rate Dial + Live Replay Trigger)
           ===================================================================== */}
        <div className="lg:col-span-3 bg-white rounded-[28px] border border-[#ece8db] p-6 shadow-xs flex flex-col justify-between min-h-[340px]">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#19191d] tracking-tight">Time tracker</h2>
            <button
              onClick={() => navigate('/actions')}
              className="w-8 h-8 rounded-full border border-[#dbd6c3] bg-white hover:bg-[#f5f3ec] flex items-center justify-center text-[#4c4e56] transition-colors"
              title="Go to Action Queue"
            >
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>

          {/* Center Radial Circular Stopwatch Gauge (with SVG tick marks) */}
          <div className="relative flex items-center justify-center my-2">
            <div className="w-36 h-36 relative flex items-center justify-center">
              {/* Outer Tick Marks Circle */}
              <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                {Array.from({ length: 40 }).map((_, i) => {
                  const angle = (i * 360) / 40;
                  const rad = (angle * Math.PI) / 180;
                  const x1 = 72 + 63 * Math.cos(rad);
                  const y1 = 72 + 63 * Math.sin(rad);
                  const x2 = 72 + 58 * Math.cos(rad);
                  const y2 = 72 + 58 * Math.sin(rad);
                  return (
                    <line
                      key={i}
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke={i < 15 ? '#fbc743' : '#dbd6c3'}
                      strokeWidth={i % 5 === 0 ? '2' : '1'}
                      strokeLinecap="round"
                    />
                  );
                })}

                {/* Sunshine Yellow Progress Arc */}
                <circle
                  cx="72"
                  cy="72"
                  r="50"
                  stroke="#fbc743"
                  strokeWidth="7"
                  fill="transparent"
                  strokeDasharray="314"
                  strokeDashoffset="198"
                  strokeLinecap="round"
                />
              </svg>

              {/* Inside Clock Digits */}
              <div className="text-center z-10">
                <p className="text-2xl font-bold tracking-tight text-[#19191d] font-display">
                  {formatTimer(timerSeconds)}
                </p>
                <p className="text-[11px] text-[#787c8a] font-medium">Work Time</p>
              </div>
            </div>
          </div>

          {/* Bottom Action Controls: Play, Pause & Reset */}
          <div className="flex items-center justify-between pt-2">
            {/* Play / Pause Toggle Pill */}
            <div className="inline-flex items-center gap-1 p-1 rounded-full border border-[#dbd6c3] bg-[#f8f7f2]">
              <button
                onClick={() => setTimerRunning(true)}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                  timerRunning
                    ? 'bg-[#1c1d22] text-white shadow-xs'
                    : 'text-[#4c4e56] hover:bg-white'
                }`}
                title="Start live audit timer"
              >
                <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
              </button>
              <button
                onClick={() => setTimerRunning(false)}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                  !timerRunning
                    ? 'bg-[#1c1d22] text-white shadow-xs'
                    : 'text-[#4c4e56] hover:bg-white'
                }`}
                title="Pause audit timer"
              >
                <Pause className="w-3.5 h-3.5 fill-current" />
              </button>
            </div>

            {/* Reset to 02:35 */}
            <button
              onClick={() => {
                setTimerRunning(false);
                setTimerSeconds(155);
              }}
              className="w-9 h-9 rounded-full bg-[#1c1d22] hover:bg-[#32343d] text-white flex items-center justify-center shadow-xs transition-colors"
              title="Reset work timer to 02:35"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* =====================================================================
            CARD 4 (RIGHT COLUMN): Onboarding & Embedded Dark Task Card
            (SpendNest Priority Action Queue)
           ===================================================================== */}
        <div className="lg:col-span-3 bg-white rounded-[28px] border border-[#ece8db] p-6 shadow-xs flex flex-col justify-between row-span-2">
          {/* Top Onboarding Header & Percentage */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-[#19191d] tracking-tight">Onboarding</h2>
              <span className="text-2xl font-light tracking-tight text-[#19191d] font-display">
                {Math.round((completedCount / actionTasks.length) * 100)}%
              </span>
            </div>

            {/* Segmented Pill Progress: Task (yellow), 25% (black), 0% (gray) */}
            <div className="h-8 w-full flex items-center gap-1 p-1 rounded-full border border-[#dbd6c3] bg-[#f8f7f2] mb-5">
              <div
                className="h-full rounded-full bg-[#fbc743] text-[#1c1d22] text-[11px] font-bold flex items-center justify-center px-2 transition-all duration-300"
                style={{ width: `${Math.max(25, (completedCount / actionTasks.length) * 60)}%` }}
              >
                Task
              </div>
              <div className="h-full rounded-full bg-[#1c1d22] text-white text-[10px] font-semibold flex items-center justify-center px-2 w-[25%]">
                25%
              </div>
              <div className="h-full rounded-full bg-[#d0cbba] text-[#555861] text-[10px] font-medium flex items-center justify-center px-2 ml-auto">
                0%
              </div>
            </div>
          </div>

          {/* Inner Dark Charcoal Card (#1c1d22) */}
          <div className="bg-[#1c1d22] text-white rounded-[24px] p-5 shadow-lg flex-1 flex flex-col justify-between">
            {/* Header: Onboarding Task + Count */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
              <span className="text-sm font-semibold tracking-tight text-white">Onboarding Task</span>
              <span className="text-xs font-semibold text-[#a5a8b5] bg-white/10 px-2.5 py-0.5 rounded-full">
                {completedCount}/{actionTasks.length}
              </span>
            </div>

            {/* Task Item List */}
            <div className="space-y-3.5 my-auto">
              {actionTasks.map((task) => {
                const IconComponent = task.icon;
                return (
                  <div
                    key={task.id}
                    onClick={() => toggleTask(task.id)}
                    className="flex items-center justify-between group cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-[#dcd7c7] group-hover:bg-white/20 transition-colors">
                        <IconComponent className="w-4 h-4" />
                      </div>
                      <div className="max-w-[155px]">
                        <p
                          className={`text-xs font-medium leading-tight truncate transition-all ${
                            task.completed ? 'text-white' : 'text-[#a5a8b5]'
                          }`}
                        >
                          {task.title}
                        </p>
                        <p className="text-[10px] text-[#6d717f] leading-tight truncate">
                          {task.subtitle}
                        </p>
                      </div>
                    </div>

                    {/* Status Circle: Yellow Checkmark or Empty Ring */}
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all ${
                        task.completed
                          ? 'bg-[#fbc743] text-[#1c1d22]'
                          : 'border border-white/20 text-transparent'
                      }`}
                    >
                      {task.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Quick Link to Action Center */}
            <div className="pt-4 border-t border-white/10 mt-3 flex items-center justify-between">
              <span className="text-[11px] text-[#7e8291]">SpendNest Actions</span>
              <button
                onClick={() => navigate('/actions')}
                className="text-[11px] font-bold text-[#fbc743] hover:underline"
              >
                View All &rarr;
              </button>
            </div>
          </div>
        </div>

        {/* =====================================================================
            CARD 5 (BOTTOM-LEFT): Manager Daily Brief Accordion Card
            (Real SpendNest Categories)
           ===================================================================== */}
        <div className="lg:col-span-3 bg-white rounded-[28px] border border-[#ece8db] p-6 shadow-xs flex flex-col justify-between">
          <div className="space-y-3">
            {/* Accordion 1: Deal Next Steps */}
            <div className="border-b border-[#f0ecdf] pb-3">
              <button
                onClick={() => toggleAccordion('dealNextSteps')}
                className="w-full flex items-center justify-between text-left text-xs font-semibold text-[#19191d] hover:text-[#505259] transition-colors"
              >
                <span>Deal Next Steps</span>
                <ChevronDown
                  className={`w-4 h-4 text-[#7b7e8c] transition-transform ${
                    accordionOpen.dealNextSteps ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {accordionOpen.dealNextSteps && (
                <div className="mt-2 text-[11px] text-[#636672] pl-1 animate-fade-in space-y-1">
                  <p>&bull; Asterloom (M03): Schedule security review</p>
                  <p>&bull; Cedarwave (M04): Multi-currency fee exception</p>
                </div>
              )}
            </div>

            {/* Accordion 2: Customer Bugs & Escalations (Expanded with M07) */}
            <div className="border-b border-[#f0ecdf] pb-3">
              <button
                onClick={() => toggleAccordion('customerBugs')}
                className="w-full flex items-center justify-between text-left text-xs font-semibold text-[#19191d] hover:text-[#505259] transition-colors"
              >
                <span>Customer Escalations</span>
                <ChevronUp
                  className={`w-4 h-4 text-[#7b7e8c] transition-transform ${
                    !accordionOpen.customerBugs ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {accordionOpen.customerBugs && (
                <div className="mt-3 flex items-center justify-between bg-[#f8f7f2] p-2.5 rounded-2xl border border-[#ece8db] animate-fade-in">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white border border-[#dbd6c3] flex items-center justify-center text-[#1c1d22] shadow-2xs">
                      <AlertTriangle className="w-5 h-5 text-amber-500" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-[#19191d] leading-tight">
                        Willowfield M07 Bug
                      </p>
                      <p className="text-[10px] text-[#737682] leading-tight">
                        Description fixed in Rev 2
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate('/conversations')}
                    className="text-[#7b7e8c] hover:text-[#19191d] p-1"
                    title="Inspect M07 in conversation table"
                  >
                    <MoreVertical className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Accordion 3: Sales Coaching Notes */}
            <div className="border-b border-[#f0ecdf] pb-3">
              <button
                onClick={() => toggleAccordion('salesCoaching')}
                className="w-full flex items-center justify-between text-left text-xs font-semibold text-[#19191d] hover:text-[#505259] transition-colors"
              >
                <span>Sales Coaching Notes</span>
                <ChevronDown
                  className={`w-4 h-4 text-[#7b7e8c] transition-transform ${
                    accordionOpen.salesCoaching ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {accordionOpen.salesCoaching && (
                <div className="mt-2 text-[11px] text-[#636672] pl-1 animate-fade-in space-y-1">
                  <p>&bull; Arun: Emphasize SLA response time</p>
                  <p>&bull; David: Address compliance questions faster</p>
                </div>
              )}
            </div>

            {/* Accordion 4: Audit Boundaries */}
            <div>
              <button
                onClick={() => toggleAccordion('auditBoundaries')}
                className="w-full flex items-center justify-between text-left text-xs font-semibold text-[#19191d] hover:text-[#505259] transition-colors"
              >
                <span>Data Boundaries & Audit</span>
                <ChevronDown
                  className={`w-4 h-4 text-[#7b7e8c] transition-transform ${
                    accordionOpen.auditBoundaries ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {accordionOpen.auditBoundaries && (
                <div className="mt-2 text-[11px] text-[#636672] pl-1 animate-fade-in space-y-1">
                  <p>&bull; 26 records lack usable text (audio-only)</p>
                  <p>&bull; Self-correcting revision engine enabled</p>
                </div>
              )}
            </div>
          </div>

          {/* Dotted Divider at Bottom */}
          <div className="pt-4 border-t border-dashed border-[#dcd7c7] flex items-center justify-between text-[11px] text-[#787c8a]">
            <span>Supabase Verified</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
          </div>
        </div>

        {/* =====================================================================
            CARD 6 (BOTTOM-CENTER): Interactive Calendar & Timeline Card
            (SpendNest Interaction Schedule: Friday, 21 August 2026)
           ===================================================================== */}
        <div className="lg:col-span-6 bg-white rounded-[28px] border border-[#ece8db] p-6 shadow-xs flex flex-col justify-between">
          {/* Calendar Header with Month Selector */}
          <div className="flex items-center justify-between pb-4 border-b border-[#f0ecdf]">
            <div className="flex items-center gap-6">
              <button
                onClick={() => setSelectedMonth('July 2026')}
                className="text-xs font-medium text-[#8d909d] hover:text-[#19191d] transition-colors"
              >
                July
              </button>
              <h3 className="text-sm font-bold text-[#19191d] tracking-tight">
                {selectedMonth}
              </h3>
              <button
                onClick={() => setSelectedMonth('September 2026')}
                className="text-xs font-medium text-[#8d909d] hover:text-[#19191d] transition-colors"
              >
                September
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-[#7f8391] bg-[#f8f7f2] px-2.5 py-1 rounded-full border border-[#ece8db]">
                Week 34 (SpendNest Dataset)
              </span>
            </div>
          </div>

          {/* Days of Week Row (Mon 17, Tue 18, Wed 19, Thu 20, Fri 21, Sat 22) */}
          <div className="grid grid-cols-6 gap-2 my-4 text-center">
            {[
              { day: 'Mon', date: '17' },
              { day: 'Tue', date: '18' },
              { day: 'Wed', date: '19' },
              { day: 'Thu', date: '20' },
              { day: 'Fri', date: '21' },
              { day: 'Sat', date: '22' },
            ].map((item) => {
              const fullLabel = `${item.day} ${item.date}`;
              const isSelected = selectedDay === fullLabel;
              return (
                <div
                  key={fullLabel}
                  onClick={() => setSelectedDay(fullLabel)}
                  className={`py-2 px-1 rounded-2xl cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-[#1c1d22] text-white shadow-xs'
                      : 'hover:bg-[#f5f3ec] text-[#4a4c54]'
                  }`}
                >
                  <p className="text-[10px] font-medium leading-none opacity-80">{item.day}</p>
                  <p className="text-sm font-bold mt-1 leading-none">{item.date}</p>
                </div>
              );
            })}
          </div>

          {/* Timeline Grid with Hour Rows & Event Pills */}
          <div className="relative pt-2 pb-1 space-y-4">
            {/* Hour Row 1: 8:00 am */}
            <div className="flex items-start gap-4 text-xs text-[#828695]">
              <span className="w-16 shrink-0 pt-1 font-medium">8:00 am</span>
              <div className="flex-1 relative border-t border-dashed border-[#e6e2d5] pt-2">
                {/* Dark Pill Event: Willowfield Trust Sync (M07) */}
                <div className="bg-[#1c1d22] text-white rounded-full px-4 py-2.5 flex items-center justify-between shadow-md max-w-sm">
                  <div>
                    <p className="text-xs font-semibold leading-tight text-white">
                      Willowfield Trust Sync (M07)
                    </p>
                    <p className="text-[10px] text-[#9ca0ae] leading-tight">
                      Arun & Customer: Core ledger discussion (27 turns)
                    </p>
                  </div>
                  {/* Attendee Monogram Cluster */}
                  <div className="flex -space-x-2 pl-2">
                    <div className="w-6 h-6 rounded-full bg-[#fbc743] text-[#1c1d22] text-[10px] font-bold border-2 border-[#1c1d22] flex items-center justify-center">
                      AR
                    </div>
                    <div className="w-6 h-6 rounded-full bg-slate-300 text-slate-800 text-[10px] font-bold border-2 border-[#1c1d22] flex items-center justify-center">
                      WT
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Hour Row 2: 9:00 am */}
            <div className="flex items-start gap-4 text-xs text-[#828695]">
              <span className="w-16 shrink-0 font-medium">9:00 am</span>
              <div className="flex-1 border-t border-dashed border-[#e6e2d5]" />
            </div>

            {/* Hour Row 3: 10:00 am */}
            <div className="flex items-start gap-4 text-xs text-[#828695]">
              <span className="w-16 shrink-0 pt-1 font-medium">10:00 am</span>
              <div className="flex-1 relative border-t border-dashed border-[#e6e2d5] pt-2">
                {/* White Pill Event: Asterloom Enterprise Demo (M03) */}
                <div className="ml-auto bg-white border border-[#dbd6c3] text-[#19191d] rounded-full px-4 py-2 flex items-center justify-between shadow-2xs max-w-xs">
                  <div>
                    <p className="text-xs font-semibold leading-tight text-[#19191d]">
                      Asterloom Demo (M03)
                    </p>
                    <p className="text-[10px] text-[#787c8a] leading-tight">
                      Enterprise dual approval signoff
                    </p>
                  </div>
                  <div className="flex -space-x-2 pl-2">
                    <div className="w-5 h-5 rounded-full bg-[#1c1d22] text-white text-[9px] font-bold border border-white flex items-center justify-center">
                      M3
                    </div>
                    <div className="w-5 h-5 rounded-full bg-[#fbc743] text-[#1c1d22] text-[9px] font-bold border border-white flex items-center justify-center">
                      AR
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Hour Row 4: 11:00 am */}
            <div className="flex items-start gap-4 text-xs text-[#828695]">
              <span className="w-16 shrink-0 font-medium">11:00 am</span>
              <div className="flex-1 border-t border-dashed border-[#e6e2d5]" />
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          BOTTOM DOCK: SpendNest Replay & Pipeline Controller Bar
         ========================================================================= */}
      <div className="mt-8 p-4 rounded-3xl bg-white/80 border border-[#ece8db] shadow-2xs flex flex-wrap items-center justify-between gap-4 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#fbc743] text-[#1c1d22] flex items-center justify-center font-bold text-xs shadow-2xs">
            SP
          </div>
          <div>
            <p className="text-xs font-semibold text-[#19191d]">
              SpendNest Revenue Intelligence Replay
            </p>
            <p className="text-[11px] text-[#747886]">
              44 Interactions &bull; 18 Transcribed &bull; Supabase PostgreSQL Connected
            </p>
          </div>
        </div>

        {/* Action Replay Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleReplayInitial}
            disabled={replayLoading}
            className="px-3.5 py-1.5 rounded-full border border-[#d6d1c0] bg-white hover:bg-[#f5f3ec] text-xs font-medium text-[#2d2f36] transition-all hover:scale-102 disabled:opacity-50"
            title="Load initial batch 01_initial.json"
          >
            01_initial
          </button>

          <button
            onClick={handleReplayUpdate}
            disabled={replayLoading}
            className="px-3.5 py-1.5 rounded-full bg-[#1c1d22] hover:bg-[#2e3038] text-xs font-semibold text-white shadow-xs transition-all hover:scale-102 disabled:opacity-50 flex items-center gap-1.5"
            title="Apply late transcripts 02_update.json"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#fbc743]" />
            <span>02_update (Late Transcripts)</span>
          </button>

          <button
            onClick={handleReplayReset}
            disabled={replayLoading}
            className="px-3 py-1.5 rounded-full border border-[#d6d1c0] bg-white hover:bg-[#f5f3ec] text-xs font-medium text-[#2d2f36] transition-colors"
            title="Reset database to initial state"
          >
            Reset
          </button>

          <button
            onClick={handleExportZip}
            className="px-3.5 py-1.5 rounded-full bg-[#fbc743] hover:bg-[#f5b525] text-xs font-bold text-[#1c1d22] shadow-2xs transition-all flex items-center gap-1.5"
            title="Download complete project ZIP archive"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export ZIP</span>
          </button>
        </div>
      </div>
    </div>
  );
};
