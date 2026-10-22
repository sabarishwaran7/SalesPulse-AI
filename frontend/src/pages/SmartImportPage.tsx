import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  XCircle,
  Copy,
  Download,
  ArrowRight,
  ShieldAlert,
  FileDown
} from 'lucide-react';
import { api } from '../services/api';
import { ImportDiffPreview, RecordDiff } from '../types';

export const SmartImportPage: React.FC = () => {
  const navigate = useNavigate();

  const [file, setFile] = useState<File | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [preview, setPreview] = useState<ImportDiffPreview | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'new' | 'updated' | 'conflict' | 'duplicate' | 'invalid'>('all');
  const [conflictResolutions, setConflictResolutions] = useState<Record<string, string>>({});
  const [commitSuccess, setCommitSuccess] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setPreview(null);
      setError(null);
      setCommitSuccess(null);
    }
  };

  const handleUploadAndPreview = async () => {
    if (!file) return;
    try {
      setLoadingPreview(true);
      setError(null);
      const res = await api.previewImport(file);
      setPreview(res);
      // Initialize default conflict resolutions to skip
      const resolutions: Record<string, string> = {};
      res.records.filter((r) => r.status === 'conflict').forEach((r) => {
        resolutions[r.external_call_id] = 'keep_existing';
      });
      setConflictResolutions(resolutions);
    } catch (err: any) {
      setError(err.message || 'Failed to generate preview diff.');
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleCommit = async () => {
    if (!preview) return;
    try {
      setCommitting(true);
      setError(null);
      const res = await api.commitImport(preview.job_id, 'commit', conflictResolutions);
      setCommitSuccess(res.message);
      setPreview(null);
      setFile(null);
    } catch (err: any) {
      setError(err.message || 'Failed to commit import.');
    } finally {
      setCommitting(false);
    }
  };

  const handleCancel = async () => {
    if (!preview) return;
    try {
      setCommitting(true);
      await api.commitImport(preview.job_id, 'cancel');
      setPreview(null);
      setFile(null);
    } catch (err: any) {
      console.error(err);
    } finally {
      setCommitting(false);
    }
  };

  const handleDownloadSample = () => {
    const csvContent =
      "call_id,customer_name,sales_rep_name,conversation_date,duration_seconds,conversation_type,transcript,follow_up_status\n" +
      "CALL-BATCH-201,Global Tech Partners,Sarah Jenkins,2026-10-22 14:00:00,1400,Call,\"Discussed enterprise pricing tiers and multi-seat discount.\",Pending\n" +
      "CALL-BATCH-202,Nexus Logistics,Michael Chang,2026-10-22 15:30:00,1800,Video Demo,\"Walkthrough of AI review center and SOC2 security.\",Completed\n" +
      "CALL-BATCH-203,Apex Healthcare,Elena Rostova,2026-10-22 16:00:00,900,Call,,None\n"; // Late transcript pending example!
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'salespulse_sample_import.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredRecords = (preview?.records || []).filter((r) => {
    if (activeTab === 'all') return true;
    return r.status === activeTab;
  });

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-5">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Smart Import Center</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Safe dataset ingestion with automated diff inspection, duplicate detection, and conflict reviews.
          </p>
        </div>

        <button
          onClick={handleDownloadSample}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 transition"
        >
          <FileDown className="w-3.5 h-3.5 text-indigo-600" />
          <span>Download Sample CSV</span>
        </button>
      </div>

      {/* Success Notification */}
      {commitSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center space-y-3">
          <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
          <h3 className="font-bold text-emerald-900 text-base">Import Committed Successfully</h3>
          <p className="text-xs text-emerald-800">{commitSuccess}</p>
          <div className="pt-2 flex justify-center gap-3">
            <button
              onClick={() => navigate('/conversations')}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold"
            >
              View Updated Conversations &rarr;
            </button>
            <button
              onClick={() => setCommitSuccess(null)}
              className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
            >
              Import Another File
            </button>
          </div>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-xs text-rose-800 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Step 1: Upload Card (If no preview active) */}
      {!preview && !commitSuccess && (
        <div className="bg-white rounded-2xl border-2 border-dashed border-slate-300 p-10 text-center space-y-4 hover:border-indigo-400 transition-colors">
          <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto border border-indigo-100">
            <UploadCloud className="w-7 h-7" />
          </div>

          <div>
            <h3 className="font-bold text-slate-900 text-base">Upload Sales Call Data</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Select a CSV or Excel spreadsheet (.csv, .xlsx). The Smart Import Diff will compare every row with existing PostgreSQL records before writing any changes.
            </p>
          </div>

          <div className="flex justify-center items-center gap-3">
            <label className="cursor-pointer px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition">
              <span>Choose File</span>
              <input type="file" accept=".csv, .xlsx, .xls" onChange={handleFileChange} className="hidden" />
            </label>
          </div>

          {file && (
            <div className="pt-4 flex flex-col items-center">
              <div className="inline-flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-800">
                <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
                <span>{file.name}</span>
                <span className="text-slate-400">({(file.size / 1024).toFixed(1)} KB)</span>
              </div>

              <button
                onClick={handleUploadAndPreview}
                disabled={loadingPreview}
                className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg shadow-xs transition disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingPreview ? 'animate-spin' : ''}`} />
                <span>{loadingPreview ? 'Analyzing Against Database...' : 'Generate Smart Import Diff'}</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Smart Import Diff Preview */}
      {preview && (
        <div className="space-y-6">
          {/* Diff Summary Cards */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 pb-4">
              <div>
                <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100 uppercase tracking-wider">
                  Import Preview Diff
                </span>
                <h3 className="font-bold text-slate-900 text-lg mt-1">{preview.filename}</h3>
                <p className="text-xs text-slate-500">{preview.summary_message}</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCancel}
                  disabled={committing}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCommit}
                  disabled={committing}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition shadow-xs disabled:opacity-50"
                >
                  {committing ? 'Committing Changes...' : 'Confirm & Commit Import'}
                </button>
              </div>
            </div>

            {/* Counts Counter Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 pt-2">
              <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50/50">
                <p className="text-[11px] font-semibold text-emerald-800 uppercase">New Records</p>
                <p className="text-xl font-bold text-emerald-900 mt-0.5">{preview.new_count}</p>
              </div>

              <div className="p-3 rounded-lg border border-blue-200 bg-blue-50/50">
                <p className="text-[11px] font-semibold text-blue-800 uppercase">Updated Records</p>
                <p className="text-xl font-bold text-blue-900 mt-0.5">{preview.updated_count}</p>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/50">
                <p className="text-[11px] font-semibold text-slate-600 uppercase">Unchanged</p>
                <p className="text-xl font-bold text-slate-800 mt-0.5">{preview.unchanged_count}</p>
              </div>

              <div className="p-3 rounded-lg border border-amber-200 bg-amber-50/50">
                <p className="text-[11px] font-semibold text-amber-800 uppercase">Duplicates in File</p>
                <p className="text-xl font-bold text-amber-900 mt-0.5">{preview.duplicate_count}</p>
              </div>

              <div className="p-3 rounded-lg border border-rose-200 bg-rose-50/50">
                <p className="text-[11px] font-semibold text-rose-800 uppercase">Conflicts</p>
                <p className="text-xl font-bold text-rose-900 mt-0.5">{preview.conflict_count}</p>
              </div>

              <div className="p-3 rounded-lg border border-red-200 bg-red-50/50">
                <p className="text-[11px] font-semibold text-red-800 uppercase">Invalid Rows</p>
                <p className="text-xl font-bold text-red-900 mt-0.5">{preview.invalid_count}</p>
              </div>
            </div>
          </div>

          {/* Record Filter Tabs */}
          <div className="flex border-b border-slate-200 gap-1 text-xs font-semibold overflow-x-auto">
            <button
              onClick={() => setActiveTab('all')}
              className={`pb-2.5 px-3 border-b-2 transition ${
                activeTab === 'all'
                  ? 'border-indigo-600 text-indigo-600 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              All Rows ({preview.records.length})
            </button>
            <button
              onClick={() => setActiveTab('new')}
              className={`pb-2.5 px-3 border-b-2 transition ${
                activeTab === 'new'
                  ? 'border-emerald-600 text-emerald-600 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              New ({preview.new_count})
            </button>
            <button
              onClick={() => setActiveTab('updated')}
              className={`pb-2.5 px-3 border-b-2 transition ${
                activeTab === 'updated'
                  ? 'border-blue-600 text-blue-600 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Updated ({preview.updated_count})
            </button>
            <button
              onClick={() => setActiveTab('conflict')}
              className={`pb-2.5 px-3 border-b-2 transition ${
                activeTab === 'conflict'
                  ? 'border-rose-600 text-rose-600 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Conflicts Requiring Review ({preview.conflict_count})
            </button>
            <button
              onClick={() => setActiveTab('duplicate')}
              className={`pb-2.5 px-3 border-b-2 transition ${
                activeTab === 'duplicate'
                  ? 'border-amber-600 text-amber-600 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Duplicates ({preview.duplicate_count})
            </button>
            <button
              onClick={() => setActiveTab('invalid')}
              className={`pb-2.5 px-3 border-b-2 transition ${
                activeTab === 'invalid'
                  ? 'border-red-600 text-red-600 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Invalid ({preview.invalid_count})
            </button>
          </div>

          {/* Record Inspector Cards */}
          <div className="space-y-4">
            {filteredRecords.map((rec) => {
              const statusBadges = {
                new: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                updated: 'bg-blue-50 text-blue-700 border-blue-200',
                unchanged: 'bg-slate-100 text-slate-700 border-slate-200',
                duplicate: 'bg-amber-50 text-amber-700 border-amber-200',
                conflict: 'bg-rose-50 text-rose-700 border-rose-200',
                invalid: 'bg-red-50 text-red-700 border-red-200',
              };

              return (
                <div key={rec.row_number} className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-slate-500">Row #{rec.row_number}</span>
                      <span className="text-sm font-bold text-slate-900">{rec.external_call_id}</span>
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold border uppercase ${statusBadges[rec.status]}`}>
                        {rec.status}
                      </span>
                    </div>

                    {/* Conflict Resolution Selector */}
                    {rec.status === 'conflict' && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-rose-700">Resolution:</span>
                        <select
                          value={conflictResolutions[rec.external_call_id] || 'keep_existing'}
                          onChange={(e) =>
                            setConflictResolutions({
                              ...conflictResolutions,
                              [rec.external_call_id]: e.target.value,
                            })
                          }
                          className="bg-rose-50 border border-rose-300 text-rose-900 text-xs font-semibold rounded p-1"
                        >
                          <option value="keep_existing">Keep Existing Record (Skip)</option>
                          <option value="overwrite">Overwrite with Incoming Data</option>
                        </select>
                      </div>
                    )}
                  </div>

                  {rec.conflict_reason && (
                    <div className="bg-rose-50 border border-rose-200 p-2.5 rounded text-xs text-rose-800 flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>{rec.conflict_reason}</span>
                    </div>
                  )}

                  {rec.validation_errors && rec.validation_errors.length > 0 && (
                    <div className="bg-red-50 border border-red-200 p-2.5 rounded text-xs text-red-800">
                      <ul className="list-disc list-inside space-y-0.5">
                        {rec.validation_errors.map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Field-Level Diff Inspector Table */}
                  {rec.fields_changed && rec.fields_changed.length > 0 && (
                    <div className="mt-2 border border-slate-200 rounded-lg overflow-hidden text-xs">
                      <table className="w-full text-left">
                        <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                          <tr>
                            <th className="py-2 px-3">Field Name</th>
                            <th className="py-2 px-3">Current Value (In DB)</th>
                            <th className="py-2 px-3">Proposed Value (Uploaded)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {rec.fields_changed.map((f, i) => (
                            <tr key={i} className="hover:bg-slate-50/50">
                              <td className="py-2 px-3 font-semibold text-slate-800 font-mono text-[11px]">
                                {f.field_name}
                              </td>
                              <td className="py-2 px-3 text-slate-500 bg-rose-50/30">
                                {String(f.old_value || 'None')}
                              </td>
                              <td className="py-2 px-3 font-bold text-indigo-700 bg-indigo-50/30">
                                {String(f.new_value || 'None')}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* New Record Summary */}
                  {rec.status === 'new' && (
                    <div className="text-xs text-slate-600 grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                      <div>
                        <span className="text-slate-400">Customer:</span> {rec.incoming_data.customer_name}
                      </div>
                      <div>
                        <span className="text-slate-400">Rep:</span> {rec.incoming_data.sales_rep_name}
                      </div>
                      <div>
                        <span className="text-slate-400">Date:</span> {rec.incoming_data.conversation_date || 'N/A'}
                      </div>
                      <div>
                        <span className="text-slate-400">Transcript:</span>{' '}
                        {rec.incoming_data.transcript ? 'Included' : 'Pending'}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Sticky Bottom Actions Bar */}
          <div className="sticky bottom-4 bg-white border border-slate-300 p-4 rounded-xl shadow-lg flex justify-between items-center">
            <div className="text-xs text-slate-600">
              Ready to commit: <span className="font-bold text-slate-900">{preview.new_count} new</span>,{' '}
              <span className="font-bold text-slate-900">{preview.updated_count} updates</span>.
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleCancel}
                disabled={committing}
                className="px-4 py-2 border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold"
              >
                Cancel Import
              </button>
              <button
                onClick={handleCommit}
                disabled={committing}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs disabled:opacity-50"
              >
                {committing ? 'Writing Changes...' : 'Confirm & Commit Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
