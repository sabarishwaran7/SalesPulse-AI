import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Sidebar } from './components/layout/Sidebar';
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
      <div className="flex h-screen bg-slate-50 text-slate-800 antialiased overflow-hidden">
        {/* Sidebar */}
        <Sidebar reviewCount={reviewCount} openActionsCount={openActionsCount} />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Navbar />

          <main className="flex-1 overflow-y-auto">
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
      </div>
    </BrowserRouter>
  );
};

export default App;
