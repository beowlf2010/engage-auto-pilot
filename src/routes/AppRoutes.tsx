import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/components/auth/AuthProvider';
import AuthPage from '@/components/auth/AuthPage';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import AppLayout from '@/components/layout/AppLayout';

// Pages
import LeadsPage from '@/pages/LeadsPage';
import UploadLeadsPage from '@/pages/UploadLeadsPage';
import DashboardPage from '@/pages/DashboardPage';
import SmartInboxPage from '@/pages/SmartInboxPage';
import InventoryDashboardPage from '@/pages/InventoryDashboardPage';
import InventoryUploadPage from '@/pages/InventoryUploadPage';
import RPOInsightsPage from '@/pages/RPOInsightsPage';
import RPODatabasePage from '@/pages/RPODatabasePage';
import FinancialDashboardPage from '@/pages/FinancialDashboardPage';
import AIMonitorPage from '@/pages/AIMonitorPage';
import SalesDashboardPage from '@/pages/SalesDashboardPage';
import AdvancedAnalyticsPage from '@/pages/AdvancedAnalyticsPage';
import PredictiveAnalyticsPage from '@/pages/PredictiveAnalyticsPage';
import MessageExportPage from '@/pages/MessageExportPage';
import PersonalizationPage from '@/pages/PersonalizationPage';
import AdminDashboardPage from '@/pages/AdminDashboardPage';
import ManagerDashboardPage from '@/pages/ManagerDashboardPage';
import AutoDialingPage from '@/pages/AutoDialingPage';
import SettingsPage from '@/pages/SettingsPage';
import SalesProfilePage from '@/pages/SalesProfilePage';
import PublicSalesProfile from '@/components/sales-profiles/PublicSalesProfile';
import AIPerformanceDashboardPage from '@/pages/AIPerformanceDashboardPage';
import AITrainingCenterPage from '@/pages/AITrainingCenterPage';

const AppRoutes = () => {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/auth" element={user ? <Navigate to="/dashboard" replace /> : <AuthPage />} />
      
      {/* Dashboard */}
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <AppLayout>
            <DashboardPage />
          </AppLayout>
        </ProtectedRoute>
      } />
      
      {/* Leads */}
      <Route path="/leads" element={
        <ProtectedRoute>
          <AppLayout>
            <LeadsPage />
          </AppLayout>
        </ProtectedRoute>
      } />
      
      <Route path="/upload-leads" element={
        <ProtectedRoute>
          <AppLayout>
            <UploadLeadsPage />
          </AppLayout>
        </ProtectedRoute>
      } />
      
      <Route path="/auto-dialing" element={
        <ProtectedRoute>
          <AppLayout>
            <AutoDialingPage />
          </AppLayout>
        </ProtectedRoute>
      } />
      
      {/* Smart Inbox */}
      <Route path="/smart-inbox" element={
        <ProtectedRoute>
          <AppLayout>
            <SmartInboxPage />
          </AppLayout>
        </ProtectedRoute>
      } />
      
      {/* Inventory */}
      <Route path="/inventory-dashboard" element={
        <ProtectedRoute>
          <AppLayout>
            <InventoryDashboardPage />
          </AppLayout>
        </ProtectedRoute>
      } />
      
      <Route path="/upload-inventory" element={
        <ProtectedRoute>
          <AppLayout>
            <InventoryUploadPage />
          </AppLayout>
        </ProtectedRoute>
      } />
      
      <Route path="/rpo-insights" element={
        <ProtectedRoute>
          <AppLayout>
            <RPOInsightsPage />
          </AppLayout>
        </ProtectedRoute>
      } />
      
      <Route path="/rpo-database" element={
        <ProtectedRoute>
          <AppLayout>
            <RPODatabasePage />
          </AppLayout>
        </ProtectedRoute>
      } />
      
      {/* Analytics */}
      <Route path="/financial-dashboard" element={
        <ProtectedRoute>
          <AppLayout>
            <FinancialDashboardPage />
          </AppLayout>
        </ProtectedRoute>
      } />
      
      <Route path="/ai-monitor" element={
        <ProtectedRoute>
          <AppLayout>
            <AIMonitorPage />
          </AppLayout>
        </ProtectedRoute>
      } />
      
      <Route path="/sales-dashboard" element={
        <ProtectedRoute>
          <AppLayout>
            <SalesDashboardPage />
          </AppLayout>
        </ProtectedRoute>
      } />
      
      <Route path="/analytics" element={
        <ProtectedRoute>
          <AppLayout>
            <AdvancedAnalyticsPage />
          </AppLayout>
        </ProtectedRoute>
      } />
      
      {/* AI Performance & Training */}
      <Route path="/ai-performance" element={
        <ProtectedRoute>
          <AppLayout>
            <AIPerformanceDashboardPage />
          </AppLayout>
        </ProtectedRoute>
      } />

      <Route path="/ai-training" element={
        <ProtectedRoute>
          <AppLayout>
            <AITrainingCenterPage />
          </AppLayout>
        </ProtectedRoute>
      } />
      
      {/* Tools */}
      <Route path="/predictive-analytics" element={
        <ProtectedRoute>
          <AppLayout>
            <PredictiveAnalyticsPage />
          </AppLayout>
        </ProtectedRoute>
      } />
      
      <Route path="/message-export" element={
        <ProtectedRoute>
          <AppLayout>
            <MessageExportPage />
          </AppLayout>
        </ProtectedRoute>
      } />
      
      <Route path="/personalization" element={
        <ProtectedRoute>
          <AppLayout>
            <PersonalizationPage />
          </AppLayout>
        </ProtectedRoute>
      } />
      
      {/* Admin */}
      <Route path="/admin-dashboard" element={
        <ProtectedRoute>
          <AppLayout>
            <AdminDashboardPage />
          </AppLayout>
        </ProtectedRoute>
      } />
      
      <Route path="/manager-dashboard" element={
        <ProtectedRoute>
          <AppLayout>
            <ManagerDashboardPage />
          </AppLayout>
        </ProtectedRoute>
      } />
      
      {/* Settings */}
      <Route path="/settings" element={
        <ProtectedRoute>
          <AppLayout>
            <SettingsPage />
          </AppLayout>
        </ProtectedRoute>
      } />
      
      {/* Sales Profile Management */}
      <Route path="/sales-profile" element={
        <ProtectedRoute>
          <AppLayout>
            <SalesProfilePage />
          </AppLayout>
        </ProtectedRoute>
      } />
      
      {/* Public Sales Profile - No Layout */}
      <Route path="/profile/:profileSlug" element={<PublicSalesProfile />} />
      
      {/* Default redirects */}
      <Route path="/index" element={<Navigate to={user ? "/dashboard" : "/auth"} replace />} />
      <Route path="/" element={<Navigate to={user ? "/dashboard" : "/auth"} replace />} />
    </Routes>
  );
};

export default AppRoutes;