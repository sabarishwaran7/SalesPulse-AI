import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PhoneCall,
  Video,
  FileQuestion,
  AlertTriangle,
  BrainCircuit,
  CalendarCheck,
  Award,
  Filter,
  ArrowRight,
  TrendingUp,
  UserCheck
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, CartesianGrid, Legend
} from 'recharts';

import { api } from '../services/api';
import { DashboardAnalytics } from '../types';
import { KpiCard, Skeleton } from '../components/common/UIComponents';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [repFilter, setRepFilter] = useState<string>('all');

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const params: Record<string, string> = {};
      if (repFilter !== 'all') params.sales_rep = repFilter;

      if (dateFilter === '7d') {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        params.start_date = d.toISOString();
      } else if (dateFilter === '30d') {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        params.start_date = d.toISOString();
      }

      const res = await api.getDashboardAnalytics(params);
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [dateFilter, repFilter]);

  if (loading && !data) {
    return (
      <div className="p-8 space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(7)].map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-6 rounded-xl text-center space-y-3">
          <AlertTriangle className="w-8 h-8 text-rose-600 mx-auto" />
          <h3 className="font-bold text-base">Error Loading Dashboard</h3>
          <p className="text-sm">{error}</p>
          <button
            onClick={fetchAnalytics}
            className="px-4 py-2 bg-rose-600 text-white rounded-lg text-xs font-semibold hover:bg-rose-700"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  const kpis = data?.kpis;

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header and Filter Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-5">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Executive Intelligence Overview</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Real-time meeting intelligence, completeness scores, and self-correcting AI queues.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Date range filter */}
          <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-semibold">
            <button
              onClick={() => setDateFilter('all')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                dateFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Time
            </button>
            <button
              onClick={() => setDateFilter('30d')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                dateFilter === '30d' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Last 30 Days
            </button>
            <button
              onClick={() => setDateFilter('7d')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                dateFilter === '7d' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Last 7 Days
            </button>
          </div>

          {/* Sales Rep Selector */}
          <select
            value={repFilter}
            onChange={(e) => setRepFilter(e.target.value)}
            className="bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Sales Reps</option>
            {data?.rep_activity.map((r) => (
              <option key={r.rep_name} value={r.rep_name}>
                {r.rep_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Total Conversations"
          value={kpis?.total_conversations || 0}
          subtitle={`${kpis?.calls_count || 0} Calls • ${kpis?.meetings_count || 0} Video Meetings`}
          icon={PhoneCall}
          color="indigo"
          onClick={() => navigate('/conversations')}
        />
        <KpiCard
          title="Pending Transcripts"
          value={kpis?.transcript_pending_count || 0}
          subtitle="Waiting for late transcript ingestion"
          icon={FileQuestion}
          color="amber"
          onClick={() => navigate('/conversations?transcript_status=pending')}
        />
        <KpiCard
          title="Incomplete Records"
          value={kpis?.incomplete_count || 0}
          subtitle="Completeness score < 80%"
          icon={AlertTriangle}
          color="rose"
          onClick={() => navigate('/conversations?completeness=incomplete')}
        />
        <KpiCard
          title="AI Review Required"
          value={kpis?.ai_review_needed_count || 0}
          subtitle="Low confidence or conflicting labels"
          icon={BrainCircuit}
          color="cyan"
          onClick={() => navigate('/ai-review')}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          title="Follow-ups Due"
          value={kpis?.follow_ups_due_count || 0}
          subtitle="Pending or overdue action items"
          icon={CalendarCheck}
          color="amber"
          onClick={() => navigate('/actions')}
        />
        <KpiCard
          title="Avg Completeness Score"
          value={`${kpis?.average_completeness || 0}%`}
          subtitle="Weighted identity, transcript & analysis"
          icon={Award}
          color="emerald"
        />
        <KpiCard
          title="Total Video Meetings"
          value={kpis?.meetings_count || 0}
          subtitle="Screen shares & product demos"
          icon={Video}
          color="slate"
        />
      </div>

      {/* Interactive Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Volume Over Time (2 cols) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Conversation Volume Over Time</h3>
              <p className="text-xs text-slate-500">Daily breakdown of calls versus meetings</p>
            </div>
            <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" /> Trend
            </span>
          </div>

          <div className="h-64 w-full">
            {data?.volume_over_time && data.volume_over_time.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.volume_over_time}>
                  <defs>
                    <linearGradient id="colorCalls" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorMeetings" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                  />
                  <Area type="monotone" dataKey="calls" stroke="#4f46e5" strokeWidth={2} fillOpacity={1} fill="url(#colorCalls)" name="Calls" />
                  <Area type="monotone" dataKey="meetings" stroke="#06b6d4" strokeWidth={2} fillOpacity={1} fill="url(#colorMeetings)" name="Meetings" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No volume records available for selected period.
              </div>
            )}
          </div>
        </div>

        {/* Purpose Distribution (1 col) */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Purpose Distribution</h3>
            <p className="text-xs text-slate-500 mb-2">Classified tags across all calls</p>
          </div>

          <div className="h-52 w-full">
            {data?.purpose_distribution && data.purpose_distribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.purpose_distribution}
                    dataKey="count"
                    nameKey="purpose"
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={3}
                  >
                    {data.purpose_distribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any, name: any) => [`${value} calls`, name]}
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '11px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No classified purposes yet.
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-slate-100 text-[11px]">
            {data?.purpose_distribution.slice(0, 6).map((p) => (
              <div key={p.purpose} className="flex items-center gap-1.5 truncate">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: p.color }}></span>
                <span className="text-slate-600 truncate">{p.purpose} ({p.count})</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Interactive Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Completeness Tier Distribution */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Conversation Completeness Distribution</h3>
              <p className="text-xs text-slate-500">Tier distribution based on available fields & transcripts</p>
            </div>
            <button
              onClick={() => navigate('/conversations?completeness=incomplete')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
            >
              View Incomplete <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.completeness_distribution || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="tier" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} allowDecimals={false} />
                <Tooltip
                  formatter={(val: any) => [`${val} conversations`, 'Count']}
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '11px' }}
                />
                <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Transcript Processing Status */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Transcript Ingestion Status</h3>
              <p className="text-xs text-slate-500">Completed vs Pending late transcript arrivals</p>
            </div>
            <button
              onClick={() => navigate('/conversations?transcript_status=pending')}
              className="text-xs font-semibold text-amber-600 hover:text-amber-800 flex items-center gap-1"
            >
              Pending Queue <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.transcript_status_breakdown || []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" stroke="#94a3b8" fontSize={11} tickLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="status" stroke="#94a3b8" fontSize={11} tickLine={false} width={80} />
                <Tooltip
                  formatter={(val: any) => [`${val} calls`, 'Total']}
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '11px' }}
                />
                <Bar dataKey="count" fill="#10b981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Sales Rep Activity Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex justify-between items-center">
          <div>
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-indigo-600" />
              Sales Representative Performance & Completeness
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Call logging diligence and follow-up management by team member
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-5">Sales Representative</th>
                <th className="py-3 px-5">Total Logged</th>
                <th className="py-3 px-5">Transcripts Ingested</th>
                <th className="py-3 px-5">Avg Completeness</th>
                <th className="py-3 px-5">Open Follow-ups</th>
                <th className="py-3 px-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {data?.rep_activity.map((rep) => (
                <tr key={rep.rep_name} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3.5 px-5 font-semibold text-slate-900">{rep.rep_name}</td>
                  <td className="py-3.5 px-5 font-medium">{rep.total_conversations}</td>
                  <td className="py-3.5 px-5">
                    <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                      {rep.completed_transcripts} / {rep.total_conversations}
                    </span>
                  </td>
                  <td className="py-3.5 px-5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{rep.avg_completeness.toFixed(1)}%</span>
                      <div className="w-16 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${
                            rep.avg_completeness >= 80 ? 'bg-emerald-500' : rep.avg_completeness >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                          }`}
                          style={{ width: `${rep.avg_completeness}%` }}
                        ></div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-5">
                    <span className={`px-2 py-0.5 rounded-full font-semibold ${
                      rep.follow_ups_open > 0 ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'text-slate-500'
                    }`}>
                      {rep.follow_ups_open}
                    </span>
                  </td>
                  <td className="py-3.5 px-5 text-right">
                    <button
                      onClick={() => navigate(`/conversations?sales_rep=${encodeURIComponent(rep.rep_name)}`)}
                      className="text-indigo-600 hover:text-indigo-800 font-semibold"
                    >
                      View Calls &rarr;
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
