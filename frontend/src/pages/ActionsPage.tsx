import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ListTodo,
  AlertCircle,
  Clock,
  CheckCircle2,
  FileQuestion,
  RefreshCw,
  ExternalLink,
  Filter,
  Check,
  X
} from 'lucide-react';
import { api } from '../services/api';
import { ActionRecommendation } from '../types';
import { Skeleton } from '../components/common/UIComponents';

export const ActionsPage: React.FC = () => {
  const navigate = useNavigate();

  const [actions, setActions] = useState<ActionRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('Open');
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const fetchActions = async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (priorityFilter !== 'all') params.priority = priorityFilter;
      if (statusFilter !== 'all') params.status = statusFilter;

      const res = await api.listActions(params);
      setActions(res);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActions();
  }, [priorityFilter, statusFilter]);

  const handleUpdateStatus = async (id: number, newStatus: string) => {
    try {
      setUpdatingId(id);
      await api.updateActionStatus(id, newStatus);
      await fetchActions();
    } catch (err: any) {
      alert(`Error updating action: ${err.message}`);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-5">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Follow-up Action Center</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Prioritized recommendations based on conversation evidence, late transcripts, and customer commitments.
          </p>
        </div>

        {/* Priority Filter */}
        <div className="flex items-center gap-2">
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg px-3 py-1.5 focus:outline-none"
          >
            <option value="all">All Priorities</option>
            <option value="High">High Priority</option>
            <option value="Medium">Medium Priority</option>
            <option value="Low">Low Priority</option>
          </select>
        </div>
      </div>

      {/* Status Tabs */}
      <div className="flex border-b border-slate-200 gap-1 text-xs font-semibold">
        {['Open', 'In Progress', 'Completed', 'Dismissed', 'all'].map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`pb-2.5 px-4 border-b-2 capitalize transition ${
              statusFilter === st
                ? 'border-indigo-600 text-indigo-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {st === 'all' ? 'All Actions' : st}
          </button>
        ))}
      </div>

      {/* Actions List */}
      <div className="space-y-4">
        {loading ? (
          [...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)
        ) : actions.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400 space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
            <p className="font-bold text-slate-800 text-sm">No Action Recommendations</p>
            <p className="text-xs text-slate-500">All current follow-up items have been resolved or filtered out.</p>
          </div>
        ) : (
          actions.map((act) => {
            const priorityColors = {
              High: 'bg-rose-50 text-rose-700 border-rose-200',
              Medium: 'bg-amber-50 text-amber-700 border-amber-200',
              Low: 'bg-slate-100 text-slate-600 border-slate-200',
            };

            return (
              <div
                key={act.id}
                className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3 hover:border-slate-300 transition-colors"
              >
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded text-[11px] font-bold border ${priorityColors[act.priority]}`}>
                      {act.priority} Priority
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-700">{act.external_call_id}</span>
                    <span className="text-xs text-slate-500 font-medium">• {act.customer_name}</span>
                  </div>

                  {/* Status update controls */}
                  <div className="flex items-center gap-1.5 text-xs">
                    {act.status !== 'Completed' && (
                      <button
                        onClick={() => handleUpdateStatus(act.id, 'Completed')}
                        disabled={updatingId === act.id}
                        className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded font-semibold transition"
                      >
                        Mark Completed
                      </button>
                    )}
                    {act.status !== 'In Progress' && act.status !== 'Completed' && (
                      <button
                        onClick={() => handleUpdateStatus(act.id, 'In Progress')}
                        disabled={updatingId === act.id}
                        className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded font-semibold transition"
                      >
                        Start
                      </button>
                    )}
                    {act.status !== 'Dismissed' && act.status !== 'Completed' && (
                      <button
                        onClick={() => handleUpdateStatus(act.id, 'Dismissed')}
                        disabled={updatingId === act.id}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded font-semibold transition"
                      >
                        Dismiss
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{act.title}</h4>
                  <p className="text-xs text-slate-600 mt-0.5">{act.reason}</p>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex justify-between items-center text-xs">
                  <div>
                    <span className="font-bold text-slate-700">Recommended Action: </span>
                    <span className="text-slate-800">{act.suggested_action}</span>
                  </div>

                  <button
                    onClick={() => navigate(`/conversations/${act.conversation_id}`)}
                    className="text-indigo-600 hover:text-indigo-800 font-bold shrink-0 ml-4 flex items-center gap-1"
                  >
                    Open Call <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
