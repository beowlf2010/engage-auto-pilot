
import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from "@/components/ui/tooltip"
import { Toaster } from "@/components/ui/toaster"

import { AuthProvider } from './components/auth/AuthProvider';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';
import SmartInboxPage from './pages/SmartInboxPage';
import StreamlinedLeadsPage from './pages/StreamlinedLeadsPage';
import LeadDetailPage from './pages/LeadDetailPage';
import InventoryDashboardPage from './pages/InventoryDashboardPage';
import InventoryUploadPage from './pages/InventoryUploadPage';
import VehicleDetailPage from './pages/VehicleDetailPage';
import FinancialDashboardPage from './pages/FinancialDashboardPage';
import AIMonitorPage from './pages/AIMonitorPage';
import AdvancedAnalyticsPage from './pages/AdvancedAnalyticsPage';
import SettingsPage from './pages/SettingsPage';
import AppLayout from './components/layout/AppLayout';
import NotFound from './components/NotFound';
import MessageExportPage from './pages/MessageExportPage';
import AppointmentSettingsPage from './pages/AppointmentSettingsPage';
import PublicAppointmentBookingPage from './pages/PublicAppointmentBookingPage';
import UnreadMessageBanner from './components/inbox/UnreadMessageBanner';
import RPODatabasePage from "@/pages/RPODatabasePage";
import PredictiveAnalyticsPage from './pages/PredictiveAnalyticsPage';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AuthProvider>
          <TooltipProvider>
            <div className="min-h-screen bg-background">
              <Toaster />
              <UnreadMessageBanner />
              <Routes>
                <Route path="/auth" element={<AuthPage />} />
                <Route
                  path="/*"
                  element={
                    <ProtectedRoute>
                      <AppLayout>
                        <Routes>
                          <Route path="/" element={<DashboardPage />} />
                          <Route path="/smart-inbox" element={<SmartInboxPage />} />
                          <Route path="/leads" element={<StreamlinedLeadsPage />} />
                          <Route path="/leads/:leadId" element={<LeadDetailPage />} />
                          <Route path="/inventory-dashboard" element={<InventoryDashboardPage />} />
                          <Route path="/inventory-upload" element={<InventoryUploadPage />} />
                          <Route path="/inventory/:id" element={<VehicleDetailPage />} />
                          <Route path="/rpo-database" element={<RPODatabasePage />} />
                          <Route path="/financial-dashboard" element={<FinancialDashboardPage />} />
                          <Route path="/ai-monitor" element={<AIMonitorPage />} />
                          <Route path="/analytics" element={<AdvancedAnalyticsPage />} />
                          <Route path="/predictive-analytics" element={<PredictiveAnalyticsPage />} />
                          <Route path="/settings" element={<SettingsPage />} />
                          <Route path="/message-export" element={<MessageExportPage />} />
                          <Route path="/appointment-settings" element={<AppointmentSettingsPage />} />
                          <Route path="/book-appointment/:token" element={<PublicAppointmentBookingPage />} />
                          <Route path="*" element={<NotFound />} />
                        </Routes>
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </div>
          </TooltipProvider>
        </AuthProvider>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
