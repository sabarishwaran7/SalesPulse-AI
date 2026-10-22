import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, RefreshCw, Sparkles, CheckCircle2 } from 'lucide-react';
import { api } from '../../services/api';

export const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const [seeding, setSeeding] = useState(false);
  const [seededMessage, setSeededMessage] = useState<string | null>(null);

  const handleSeedData = async () => {
    try {
      setSeeding(true);
      const res = await api.seedSampleData();
      setSeededMessage(res.message);
      setTimeout(() => {
        setSeededMessage(null);
        window.location.reload();
      }, 1500);
    } catch (err: any) {
      alert(`Error seeding demo data: ${err.message}`);
    } finally {
      setSeeding(false);
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-10">
      <div className="flex items-center gap-4">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          System Live
        </span>
      </div>

      <div className="flex items-center gap-3">
        {seededMessage && (
          <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 animate-fade-in">
            <CheckCircle2 className="w-4 h-4" />
            <span>{seededMessage}</span>
          </div>
        )}

        <button
          onClick={handleSeedData}
          disabled={seeding}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200 disabled:opacity-50"
          title="Reset or re-populate with realistic enterprise calls and late transcripts"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${seeding ? 'animate-spin' : ''}`} />
          <span>{seeding ? 'Seeding Data...' : 'Reset Sample Data'}</span>
        </button>

        <button
          onClick={() => navigate('/import')}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-xs shadow-indigo-200"
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Smart Import</span>
        </button>

        <div className="h-5 w-px bg-slate-200 mx-1"></div>

        <div className="flex items-center gap-2.5 pl-1">
          <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center font-bold text-xs text-slate-700">
            SM
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-xs font-semibold text-slate-800 leading-none">Sales Manager</p>
            <p className="text-[10px] text-slate-500 leading-tight">Admin Reviewer</p>
          </div>
        </div>
      </div>
    </header>
  );
};
