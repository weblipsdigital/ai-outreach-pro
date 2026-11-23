import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from './contexts/ThemeContext.js';
import { ToastProvider } from './contexts/ToastContext.js';
import { AuthProvider, useAuth } from './contexts/AuthContext.js';
import { DashboardLayout } from './layouts/DashboardLayout.js';

// Pages
import { OverviewPage } from './pages/OverviewPage.js';
import { LeadsPage } from './pages/LeadsPage.js';
import { GoogleSheetsPage } from './pages/GoogleSheetsPage.js';
import { AIGeneratorPage } from './pages/AIGeneratorPage.js';
import { EmailCampaignsPage } from './pages/EmailCampaignsPage.js';
import { WhatsAppCampaignsPage } from './pages/WhatsAppCampaignsPage.js';
import { ApprovalQueuePage } from './pages/ApprovalQueuePage.js';
import { FollowUpsPage } from './pages/FollowUpsPage.js';
import { InboxPage } from './pages/InboxPage.js';
import { AnalyticsPage } from './pages/AnalyticsPage.js';
import { AutomationSettingsPage } from './pages/AutomationSettingsPage.js';
import { IntegrationsPage } from './pages/IntegrationsPage.js';
import { ActivityLogsPage } from './pages/ActivityLogsPage.js';
import { LoginPage } from './pages/LoginPage.js';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/login" element={<LoginPage />} />

                {/* Protected Dashboard Routes */}
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <DashboardLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<OverviewPage />} />
                  <Route path="leads" element={<LeadsPage />} />
                  <Route path="sheets" element={<GoogleSheetsPage />} />
                  <Route path="ai-generator" element={<AIGeneratorPage />} />
                  <Route path="email-campaigns" element={<EmailCampaignsPage />} />
                  <Route path="whatsapp-campaigns" element={<WhatsAppCampaignsPage />} />
                  <Route path="approval-queue" element={<ApprovalQueuePage />} />
                  <Route path="follow-ups" element={<FollowUpsPage />} />
                  <Route path="inbox" element={<InboxPage />} />
                  <Route path="analytics" element={<AnalyticsPage />} />
                  <Route path="automation-settings" element={<AutomationSettingsPage />} />
                  <Route path="integrations" element={<IntegrationsPage />} />
                  <Route path="activity-logs" element={<ActivityLogsPage />} />
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </BrowserRouter>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
