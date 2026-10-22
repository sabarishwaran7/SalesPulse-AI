import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Search,
  Filter,
  ArrowUpDown,
  FileQuestion,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Plus,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { api } from '../services/api';
import { Conversation } from '../types';
import { CompletenessBadge, StatusBadge, Skeleton } from '../components/common/UIComponents';

export const ConversationsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters from URL or state
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [salesRep, setSalesRep] = useState(searchParams.get('sales_rep') || 'all');
  const [purpose, setPurpose] = useState(searchParams.get('purpose') || 'all');
  const [transcriptStatus, setTranscriptStatus] = useState(searchParams.get('transcript_status') || 'all');
  const [followUpStatus, setFollowUpStatus] = useState(searchParams.get('follow_up_status') || 'all');
  const [completeness, setCompleteness] = useState(searchParams.get('completeness') || 'all');
  const [aiReviewStatus, setAiReviewStatus] = useState(searchParams.get('ai_review_status') || 'all');
  const [sortBy, setSortBy] = useState('conversation_date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const fetchConversations = async () => {
    try {
      setLoading(true);
      const params: Record<string, any> = {
        page,
        page_size: pageSize,
        sort_by: sortBy,
        sort_dir: sortDir,
      };

      if (search) params.search = search;
      if (salesRep !== 'all') params.sales_rep = salesRep;
      if (purpose !== 'all') params.purpose = purpose;
      if (transcriptStatus !== 'all') params.transcript_status = transcriptStatus;
      if (followUpStatus !== 'all') params.follow_up_status = followUpStatus;
      if (completeness !== 'all') params.completeness = completeness;
      if (aiReviewStatus !== 'all') params.ai_review_status = aiReviewStatus;

      const res = await api.listConversations(params);
      setConversations(res.items);
      setTotal(res.total);
      setTotalPages(res.total_pages);
    } catch (err: any) {
      console.error('Error fetching conversations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, [page, pageSize, salesRep, purpose, transcriptStatus, followUpStatus, completeness, aiReviewStatus, sortBy, sortDir]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchConversations();
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDir('desc');
    }
    setPage(1);
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-5">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Sales Conversations</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Searchable, multi-labeled repository with completeness scores and late transcript controls.
          </p>
        </div>

        <button
          onClick={() => navigate('/import')}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Import Call Batch</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by customer name, rep, call ID, or meeting summary..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-semibold hover:bg-slate-900 transition"
          >
            Search
          </button>
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setPage(1);
              }}
              className="px-3 py-2 bg-slate-100 text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-200"
            >
              Clear
            </button>
          )}
        </form>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-2 border-t border-slate-100 text-xs">
          {/* Transcript Status */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Transcript Status</label>
            <select
              value={transcriptStatus}
              onChange={(e) => {
                setTranscriptStatus(e.target.value);
                setPage(1);
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-md p-1.5 font-medium"
            >
              <option value="all">All Transcripts</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending Late Arrival</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          {/* Completeness Tier */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Completeness</label>
            <select
              value={completeness}
              onChange={(e) => {
                setCompleteness(e.target.value);
                setPage(1);
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-md p-1.5 font-medium"
            >
              <option value="all">All Scores</option>
              <option value="incomplete">Incomplete (&lt;80%)</option>
              <option value="complete">Complete (&ge;80%)</option>
            </select>
          </div>

          {/* AI Review Status */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">AI Review Queue</label>
            <select
              value={aiReviewStatus}
              onChange={(e) => {
                setAiReviewStatus(e.target.value);
                setPage(1);
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-md p-1.5 font-medium"
            >
              <option value="all">All Reviews</option>
              <option value="needs_review">Needs Review</option>
              <option value="approved">Approved</option>
              <option value="corrected">Corrected</option>
            </select>
          </div>

          {/* Purpose Label */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Purpose Tag</label>
            <select
              value={purpose}
              onChange={(e) => {
                setPurpose(e.target.value);
                setPage(1);
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-md p-1.5 font-medium"
            >
              <option value="all">All Purposes</option>
              <option value="Sales">Sales</option>
              <option value="Product Demo">Product Demo</option>
              <option value="Pricing">Pricing</option>
              <option value="Negotiation">Negotiation</option>
              <option value="Customer Support">Customer Support</option>
              <option value="Objection Handling">Objection Handling</option>
              <option value="Follow-up">Follow-up</option>
              <option value="Renewal">Renewal</option>
            </select>
          </div>

          {/* Follow-up */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Follow-up Status</label>
            <select
              value={followUpStatus}
              onChange={(e) => {
                setFollowUpStatus(e.target.value);
                setPage(1);
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-md p-1.5 font-medium"
            >
              <option value="all">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Overdue">Overdue</option>
              <option value="Completed">Completed</option>
              <option value="None">None</option>
            </select>
          </div>

          {/* Reset Filters */}
          <div className="flex items-end">
            <button
              onClick={() => {
                setSearch('');
                setSalesRep('all');
                setPurpose('all');
                setTranscriptStatus('all');
                setFollowUpStatus('all');
                setCompleteness('all');
                setAiReviewStatus('all');
                setPage(1);
              }}
              className="w-full py-1.5 text-xs text-slate-600 bg-slate-100 hover:bg-slate-200 font-semibold rounded-md transition"
            >
              Reset Filters
            </button>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 select-none">
              <tr>
                <th className="py-3 px-4">Call ID & Type</th>
                <th
                  onClick={() => handleSort('customer_name')}
                  className="py-3 px-4 cursor-pointer hover:text-slate-900"
                >
                  <div className="flex items-center gap-1">
                    Customer & Sales Rep <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('conversation_date')}
                  className="py-3 px-4 cursor-pointer hover:text-slate-900"
                >
                  <div className="flex items-center gap-1">
                    Date & Duration <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-4">Transcript</th>
                <th className="py-3 px-4">Purposes</th>
                <th
                  onClick={() => handleSort('completeness_score')}
                  className="py-3 px-4 cursor-pointer hover:text-slate-900"
                >
                  <div className="flex items-center gap-1">
                    Completeness <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-4">AI Review</th>
                <th className="py-3 px-4">Follow-up</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                [...Array(6)].map((_, i) => (
                  <tr key={i}>
                    <td colSpan={9} className="py-4 px-4">
                      <Skeleton className="h-6" />
                    </td>
                  </tr>
                ))
              ) : conversations.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <FileQuestion className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="font-semibold text-slate-700 text-sm">No conversations match the selected criteria.</p>
                    <p className="text-xs text-slate-500 mt-1">Try adjusting your filters or import new sales data.</p>
                  </td>
                </tr>
              ) : (
                conversations.map((conv) => (
                  <tr
                    key={conv.id}
                    onClick={() => navigate(`/conversations/${conv.id}`)}
                    className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                  >
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{conv.external_call_id}</div>
                      <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">
                        {conv.conversation_type}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900">{conv.customer_name}</div>
                      <div className="text-[11px] text-slate-500">Rep: {conv.sales_rep_name}</div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-medium text-slate-800">
                        {new Date(conv.conversation_date).toLocaleDateString()}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {Math.floor(conv.duration_seconds / 60)}m {conv.duration_seconds % 60}s
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={conv.transcript_status} type="transcript" />
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {conv.active_purposes && conv.active_purposes.length > 0 ? (
                          conv.active_purposes.map((p) => (
                            <span
                              key={p}
                              className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100"
                            >
                              {p}
                            </span>
                          ))
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">None tagged</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <CompletenessBadge score={conv.completeness_score} />
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={conv.ai_review_status} type="review" />
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={conv.follow_up_status} type="followup" />
                    </td>
                    <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => navigate(`/conversations/${conv.id}`)}
                        className="text-indigo-600 hover:text-indigo-900 font-semibold text-xs inline-flex items-center gap-1"
                      >
                        Details <ExternalLink className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-slate-600">
          <div>
            Showing <span className="font-semibold">{conversations.length}</span> of{' '}
            <span className="font-semibold">{total}</span> total conversations
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-medium flex items-center gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Previous
            </button>
            <span className="px-2 font-semibold text-slate-800">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-medium flex items-center gap-1"
            >
              Next <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
