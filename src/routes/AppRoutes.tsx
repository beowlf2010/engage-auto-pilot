import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/components/auth/AuthProvider';
import { useIsMobile } from '@/hooks/use-mobile';
import AuthPage from '@/components/auth/AuthPage';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import AppLayout from '@/components/layout/AppLayout';
import MobileLayout from '@/components/layout/MobileLayout';
import { SimpleLoading } from '@/components/ui/SimpleLoading';

// Lazy load pages for better performance
const DashboardPage = lazy(() => import('@/pages/DashboardPage'));
const LeadsPage = lazy(() => import('@/pages/LeadsPage'));
const UploadLeadsPage = lazy(() => import('@/pages/UploadLeadsPage'));
const SmartInboxPage = lazy(() => import('@/pages/SmartInboxPage'));
const InventoryDashboardPage = lazy(() => import('@/pages/InventoryDashboardPage'));
const InventoryUploadPage = lazy(() => import('@/pages/InventoryUploadPage'));
const RPOInsightsPage = lazy(() => import('@/pages/RPOInsightsPage'));
const RPODatabasePage = lazy(() => import('@/pages/RPODatabasePage'));
const FinancialDashboardPage = lazy(() => import('@/pages/FinancialDashboardPage'));
const AIMonitorPage = lazy(() => import('@/pages/AIMonitorPage'));
const SalesDashboardPage = lazy(() => import('@/pages/SalesDashboardPage'));
const AdvancedAnalyticsPage = lazy(() => import('@/pages/AdvancedAnalyticsPage'));
const PredictiveAnalyticsPage = lazy(() => import('@/pages/PredictiveAnalyticsPage'));
const MessageExportPage = lazy(() => import('@/pages/MessageExportPage'));
const PersonalizationPage = lazy(() => import('@/pages/PersonalizationPage'));
const AdminDashboardPage = lazy(() => import('@/pages/AdminDashboardPage'));
const ManagerDashboardPage = lazy(() => import('@/pages/ManagerDashboardPage'));
const AutoDialingPage = lazy(() => import('@/pages/AutoDialingPage'));
const SettingsPage = lazy(() => import('@/pages/SettingsPage'));
const SalesProfilePage = lazy(() => import('@/pages/SalesProfilePage'));
const AIPerformanceDashboardPage = lazy(() => import('@/pages/AIPerformanceDashboardPage'));
const AITrainingCenterPage = lazy(() => import('@/pages/AITrainingCenterPage'));
const PublicSalesProfile = lazy(() => import('@/components/sales-profiles/PublicSalesProfile'));

import { RouteWrapper } from '@/components/routes/RouteWrapper';

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
        <RouteWrapper LayoutComponent={LayoutComponent}>
          <DashboardPage />
        </RouteWrapper>
      } />
      
      {/* Leads */}
      <Route path="/leads" element={
        <RouteWrapper LayoutComponent={LayoutComponent}>
          <LeadsPage />
        </RouteWrapper>
      } />
      
      <Route path="/upload-leads" element={
        <RouteWrapper LayoutComponent={LayoutComponent}>
          <UploadLeadsPage />
        </RouteWrapper>
      } />
      
      <Route path="/auto-dialing" element={
        <RouteWrapper LayoutComponent={LayoutComponent}>
          <AutoDialingPage />
        </RouteWrapper>
      } />
      
      {/* Smart Inbox */}
      <Route path="/smart-inbox" element={
        <RouteWrapper LayoutComponent={LayoutComponent}>
          <SmartInboxPage />
        </RouteWrapper>
      } />
      
      {/* Inventory */}
      <Route path="/inventory-dashboard" element={
        <RouteWrapper LayoutComponent={LayoutComponent}>
          <InventoryDashboardPage />
        </RouteWrapper>
      } />
      
      <Route path="/upload-inventory" element={
        <RouteWrapper LayoutComponent={LayoutComponent}>
          <InventoryUploadPage />
        </RouteWrapper>
      } />
      
      <Route path="/rpo-insights" element={
        <RouteWrapper LayoutComponent={LayoutComponent}>
          <RPOInsightsPage />
        </RouteWrapper>
      } />
      
      <Route path="/rpo-database" element={
        <RouteWrapper LayoutComponent={LayoutComponent}>
          <RPODatabasePage />
        </RouteWrapper>
      } />
      
      {/* Analytics */}
      <Route path="/financial-dashboard" element={
        <RouteWrapper LayoutComponent={LayoutComponent}>
          <FinancialDashboardPage />
        </RouteWrapper>
      } />
      
      <Route path="/ai-monitor" element={
        <RouteWrapper LayoutComponent={LayoutComponent}>
          <AIMonitorPage />
        </RouteWrapper>
      } />
      
      <Route path="/sales-dashboard" element={
        <RouteWrapper LayoutComponent={LayoutComponent}>
          <SalesDashboardPage />
        </RouteWrapper>
      } />
      
      <Route path="/analytics" element={
        <RouteWrapper LayoutComponent={LayoutComponent}>
          <AdvancedAnalyticsPage />
        </RouteWrapper>
      } />
      
      {/* AI Performance & Training */}
      <Route path="/ai-performance" element={
        <RouteWrapper LayoutComponent={LayoutComponent}>
          <AIPerformanceDashboardPage />
        </RouteWrapper>
      } />

      <Route path="/ai-training" element={
        <RouteWrapper LayoutComponent={LayoutComponent}>
          <AITrainingCenterPage />
        </RouteWrapper>
      } />
      
      {/* Tools */}
      <Route path="/predictive-analytics" element={
        <RouteWrapper LayoutComponent={LayoutComponent}>
          <PredictiveAnalyticsPage />
        </RouteWrapper>
      } />
      
      <Route path="/message-export" element={
        <RouteWrapper LayoutComponent={LayoutComponent}>
          <MessageExportPage />
        </RouteWrapper>
      } />
      
      <Route path="/personalization" element={
        <RouteWrapper LayoutComponent={LayoutComponent}>
          <PersonalizationPage />
        </RouteWrapper>
      } />
      
      {/* Admin */}
      <Route path="/admin-dashboard" element={
        <RouteWrapper LayoutComponent={LayoutComponent}>
          <AdminDashboardPage />
        </RouteWrapper>
      } />
      
      <Route path="/manager-dashboard" element={
        <RouteWrapper LayoutComponent={LayoutComponent}>
          <ManagerDashboardPage />
        </RouteWrapper>
      } />
      
      {/* Settings */}
      <Route path="/settings" element={
        <RouteWrapper LayoutComponent={LayoutComponent}>
          <SettingsPage />
        </RouteWrapper>
      } />
      
      {/* Sales Profile Management */}
      <Route path="/sales-profile" element={
        <RouteWrapper LayoutComponent={LayoutComponent}>
          <SalesProfilePage />
        </RouteWrapper>
      } />
      
      {/* Public Sales Profile - No Layout */}
      <Route path="/profile/:profileSlug" element={
        <Suspense fallback={<SimpleLoading message="Loading profile..." />}>
          <PublicSalesProfile />
        </Suspense>
      } />
      
      {/* Default redirects */}
      <Route path="/index" element={<Navigate to={user ? "/dashboard" : "/auth"} replace />} />
      <Route path="/" element={<Navigate to={user ? "/dashboard" : "/auth"} replace />} />
    </Routes>
  );
};

export default AppRoutes;