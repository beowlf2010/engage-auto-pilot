
import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/components/auth/AuthProvider';
import ProtectedRoute from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import Auth from '@/pages/Auth';
import DashboardPage from '@/pages/Index';
import LeadsPage from '@/pages/StreamlinedLeadsPage';
import StreamlinedLeadsPage from '@/pages/StreamlinedLeadsPage';
import InventoryDashboardPage from '@/pages/InventoryDashboardPage';
import InventoryUploadPage from '@/pages/InventoryUploadPage';
import SmartInboxPage from '@/pages/SmartInboxPage';
import PredictiveAnalyticsPage from '@/pages/PredictiveAnalyticsPage';
import MessageExportPage from "@/pages/MessageExportPage";

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
                  <Layout>
                    <DashboardPage />
                  </Layout>
                </ProtectedRoute>
              } />

              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <Layout>
                    <DashboardPage />
                  </Layout>
                </ProtectedRoute>
              } />

              <Route path="/inventory" element={
                <ProtectedRoute>
                  <Layout>
                    <div className="p-6">
                      <InventoryDashboardPage />
                    </div>
                  </Layout>
                </ProtectedRoute>
              } />

              <Route path="/leads" element={
                <ProtectedRoute>
                  <Layout>
                    <LeadsPage />
                  </Layout>
                </ProtectedRoute>
              } />

              <Route path="/streamlined-leads" element={
                <ProtectedRoute>
                  <Layout>
                    <StreamlinedLeadsPage />
                  </Layout>
                </ProtectedRoute>
              } />

              <Route path="/upload-inventory-report" element={
                <ProtectedRoute>
                  <Layout>
                    <InventoryUploadPage />
                  </Layout>
                </ProtectedRoute>
              } />

              <Route path="/smart-inbox" element={
                <ProtectedRoute>
                  <Layout>
                    <SmartInboxPage />
                  </Layout>
                </ProtectedRoute>
              } />

              <Route path="/predictive-analytics" element={
                <ProtectedRoute>
                  <Layout>
                    <PredictiveAnalyticsPage />
                  </Layout>
                </ProtectedRoute>
              } />

              <Route path="/settings" element={
                <ProtectedRoute>
                  <Layout>
                    <DashboardPage />
                  </Layout>
                </ProtectedRoute>
              } />
              
              <Route path="/message-export" element={
                <ProtectedRoute>
                  <Layout>
                    <MessageExportPage />
                  </Layout>
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
