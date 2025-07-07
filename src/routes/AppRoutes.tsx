import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/components/auth/AuthProvider';
import { useIsMobile } from '@/hooks/use-mobile';
import AuthPage from '@/components/auth/AuthPage';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import AppLayout from '@/components/layout/AppLayout';
import MobileLayout from '@/components/layout/MobileLayout';

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
  const isMobile = useIsMobile();

  // Mobile users get a different layout wrapper
  const LayoutComponent = isMobile ? MobileLayout : AppLayout;

  return (
    <Routes>
      <Route path="/auth" element={user ? <Navigate to="/dashboard" replace /> : <AuthPage />} />
      
      {/* Dashboard */}
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <LayoutComponent>
            <DashboardPage />
          </LayoutComponent>
        </ProtectedRoute>
      } />
      
      {/* Leads */}
      <Route path="/leads" element={
        <ProtectedRoute>
          <LayoutComponent>
            <LeadsPage />
          </LayoutComponent>
        </ProtectedRoute>
      } />
      
      <Route path="/upload-leads" element={
        <ProtectedRoute>
          <LayoutComponent>
            <UploadLeadsPage />
          </LayoutComponent>
        </ProtectedRoute>
      } />
      
      <Route path="/auto-dialing" element={
        <ProtectedRoute>
          <LayoutComponent>
            <AutoDialingPage />
          </LayoutComponent>
        </ProtectedRoute>
      } />
      
      {/* Smart Inbox */}
      <Route path="/smart-inbox" element={
        <ProtectedRoute>
          <LayoutComponent>
            <SmartInboxPage />
          </LayoutComponent>
        </ProtectedRoute>
      } />
      
      {/* Inventory */}
      <Route path="/inventory-dashboard" element={
        <ProtectedRoute>
          <LayoutComponent>
            <InventoryDashboardPage />
          </LayoutComponent>
        </ProtectedRoute>
      } />
      
      <Route path="/upload-inventory" element={
        <ProtectedRoute>
          <LayoutComponent>
            <InventoryUploadPage />
          </LayoutComponent>
        </ProtectedRoute>
      } />
      
      <Route path="/rpo-insights" element={
        <ProtectedRoute>
          <LayoutComponent>
            <RPOInsightsPage />
          </LayoutComponent>
        </ProtectedRoute>
      } />
      
      <Route path="/rpo-database" element={
        <ProtectedRoute>
          <LayoutComponent>
            <RPODatabasePage />
          </LayoutComponent>
        </ProtectedRoute>
      } />
      
      {/* Analytics */}
      <Route path="/financial-dashboard" element={
        <ProtectedRoute>
          <LayoutComponent>
            <FinancialDashboardPage />
          </LayoutComponent>
        </ProtectedRoute>
      } />
      
      <Route path="/ai-monitor" element={
        <ProtectedRoute>
          <LayoutComponent>
            <AIMonitorPage />
          </LayoutComponent>
        </ProtectedRoute>
      } />
      
      <Route path="/sales-dashboard" element={
        <ProtectedRoute>
          <LayoutComponent>
            <SalesDashboardPage />
          </LayoutComponent>
        </ProtectedRoute>
      } />
      
      <Route path="/analytics" element={
        <ProtectedRoute>
          <LayoutComponent>
            <AdvancedAnalyticsPage />
          </LayoutComponent>
        </ProtectedRoute>
      } />
      
      {/* AI Performance & Training */}
      <Route path="/ai-performance" element={
        <ProtectedRoute>
          <LayoutComponent>
            <AIPerformanceDashboardPage />
          </LayoutComponent>
        </ProtectedRoute>
      } />

      <Route path="/ai-training" element={
        <ProtectedRoute>
          <LayoutComponent>
            <AITrainingCenterPage />
          </LayoutComponent>
        </ProtectedRoute>
      } />
      
      {/* Tools */}
      <Route path="/predictive-analytics" element={
        <ProtectedRoute>
          <LayoutComponent>
            <PredictiveAnalyticsPage />
          </LayoutComponent>
        </ProtectedRoute>
      } />
      
      <Route path="/message-export" element={
        <ProtectedRoute>
          <LayoutComponent>
            <MessageExportPage />
          </LayoutComponent>
        </ProtectedRoute>
      } />
      
      <Route path="/personalization" element={
        <ProtectedRoute>
          <LayoutComponent>
            <PersonalizationPage />
          </LayoutComponent>
        </ProtectedRoute>
      } />
      
      {/* Admin */}
      <Route path="/admin-dashboard" element={
        <ProtectedRoute>
          <LayoutComponent>
            <AdminDashboardPage />
          </LayoutComponent>
        </ProtectedRoute>
      } />
      
      <Route path="/manager-dashboard" element={
        <ProtectedRoute>
          <LayoutComponent>
            <ManagerDashboardPage />
          </LayoutComponent>
        </ProtectedRoute>
      } />
      
      {/* Settings */}
      <Route path="/settings" element={
        <ProtectedRoute>
          <LayoutComponent>
            <SettingsPage />
          </LayoutComponent>
        </ProtectedRoute>
      } />
      
      {/* Sales Profile Management */}
      <Route path="/sales-profile" element={
        <ProtectedRoute>
          <LayoutComponent>
            <SalesProfilePage />
          </LayoutComponent>
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