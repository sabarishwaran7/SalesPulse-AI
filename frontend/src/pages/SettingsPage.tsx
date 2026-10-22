import React, { useState, useEffect } from 'react';
import {
  Settings,
  Sparkles,
  Database,
  Sliders,
  CheckCircle2,
  RefreshCw,
  Key,
  Shield,
  Layers,
  Save
} from 'lucide-react';
import { api } from '../services/api';

export const SettingsPage: React.FC = () => {
  const [groqKey, setGroqKey] = useState('');
  const [groqModel, setGroqModel] = useState('llama-3.3-70b-versatile');
  const [threshold, setThreshold] = useState(0.75);
  const [hasGroqKey, setHasGroqKey] = useState(false);

  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);

  const fetchSettings = async () => {
    try {
      const res = await api.getSettings();
      setHasGroqKey(res.has_groq_key);
      setGroqModel(res.groq_model || 'llama-3.3-70b-versatile');
      setThreshold(res.confidence_threshold || 0.75);
    } catch (err: any) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const payload: any = {
        groq_model: groqModel,
        confidence_threshold: threshold,
      };
      if (groqKey.trim()) {
        payload.groq_api_key = groqKey.trim();
      }
      const res = await api.updateSettings(payload);
      setSaveMessage(res.message);
      setGroqKey('');
      await fetchSettings();
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (err: any) {
      alert(`Error saving settings: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleSeedData = async () => {
    try {
      setSeeding(true);
      const res = await api.seedSampleData();
      alert(res.message);
      window.location.reload();
    } catch (err: any) {
      alert(`Error seeding demo data: ${err.message}`);
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="border-b border-slate-200 pb-5">
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Platform Configuration & Intelligence Settings</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Manage Groq AI models, confidence routing thresholds, and completeness weights.
        </p>
      </div>

      {saveMessage && (
        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{saveMessage}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Groq AI Settings */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              Groq AI Intelligence Configuration
            </h3>
            <span
              className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                hasGroqKey
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}
            >
              {hasGroqKey ? 'Groq API Key Active' : 'Fallback Heuristic Active'}
            </span>
          </div>

          <div className="space-y-4 text-xs">
            {/* API Key */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Groq API Key (gsk_...)
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={groqKey}
                  onChange={(e) => setGroqKey(e.target.value)}
                  placeholder={hasGroqKey ? '•••••••••••••••••••••••••••••••• (Active)' : 'Enter Groq API Key'}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Stored exclusively in backend memory/env. Never exposed to frontend or client bundles.
              </p>
            </div>

            {/* Model Selection */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Groq Model Architecture
              </label>
              <select
                value={groqModel}
                onChange={(e) => setGroqModel(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="llama-3.3-70b-versatile">llama-3.3-70b-versatile (Recommended - High Accuracy)</option>
                <option value="llama-3.1-70b-versatile">llama-3.1-70b-versatile</option>
                <option value="mixtral-8x7b-32768">mixtral-8x7b-32768 (Fast Ingestion)</option>
              </select>
            </div>

            {/* Confidence Threshold Slider */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="font-semibold text-slate-700">
                  Human Review Routing Threshold
                </label>
                <span className="font-bold text-indigo-700 font-mono">{(threshold * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0.50"
                max="0.95"
                step="0.05"
                value={threshold}
                onChange={(e) => setThreshold(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Predictions below this confidence value are automatically routed to the Self-Correcting AI Review Center for sales manager sign-off.
              </p>
            </div>
          </div>
        </div>

        {/* Completeness Scoring Transparent Weights */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <Sliders className="w-4 h-4 text-indigo-600" />
            Conversation Completeness Scoring Weights
          </h3>
          <p className="text-xs text-slate-500">
            Calculated algorithmically for every call record. Never reports 100% unless all required criteria are present:
          </p>

          <div className="border border-slate-200 rounded-lg overflow-hidden text-xs">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">Component</th>
                  <th className="py-2.5 px-4">Requirement</th>
                  <th className="py-2.5 px-4 text-right">Weight</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                <tr>
                  <td className="py-2 px-4 font-semibold">Valid Identity</td>
                  <td className="py-2 px-4 text-slate-500">Call ID, Customer, Sales Rep, Valid Date</td>
                  <td className="py-2 px-4 text-right font-bold text-indigo-700">25%</td>
                </tr>
                <tr>
                  <td className="py-2 px-4 font-semibold">Call Transcript</td>
                  <td className="py-2 px-4 text-slate-500">Completed transcript (non-empty &ge;20 chars)</td>
                  <td className="py-2 px-4 text-right font-bold text-indigo-700">25%</td>
                </tr>
                <tr>
                  <td className="py-2 px-4 font-semibold">Purpose Tag</td>
                  <td className="py-2 px-4 text-slate-500">At least 1 verified or active purpose label</td>
                  <td className="py-2 px-4 text-right font-bold text-indigo-700">20%</td>
                </tr>
                <tr>
                  <td className="py-2 px-4 font-semibold">AI Summary</td>
                  <td className="py-2 px-4 text-slate-500">AI analysis generated and available</td>
                  <td className="py-2 px-4 text-right font-bold text-indigo-700">20%</td>
                </tr>
                <tr>
                  <td className="py-2 px-4 font-semibold">Follow-up Status</td>
                  <td className="py-2 px-4 text-slate-500">Action items identified or status explicitly assigned</td>
                  <td className="py-2 px-4 text-right font-bold text-indigo-700">10%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Database & Deployment Status */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Database className="w-4 h-4 text-indigo-600" />
              Database Architecture (PostgreSQL on Supabase)
            </h3>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
              Connected
            </span>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            SalesPulse AI utilizes PostgreSQL schema migrations managed by Alembic. In local environments without a running Postgres daemon, the backend operates seamlessly with SQLite fallback while supporting full Supabase PostgreSQL connection strings in production.
          </p>

          <div className="pt-2 flex justify-between items-center border-t border-slate-100">
            <div>
              <p className="text-xs font-bold text-slate-800">Demo Data Seeder</p>
              <p className="text-[11px] text-slate-500">Populate realistic calls, objection handling, and late transcripts.</p>
            </div>
            <button
              type="button"
              onClick={handleSeedData}
              disabled={seeding}
              className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 transition"
            >
              {seeding ? 'Seeding...' : 'Re-Seed Sample Data'}
            </button>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs transition disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
