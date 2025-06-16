
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
import InventoryUploadPage from '@/pages/InventoryUploadPage';
import SmartInboxPage from '@/pages/SmartInboxPage';
import PredictiveAnalyticsPage from '@/pages/PredictiveAnalyticsPage';
import StreamlinedNavigation from '@/components/StreamlinedNavigation';
import MessageExportPage from "@/pages/MessageExportPage";
import ErrorBoundary from '@/components/ErrorBoundary';

const queryClient = new QueryClient();

function App() {
  console.log('App component rendering...');
  
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <div className="min-h-screen bg-gray-50">
            <Routes>
              <Route path="/auth" element={<Auth />} />
              
              <Route path="/" element={
                <ProtectedRoute>
                  <ErrorBoundary>
                    <div className="flex h-screen bg-gray-50">
                      <div className="flex-1 flex flex-col overflow-hidden">
                        <StreamlinedNavigation />
                        <main className="flex-1 overflow-auto">
                          <DashboardPage />
                        </main>
                      </div>
                    </div>
                  </ErrorBoundary>
                </ProtectedRoute>
              } />

              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <ErrorBoundary>
                    <div className="flex h-screen bg-gray-50">
                      <div className="flex-1 flex flex-col overflow-hidden">
                        <StreamlinedNavigation />
                        <main className="flex-1 overflow-auto">
                          <DashboardPage />
                        </main>
                      </div>
                    </div>
                  </ErrorBoundary>
                </ProtectedRoute>
              } />

              <Route path="/inventory" element={
                <ProtectedRoute>
                  <ErrorBoundary>
                    <div className="flex h-screen bg-gray-50">
                      <div className="flex-1 flex flex-col overflow-hidden">
                        <StreamlinedNavigation />
                        <main className="flex-1 overflow-auto p-6">
                          <InventoryDashboardPage />
                        </main>
                      </div>
                    </div>
                  </ErrorBoundary>
                </ProtectedRoute>
              } />

              <Route path="/leads" element={
                <ProtectedRoute>
                  <ErrorBoundary>
                    <div className="flex h-screen bg-gray-50">
                      <div className="flex-1 flex flex-col overflow-hidden">
                        <StreamlinedNavigation />
                        <main className="flex-1 overflow-auto">
                          <LeadsPage />
                        </main>
                      </div>
                    </div>
                  </ErrorBoundary>
                </ProtectedRoute>
              } />

              <Route path="/streamlined-leads" element={
                <ProtectedRoute>
                  <ErrorBoundary>
                    <div className="flex h-screen bg-gray-50">
                      <div className="flex-1 flex flex-col overflow-hidden">
                        <StreamlinedNavigation />
                        <main className="flex-1 overflow-auto">
                          <StreamlinedLeadsPage />
                        </main>
                      </div>
                    </div>
                  </ErrorBoundary>
                </ProtectedRoute>
              } />

              <Route path="/upload-inventory-report" element={
                <ProtectedRoute>
                  <ErrorBoundary>
                    <div className="flex h-screen bg-gray-50">
                      <div className="flex-1 flex flex-col overflow-hidden">
                        <StreamlinedNavigation />
                        <main className="flex-1 overflow-auto">
                          <InventoryUploadPage />
                        </main>
                      </div>
                    </div>
                  </ErrorBoundary>
                </ProtectedRoute>
              } />

              <Route path="/smart-inbox" element={
                <ProtectedRoute>
                  <ErrorBoundary>
                    <div className="flex h-screen bg-gray-50">
                      <div className="flex-1 flex flex-col overflow-hidden">
                        <StreamlinedNavigation />
                        <main className="flex-1 overflow-auto">
                          <SmartInboxPage />
                        </main>
                      </div>
                    </div>
                  </ErrorBoundary>
                </ProtectedRoute>
              } />

              <Route path="/predictive-analytics" element={
                <ProtectedRoute>
                  <ErrorBoundary>
                    <div className="flex h-screen bg-gray-50">
                      <div className="flex-1 flex flex-col overflow-hidden">
                        <StreamlinedNavigation />
                        <main className="flex-1 overflow-auto">
                          <PredictiveAnalyticsPage />
                        </main>
                      </div>
                    </div>
                  </ErrorBoundary>
                </ProtectedRoute>
              } />

              <Route path="/settings" element={
                <ProtectedRoute>
                  <ErrorBoundary>
                    <div className="flex h-screen bg-gray-50">
                      <div className="flex-1 flex flex-col overflow-hidden">
                        <StreamlinedNavigation />
                        <main className="flex-1 overflow-auto">
                          <DashboardPage />
                        </main>
                      </div>
                    </div>
                  </ErrorBoundary>
                </ProtectedRoute>
              } />
              
              <Route path="/message-export" element={
                <ProtectedRoute>
                  <ErrorBoundary>
                    <div className="flex h-screen bg-gray-50">
                      <div className="flex-1 flex flex-col overflow-hidden">
                        <StreamlinedNavigation />
                        <main className="flex-1 overflow-auto">
                          <MessageExportPage />
                        </main>
                      </div>
                    </div>
                  </ErrorBoundary>
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
