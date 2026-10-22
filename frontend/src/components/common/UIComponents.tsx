import React from 'react';
import { LucideIcon } from 'lucide-react';

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  color?: 'indigo' | 'emerald' | 'amber' | 'rose' | 'cyan' | 'slate';
  trend?: string;
  onClick?: () => void;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  color = 'indigo',
  trend,
  onClick
}) => {
  const colorStyles = {
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    rose: 'bg-rose-50 text-rose-600 border-rose-100',
    cyan: 'bg-cyan-50 text-cyan-600 border-cyan-100',
    slate: 'bg-slate-100 text-slate-600 border-slate-200',
  };

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl border border-slate-200 p-5 shadow-xs transition-all duration-200 ${
        onClick ? 'cursor-pointer hover:border-indigo-300 hover:shadow-md' : ''
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</p>
          <h3 className="text-2xl font-bold text-slate-900 mt-1">{value}</h3>
          {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
          {trend && (
            <span className="inline-block mt-2 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
              {trend}
            </span>
          )}
        </div>
        <div className={`p-3 rounded-xl border ${colorStyles[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
};

export const CompletenessBadge: React.FC<{ score: number; showBar?: boolean }> = ({ score, showBar = true }) => {
  let badgeColor = 'bg-rose-50 text-rose-700 border-rose-200';
  let barColor = 'bg-rose-500';

  if (score >= 80) {
    badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    barColor = 'bg-emerald-500';
  } else if (score >= 50) {
    badgeColor = 'bg-amber-50 text-amber-700 border-amber-200';
    barColor = 'bg-amber-500';
  }

  return (
    <div className="flex items-center gap-2">
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badgeColor}`}>
        {score.toFixed(0)}%
      </span>
      {showBar && (
        <div className="w-16 bg-slate-100 h-1.5 rounded-full overflow-hidden border border-slate-200/50">
          <div className={`h-full ${barColor}`} style={{ width: `${Math.min(100, Math.max(0, score))}%` }}></div>
        </div>
      )}
    </div>
  );
};

export const StatusBadge: React.FC<{ status: string; type?: 'transcript' | 'followup' | 'review' }> = ({
  status,
  type = 'transcript'
}) => {
  const s = (status || '').toLowerCase();

  let style = 'bg-slate-100 text-slate-700 border-slate-200';

  if (type === 'transcript') {
    if (s === 'completed') style = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    else if (s === 'pending') style = 'bg-amber-50 text-amber-700 border-amber-200';
    else if (s === 'failed') style = 'bg-rose-50 text-rose-700 border-rose-200';
  } else if (type === 'review') {
    if (s === 'approved') style = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    else if (s === 'needs_review') style = 'bg-rose-50 text-rose-700 border-rose-200';
    else if (s === 'corrected') style = 'bg-indigo-50 text-indigo-700 border-indigo-200';
    else if (s === 'unreviewed') style = 'bg-amber-50 text-amber-700 border-amber-200';
  } else if (type === 'followup') {
    if (s === 'completed') style = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    else if (s === 'pending') style = 'bg-blue-50 text-blue-700 border-blue-200';
    else if (s === 'overdue') style = 'bg-rose-50 text-rose-700 border-rose-200';
    else style = 'bg-slate-100 text-slate-600 border-slate-200';
  }

  return (
    <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border capitalize ${style}`}>
      {status || 'None'}
    </span>
  );
};

export const Skeleton: React.FC<{ className?: string }> = ({ className = 'h-6 w-full' }) => (
  <div className={`animate-pulse bg-slate-200 rounded ${className}`}></div>
);
