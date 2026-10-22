import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BrainCircuit,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Edit3,
  ThumbsUp,
  RefreshCw,
  Plus,
  X,
  Info,
  ShieldCheck,
  Check
} from 'lucide-react';
import { api } from '../services/api';
import { Skeleton } from '../components/common/UIComponents';

const AVAILABLE_PURPOSES = [
  'Sales',
  'Product Demo',
  'Pricing',
  'Negotiation',
  'Customer Support',
  'Objection Handling',
  'Follow-up',
  'Renewal',
];

export const AIReviewPage: React.FC = () => {
  const navigate = useNavigate();

  const [queue, setQueue] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selected item for review/correction
  const [selectedItem, setSelectedItem] = useState<any | null>(null);

  // Correction form state
  const [purposesToAdd, setPurposesToAdd] = useState<string[]>([]);
  const [purposesToRemove, setPurposesToRemove] = useState<string[]>([]);
  const [editedSummary, setEditedSummary] = useState<string>('');
  const [managerNotes, setManagerNotes] = useState<string>('');
  const [savingAction, setSavingAction] = useState(false);

  const fetchQueue = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getAIReviewQueue();
      setQueue(res);
      if (res.length > 0 && !selectedItem) {
        openReviewModal(res[0]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch AI review queue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  const openReviewModal = (item: any) => {
    setSelectedItem(item);
    setEditedSummary(item.ai_summary || '');
    setPurposesToAdd([]);
    setPurposesToRemove([]);
    setManagerNotes('');
  };

  const handleApprove = async (item: any) => {
    try {
      setSavingAction(true);
      await api.reviewAIConversation(item.id, { review_action: 'approve' });
      await fetchQueue();
      setSelectedItem(null);
    } catch (err: any) {
      alert(`Error approving classification: ${err.message}`);
    } finally {
      setSavingAction(false);
    }
  };

  const handleApplyCorrections = async () => {
    if (!selectedItem) return;
    try {
      setSavingAction(true);
      await api.reviewAIConversation(selectedItem.id, {
        review_action: 'correct',
        purposes_to_add: purposesToAdd,
        purposes_to_remove: purposesToRemove,
        edited_summary: editedSummary,
        notes: managerNotes,
      });
      await fetchQueue();
      setSelectedItem(null);
    } catch (err: any) {
      alert(`Error applying corrections: ${err.message}`);
    } finally {
      setSavingAction(false);
    }
  };

  const handleReanalyze = async (id: number) => {
    try {
      setSavingAction(true);
      await api.reanalyzeConversation(id);
      await fetchQueue();
    } catch (err: any) {
      alert(`Error re-analyzing call: ${err.message}`);
    } finally {
      setSavingAction(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Self-Correcting AI Review Center</h2>
            <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
              {queue.length} Pending Attention
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            Audit predicted labels, correct false classifications, and record human verification history.
          </p>
        </div>

        <button
          onClick={fetchQueue}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh Queue
        </button>
      </div>

      {/* Explanatory Banner */}
      <div className="bg-indigo-50/60 border border-indigo-200 p-4 rounded-xl flex items-start gap-3 text-xs text-indigo-900">
        <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">Transparent Audit Trail:</span> Corrections made here do not overwrite the original model predictions. Both the original Groq output and manager corrections are preserved for auditability and compliance.
        </div>
      </div>

      {/* Main Grid: Queue on Left, Interactive Review Panel on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (5): Review Queue List */}
        <div className="lg:col-span-5 space-y-3">
          <h3 className="font-bold text-slate-900 text-sm">Calls Requiring Human Review</h3>

          {loading ? (
            [...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)
          ) : queue.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
              <p className="font-bold text-slate-800 text-sm">All AI Predictions Verified</p>
              <p className="text-xs text-slate-500">No calls currently flagged for low confidence or review.</p>
            </div>
          ) : (
            queue.map((item) => {
              const isSelected = selectedItem?.id === item.id;
              return (
                <div
                  key={item.id}
                  onClick={() => openReviewModal(item)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-indigo-50/70 border-indigo-300 ring-2 ring-indigo-200'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900">{item.external_call_id}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        (item.confidence_score || 0) < 0.75
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {((item.confidence_score || 0) * 100).toFixed(0)}% Confidence
                    </span>
                  </div>

                  <p className="text-xs font-semibold text-slate-800 mt-1">{item.customer_name}</p>
                  <p className="text-[11px] text-slate-500">Rep: {item.sales_rep_name}</p>

                  {item.review_reason && (
                    <div className="mt-2 text-[11px] text-amber-800 bg-amber-50 p-2 rounded border border-amber-200">
                      Reason: {item.review_reason}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-1 mt-2">
                    {item.active_purposes?.map((p: string) => (
                      <span key={p} className="text-[10px] font-semibold bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-700">
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Column (7): Review & Correction Workspace */}
        <div className="lg:col-span-7">
          {selectedItem ? (
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-6">
              {/* Workspace Header */}
              <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-slate-900">{selectedItem.external_call_id}</h3>
                    <span className="text-xs text-slate-500 font-medium">({selectedItem.customer_name})</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Verified Sales Manager Review Workspace
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleReanalyze(selectedItem.id)}
                    disabled={savingAction}
                    className="px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 flex items-center gap-1"
                  >
                    <Sparkles className="w-3.5 h-3.5" /> Re-run AI
                  </button>
                  <button
                    onClick={() => handleApprove(selectedItem)}
                    disabled={savingAction}
                    className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs flex items-center gap-1"
                  >
                    <ThumbsUp className="w-3.5 h-3.5" /> Approve AI
                  </button>
                </div>
              </div>

              {/* Side-by-Side: Original AI Predictions vs Effective Labels */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Original AI Predictions */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Original AI Predictions
                    </h4>
                    <span className="text-[10px] text-slate-400 font-mono">Immutable</span>
                  </div>

                  <div className="space-y-2">
                    {selectedItem.original_predictions && selectedItem.original_predictions.length > 0 ? (
                      selectedItem.original_predictions.map((p: any, i: number) => (
                        <div key={i} className="bg-white p-2.5 rounded border border-slate-200 text-xs space-y-1">
                          <div className="flex justify-between font-bold text-slate-800">
                            <span>{p.purpose}</span>
                            <span className="text-slate-500">{(p.confidence * 100).toFixed(0)}%</span>
                          </div>
                          {p.evidence && (
                            <p className="text-[11px] text-slate-500 italic">"{p.evidence}"</p>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-400 italic">No original predictions available.</p>
                    )}
                  </div>
                </div>

                {/* Current Effective Labels */}
                <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-wider">
                      Current Effective Labels
                    </h4>
                    {selectedItem.is_manually_corrected && (
                      <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100 px-1.5 py-0.5 rounded">
                        Manually Corrected
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {selectedItem.active_purposes?.map((p: string) => {
                      const willRemove = purposesToRemove.includes(p);
                      return (
                        <span
                          key={p}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold ${
                            willRemove
                              ? 'bg-rose-100 text-rose-800 line-through'
                              : 'bg-white text-indigo-800 border border-indigo-200'
                          }`}
                        >
                          {p}
                          <button
                            type="button"
                            onClick={() => {
                              if (willRemove) {
                                setPurposesToRemove(purposesToRemove.filter((x) => x !== p));
                              } else {
                                setPurposesToRemove([...purposesToRemove, p]);
                              }
                            }}
                            className="hover:text-rose-600"
                            title={willRemove ? 'Undo removal' : 'Remove label'}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      );
                    })}
                  </div>

                  {/* Add New Purpose Tag Buttons */}
                  <div className="pt-2">
                    <p className="text-[11px] font-semibold text-slate-500 mb-1.5">Add Missing Purpose Tag:</p>
                    <div className="flex flex-wrap gap-1">
                      {AVAILABLE_PURPOSES.filter((p) => !selectedItem.active_purposes?.includes(p)).map((p) => {
                        const isAdded = purposesToAdd.includes(p);
                        return (
                          <button
                            key={p}
                            type="button"
                            onClick={() => {
                              if (isAdded) {
                                setPurposesToAdd(purposesToAdd.filter((x) => x !== p));
                              } else {
                                setPurposesToAdd([...purposesToAdd, p]);
                              }
                            }}
                            className={`px-2 py-0.5 rounded text-[11px] font-semibold border transition ${
                              isAdded
                                ? 'bg-emerald-600 text-white border-emerald-600'
                                : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-400'
                            }`}
                          >
                            + {p}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Edit Summary */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Edit AI Executive Summary
                </label>
                <textarea
                  rows={3}
                  value={editedSummary}
                  onChange={(e) => setEditedSummary(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                ></textarea>
              </div>

              {/* Manager Audit Notes */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Manager Audit Rationale / Notes
                </label>
                <input
                  type="text"
                  value={managerNotes}
                  onChange={(e) => setManagerNotes(e.target.value)}
                  placeholder="e.g. Added pricing tag; customer explicitly requested volume tiers."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex justify-between items-center border-t border-slate-100">
                <button
                  onClick={() => navigate(`/conversations/${selectedItem.id}`)}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
                >
                  Inspect Full Transcript &rarr;
                </button>

                <button
                  onClick={handleApplyCorrections}
                  disabled={savingAction}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs disabled:opacity-50"
                >
                  {savingAction ? 'Saving Corrections...' : 'Save Corrections & Update Audit Log'}
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400 space-y-2">
              <BrainCircuit className="w-8 h-8 mx-auto opacity-40" />
              <p className="font-semibold text-slate-700 text-sm">Select a Conversation</p>
              <p className="text-xs text-slate-500">Choose a call from the review queue to inspect predictions.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
