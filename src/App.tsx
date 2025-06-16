
import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/components/auth/AuthProvider';
import ProtectedRoute from '@/components/ProtectedRoute';
import Auth from '@/pages/Auth';
import DashboardPage from '@/pages/Index';
import LeadsPage from '@/pages/StreamlinedLeadsPage';
import StreamlinedLeadsPage from '@/pages/StreamlinedLeadsPage';
import InventoryDashboardPage from '@/pages/InventoryDashboardPage';
import SmartInboxPage from '@/pages/SmartInboxPage';
import PredictiveAnalyticsPage from '@/pages/PredictiveAnalyticsPage';
import StreamlinedNavigation from '@/components/StreamlinedNavigation';
import SettingsPage from '@/pages/Index';
import MessageExportPage from "@/pages/MessageExportPage";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <div className="min-h-screen bg-gray-50">
            <Routes>
              <Route path="/auth" element={<Auth />} />
              
              <Route path="/" element={
                <ProtectedRoute>
                  <div className="flex h-screen bg-gray-50">
                    <div className="flex-1 flex flex-col overflow-hidden">
                      <StreamlinedNavigation />
                      <main className="flex-1 overflow-auto">
                        <DashboardPage />
                      </main>
                    </div>
                  </div>
                </ProtectedRoute>
              } />

              <Route path="/leads" element={
                <ProtectedRoute>
                  <div className="flex h-screen bg-gray-50">
                    <div className="flex-1 flex flex-col overflow-hidden">
                      <StreamlinedNavigation />
                      <main className="flex-1 overflow-auto">
                        <LeadsPage />
                      </main>
                    </div>
                  </div>
                </ProtectedRoute>
              } />

              <Route path="/streamlined-leads" element={
                <ProtectedRoute>
                  <div className="flex h-screen bg-gray-50">
                    <div className="flex-1 flex flex-col overflow-hidden">
                      <StreamlinedNavigation />
                      <main className="flex-1 overflow-auto">
                        <StreamlinedLeadsPage />
                      </main>
                    </div>
                  </div>
                </ProtectedRoute>
              } />

              <Route path="/inventory" element={
                <ProtectedRoute>
                  <div className="flex h-screen bg-gray-50">
                    <div className="flex-1 flex flex-col overflow-hidden">
                      <StreamlinedNavigation />
                      <main className="flex-1 overflow-auto">
                        <InventoryDashboardPage />
                      </main>
                    </div>
                  </div>
                </ProtectedRoute>
              } />

              <Route path="/smart-inbox" element={
                <ProtectedRoute>
                  <div className="flex h-screen bg-gray-50">
                    <div className="flex-1 flex flex-col overflow-hidden">
                      <StreamlinedNavigation />
                      <main className="flex-1 overflow-auto">
                        <SmartInboxPage />
                      </main>
                    </div>
                  </div>
                </ProtectedRoute>
              } />

              <Route path="/predictive-analytics" element={
                <ProtectedRoute>
                  <div className="flex h-screen bg-gray-50">
                    <div className="flex-1 flex flex-col overflow-hidden">
                      <StreamlinedNavigation />
                      <main className="flex-1 overflow-auto">
                        <PredictiveAnalyticsPage />
                      </main>
                    </div>
                  </div>
                </ProtectedRoute>
              } />

              <Route path="/settings" element={
                <ProtectedRoute>
                  <div className="flex h-screen bg-gray-50">
                    <div className="flex-1 flex flex-col overflow-hidden">
                      <StreamlinedNavigation />
                      <main className="flex-1 overflow-auto">
                        <SettingsPage />
                      </main>
                    </div>
                  </div>
                </ProtectedRoute>
              } />
              
              <Route path="/message-export" element={
                <ProtectedRoute>
                  <div className="flex h-screen bg-gray-50">
                    <div className="flex-1 flex flex-col overflow-hidden">
                      <StreamlinedNavigation />
                      <main className="flex-1 overflow-auto">
                        <MessageExportPage />
                      </main>
                    </div>
                  </div>
                </ProtectedRoute>
              } />
            </Routes>
          </div>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
