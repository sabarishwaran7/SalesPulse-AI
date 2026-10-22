import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  MessageSquareText,
  FileSpreadsheet,
  BrainCircuit,
  ListTodo,
  FileText,
  History,
  Settings,
  Sparkles,
  Database
} from 'lucide-react';

interface SidebarProps {
  reviewCount?: number;
  openActionsCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ reviewCount = 0, openActionsCount = 0 }) => {
  const navItems = [
    { name: 'Overview', path: '/', icon: LayoutDashboard },
    { name: 'Conversations', path: '/conversations', icon: MessageSquareText },
    { name: 'Smart Import', path: '/import', icon: FileSpreadsheet, highlight: true },
    {
      name: 'AI Review Center',
      path: '/ai-review',
      icon: BrainCircuit,
      badge: reviewCount > 0 ? reviewCount : undefined,
      badgeColor: 'bg-amber-100 text-amber-800'
    },
    {
      name: 'Action Center',
      path: '/actions',
      icon: ListTodo,
      badge: openActionsCount > 0 ? openActionsCount : undefined,
      badgeColor: 'bg-indigo-100 text-indigo-800'
    },
    { name: 'Reports & Exports', path: '/reports', icon: FileText },
    { name: 'Import History', path: '/imports-history', icon: History },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col h-screen sticky top-0 select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-slate-200 gap-3">
        <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-sm shadow-indigo-200">
          <Sparkles className="w-5 h-5" />
        </div>
        <div>
          <h1 className="font-bold text-slate-900 tracking-tight text-base leading-tight">SalesPulse AI</h1>
          <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Intelligence Hub</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          Intelligence Platform
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700 font-semibold shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`
              }
            >
              <div className="flex items-center gap-3">
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.name}</span>
              </div>
              {item.badge !== undefined && (
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${item.badgeColor}`}>
                  {item.badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Database & System Footprint */}
      <div className="p-4 border-t border-slate-200 bg-slate-50/50">
        <div className="flex items-center gap-2 text-xs text-slate-600 mb-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="font-medium text-slate-700">PostgreSQL (Supabase)</span>
        </div>
        <p className="text-[11px] text-slate-500 leading-tight">
          Self-correcting audit pipeline & Groq AI active.
        </p>
      </div>
    </aside>
  );
};
