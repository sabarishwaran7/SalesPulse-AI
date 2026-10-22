import React, { useState } from 'react';
import {
  FileText,
  FileSpreadsheet,
  Download,
  Filter,
  CheckCircle2,
  Calendar,
  Layers
} from 'lucide-react';
import { api } from '../services/api';

export const ReportsPage: React.FC = () => {
  const [reportType, setReportType] = useState('all_conversations');
  const [format, setFormat] = useState<'csv' | 'xlsx'>('csv');
  const [salesRep, setSalesRep] = useState('all');
  const [purpose, setPurpose] = useState('all');

  const reportOptions = [
    {
      id: 'all_conversations',
      title: 'All Conversations Report',
      desc: 'Complete export of all call metadata, transcript statuses, purposes, and scores.',
      icon: FileSpreadsheet,
    },
    {
      id: 'incomplete_conversations',
      title: 'Incomplete Conversations Report',
      desc: 'Calls with completeness score under 80% with specific missing field itemization.',
      icon: Layers,
    },
    {
      id: 'pending_transcripts',
      title: 'Pending Transcripts Queue',
      desc: 'Calls imported without transcripts awaiting late audio/text arrival.',
      icon: FileText,
    },
    {
      id: 'ai_review_queue',
      title: 'AI Review & Low Confidence Queue',
      desc: 'Calls flagged for manager verification or low model confidence scores.',
      icon: FileText,
    },
    {
      id: 'follow_up_actions',
      title: 'Follow-up Recommendations Export',
      desc: 'Prioritized recommendations list with due actions and assigned reps.',
      icon: FileText,
    },
    {
      id: 'import_history',
      title: 'Import History & Batch Stats',
      desc: 'Full audit log of CSV/Excel import jobs, row counts, and diff metrics.',
      icon: FileSpreadsheet,
    },
  ];

  const handleExport = () => {
    const filters: Record<string, string> = {};
    if (salesRep !== 'all') filters.sales_rep = salesRep;
    if (purpose !== 'all') filters.purpose = purpose;

    const url = api.getExportUrl(reportType, format, filters);
    window.open(url, '_blank');
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="border-b border-slate-200 pb-5">
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Reports & Dataset Exports</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Generate production-grade CSV and Excel spreadsheets reflecting committed database values.
        </p>
      </div>

      {/* Report Type Selector Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reportOptions.map((opt) => {
          const Icon = opt.icon;
          const isSelected = reportType === opt.id;
          return (
            <div
              key={opt.id}
              onClick={() => setReportType(opt.id)}
              className={`p-5 rounded-xl border cursor-pointer transition-all ${
                isSelected
                  ? 'bg-indigo-50/70 border-indigo-500 ring-2 ring-indigo-200 shadow-xs'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2.5 rounded-lg ${isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{opt.title}</h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">{opt.desc}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Export Controls Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-5">
        <h3 className="font-bold text-slate-900 text-sm">Export Options & Format</h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Format Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">File Format</label>
            <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setFormat('csv')}
                className={`flex-1 py-1.5 rounded-md text-center transition ${
                  format === 'csv' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                CSV (.csv)
              </button>
              <button
                type="button"
                onClick={() => setFormat('xlsx')}
                className={`flex-1 py-1.5 rounded-md text-center transition ${
                  format === 'xlsx' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Excel (.xlsx)
              </button>
            </div>
          </div>

          {/* Sales Rep Filter */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Sales Rep Filter</label>
            <select
              value={salesRep}
              onChange={(e) => setSalesRep(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-semibold focus:outline-none"
            >
              <option value="all">All Sales Representatives</option>
              <option value="Sarah Jenkins">Sarah Jenkins</option>
              <option value="Michael Chang">Michael Chang</option>
              <option value="Elena Rostova">Elena Rostova</option>
              <option value="David Vance">David Vance</option>
            </select>
          </div>

          {/* Purpose Filter */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Purpose Tag Filter</label>
            <select
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-semibold focus:outline-none"
            >
              <option value="all">All Purposes</option>
              <option value="Sales">Sales</option>
              <option value="Product Demo">Product Demo</option>
              <option value="Pricing">Pricing</option>
              <option value="Negotiation">Negotiation</option>
              <option value="Customer Support">Customer Support</option>
              <option value="Objection Handling">Objection Handling</option>
              <option value="Renewal">Renewal</option>
            </select>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 flex justify-end">
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs transition"
          >
            <Download className="w-4 h-4" />
            <span>Generate & Download {format.toUpperCase()} Report</span>
          </button>
        </div>
      </div>
    </div>
  );
};
