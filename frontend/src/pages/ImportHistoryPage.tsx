import React, { useState, useEffect } from 'react';
import {
  History,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Download,
  Calendar,
  Layers,
  ArrowRight
} from 'lucide-react';
import { api } from '../services/api';
import { Skeleton } from '../components/common/UIComponents';

export const ImportHistoryPage: React.FC = () => {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await api.getImportHistory();
      setJobs(res);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleDownloadErrors = (jobId: number) => {
    const url = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'}/imports/${jobId}/errors/export?format=csv`;
    window.open(url, '_blank');
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="border-b border-slate-200 pb-5">
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Dataset Import History</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Audit log of uploaded CSV and Excel batches, diff results, and validation reports.
        </p>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Job ID & File</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Total Rows</th>
                <th className="py-3 px-4">New</th>
                <th className="py-3 px-4">Updated</th>
                <th className="py-3 px-4">Unchanged</th>
                <th className="py-3 px-4">Duplicates / Conflicts</th>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4 text-right">Error Log</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                [...Array(4)].map((_, i) => (
                  <tr key={i}>
                    <td colSpan={9} className="py-4 px-4">
                      <Skeleton className="h-6" />
                    </td>
                  </tr>
                ))
              ) : jobs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <History className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="font-semibold text-slate-700 text-sm">No import history found.</p>
                    <p className="text-xs text-slate-500 mt-1">Uploaded batches will appear here.</p>
                  </td>
                </tr>
              ) : (
                jobs.map((job) => {
                  const statusColors: Record<string, string> = {
                    committed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                    cancelled: 'bg-slate-100 text-slate-600 border-slate-200',
                    previewed: 'bg-amber-50 text-amber-700 border-amber-200',
                    failed: 'bg-rose-50 text-rose-700 border-rose-200',
                  };

                  return (
                    <tr key={job.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{job.filename}</div>
                        <div className="text-[11px] text-slate-400 font-mono">Job #{job.id} • {job.file_type.toUpperCase()}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold border capitalize ${statusColors[job.status] || 'bg-slate-100'}`}>
                          {job.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900">{job.total_rows}</td>
                      <td className="py-3.5 px-4 text-emerald-700 font-semibold">{job.new_rows}</td>
                      <td className="py-3.5 px-4 text-blue-700 font-semibold">{job.updated_rows}</td>
                      <td className="py-3.5 px-4 text-slate-500">{job.unchanged_rows}</td>
                      <td className="py-3.5 px-4">
                        <span className="text-amber-700 font-medium">{job.duplicate_rows} dups</span> •{' '}
                        <span className="text-rose-700 font-medium">{job.conflicting_rows} conflicts</span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                        {new Date(job.created_at).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {(job.duplicate_rows > 0 || job.invalid_rows > 0 || job.conflicting_rows > 0) ? (
                          <button
                            onClick={() => handleDownloadErrors(job.id)}
                            className="text-xs font-semibold text-rose-600 hover:text-rose-800 inline-flex items-center gap-1"
                          >
                            <Download className="w-3 h-3" /> Errors
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400">None</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
