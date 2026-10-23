import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Navbar } from './components/layout/Navbar';

import { DashboardPage } from './pages/DashboardPage';
import { ConversationsPage } from './pages/ConversationsPage';
import { ConversationDetailPage } from './pages/ConversationDetailPage';
import { SmartImportPage } from './pages/SmartImportPage';
import { AIReviewPage } from './pages/AIReviewPage';
import { ActionsPage } from './pages/ActionsPage';
import { ReportsPage } from './pages/ReportsPage';
import { ImportHistoryPage } from './pages/ImportHistoryPage';
import { SettingsPage } from './pages/SettingsPage';
import { api } from './services/api';

export const App: React.FC = () => {
  const [reviewCount, setReviewCount] = useState<number>(0);
  const [openActionsCount, setOpenActionsCount] = useState<number>(0);

  const fetchBadgeCounts = async () => {
    try {
      const queue = await api.getAIReviewQueue();
      setReviewCount(queue.length);

      const actions = await api.listActions({ status: 'Open' });
      setOpenActionsCount(actions.length);
    } catch {
      // Background badge refresh; avoid blocking UI on network blip
    }
  };

  useEffect(() => {
    fetchBadgeCounts();
    const interval = setInterval(fetchBadgeCounts, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[#f5f4ee] text-[#1c1d22] antialiased flex flex-col relative selection:bg-[#fbc743]/40 selection:text-black">
        {/* Subtle Ambient Warm Glow at the corners matching reference design */}
        <div className="fixed -bottom-40 -right-40 w-[550px] h-[550px] rounded-full bg-[#fbc743]/15 blur-3xl pointer-events-none -z-0" />
        <div className="fixed -top-40 -left-40 w-[450px] h-[450px] rounded-full bg-[#f5dfa8]/10 blur-3xl pointer-events-none -z-0" />

        {/* Floating Top Pill Header */}
        <Navbar reviewCount={reviewCount} openActionsCount={openActionsCount} />

        {/* Main Content Area */}
        <main className="flex-1 w-full pb-12 z-10">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/conversations" element={<ConversationsPage />} />
            <Route path="/conversations/:id" element={<ConversationDetailPage />} />
            <Route path="/import" element={<SmartImportPage />} />
            <Route path="/ai-review" element={<AIReviewPage />} />
            <Route path="/actions" element={<ActionsPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/imports-history" element={<ImportHistoryPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
};

export default App;
