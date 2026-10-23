import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Settings, Bell, User, RefreshCw, Sparkles, CheckCircle2 } from 'lucide-react';
import { api } from '../../services/api';

interface NavbarProps {
  reviewCount?: number;
  openActionsCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({ reviewCount = 0, openActionsCount = 0 }) => {
  const navigate = useNavigate();
  const location = useLocation();
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

  const navLinks = [
    { name: 'Dashboard', path: '/' },
    { name: 'Conversations', path: '/conversations' },
    { name: 'Smart Import', path: '/import' },
    { name: 'AI Review', path: '/ai-review', badge: reviewCount },
    { name: 'Actions', path: '/actions', badge: openActionsCount },
    { name: 'Reports', path: '/reports' },
    { name: 'History', path: '/imports-history' },
  ];

  return (
    <header className="w-full pt-4 px-6 md:px-10 flex items-center justify-between gap-4 z-30 select-none">
      {/* Brand Pill (Matching "Crextio" pill on far left) */}
      <div className="flex items-center gap-3">
        <NavLink
          to="/"
          className="inline-flex items-center justify-center px-6 py-2 rounded-full border border-[#d6d1c0] bg-white/80 hover:bg-white text-[#19191d] font-semibold text-lg tracking-tight shadow-xs backdrop-blur-md transition-all hover:scale-[1.02]"
        >
          <span>SalesPulse</span>
        </NavLink>
      </div>

      {/* Floating Center Pill Navigation (Exact match to reference bar) */}
      <nav className="hidden lg:flex items-center gap-1 px-2 py-1.5 rounded-full bg-[#eae6d8]/80 border border-[#dbd6c3] shadow-xs backdrop-blur-md">
        {navLinks.map((item) => {
          const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
          return (
            <NavLink
              key={item.path}
              to={item.path}
              title={item.name}
              className={`relative px-4 py-1.5 rounded-full text-xs md:text-sm font-medium transition-all duration-200 flex items-center gap-1.5 ${
                isActive
                  ? 'bg-[#1c1d22] text-white shadow-sm font-semibold'
                  : 'text-[#505259] hover:text-[#1c1d22] hover:bg-white/40'
              }`}
            >
              <span>{item.name}</span>
              {Boolean(item.badge && item.badge > 0) && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isActive ? 'bg-[#fbc743] text-[#1c1d22]' : 'bg-[#1c1d22] text-white'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Right Controls: Setting, Notification Bell, Profile, Seed */}
      <div className="flex items-center gap-2.5">
        {seededMessage && (
          <div className="hidden xl:flex items-center gap-1.5 text-xs text-emerald-800 bg-emerald-50/90 px-3 py-1.5 rounded-full border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>{seededMessage}</span>
          </div>
        )}

        {/* Reset / Seed Demo Data Pill */}
        <button
          onClick={handleSeedData}
          disabled={seeding}
          className="hidden md:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-[#d6d1c0] bg-white/80 hover:bg-white text-xs font-medium text-[#2d2f36] shadow-xs backdrop-blur-md transition-all hover:scale-102 disabled:opacity-50"
          title="Reset sample enterprise calls and transcripts"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${seeding ? 'animate-spin' : ''}`} />
          <span className="hidden xl:inline">{seeding ? 'Seeding...' : 'Reset Data'}</span>
        </button>

        {/* Setting Pill Button (Matching "Setting" pill in image) */}
        <NavLink
          to="/settings"
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-[#d6d1c0] bg-white/80 hover:bg-white text-xs font-medium text-[#2d2f36] shadow-xs backdrop-blur-md transition-all hover:scale-102"
        >
          <Settings className="w-3.5 h-3.5 text-[#505259]" />
          <span className="hidden sm:inline">Setting</span>
        </NavLink>

        {/* Notification Bell Circle */}
        <button
          onClick={() => navigate('/actions')}
          className="w-9 h-9 rounded-full border border-[#d6d1c0] bg-white/80 hover:bg-white flex items-center justify-center text-[#2d2f36] shadow-xs backdrop-blur-md relative transition-all hover:scale-105"
          title="Notifications & Action Alerts"
        >
          <Bell className="w-4 h-4 text-[#505259]" />
          <span className="w-2 h-2 rounded-full bg-[#fbc743] absolute top-2 right-2 ring-1 ring-white" />
        </button>

        {/* User Profile Circle */}
        <div
          className="w-9 h-9 rounded-full border border-[#d6d1c0] bg-white/80 hover:bg-white flex items-center justify-center text-[#2d2f36] shadow-xs backdrop-blur-md cursor-pointer transition-all hover:scale-105"
          title="User Account: Sales Manager"
        >
          <User className="w-4 h-4 text-[#505259]" />
        </div>
      </div>
    </header>
  );
};
