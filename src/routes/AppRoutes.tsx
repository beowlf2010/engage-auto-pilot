import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/components/auth/AuthProvider';
import { useIsMobile } from '@/hooks/use-mobile';
import AuthPage from '@/components/auth/AuthPage';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import AppLayout from '@/components/layout/AppLayout';
import MobileLayout from '@/components/layout/MobileLayout';
import { SimpleLoading } from '@/components/ui/SimpleLoading';
import { AppErrorBoundary } from '@/components/error/AppErrorBoundary';

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
const AIOptInDashboardPage = lazy(() => import('@/pages/AIOptInDashboardPage'));
const PublicSalesProfile = lazy(() => import('@/components/sales-profiles/PublicSalesProfile'));
const AINotificationsPage = lazy(() => import('@/pages/AINotificationsPage'));
const AIAnalyticsDashboardPage = lazy(() => import('@/pages/AIAnalyticsDashboardPage'));
const AIWorkflowsPage = lazy(() => import('@/pages/AIWorkflowsPage'));
const AITemperaturePage = lazy(() => import('@/pages/AITemperaturePage'));
const CallAnalysisPage = lazy(() => import('@/pages/CallAnalysisPage'));
const WorkflowEnginePage = lazy(() => import('@/pages/WorkflowEnginePage'));

import { RouteWrapper } from '@/components/routes/RouteWrapper';

const AppRoutes = () => {
  const { user } = useAuth();
  const isMobile = useIsMobile();

  // Mobile users get a different layout wrapper
  const LayoutComponent = isMobile ? MobileLayout : AppLayout;

  return (
    <AppErrorBoundary showDetails={process.env.NODE_ENV === 'development'}>
      <Routes>
        <Route path="/auth" element={user ? <Navigate to="/dashboard" replace /> : <AuthPage />} />
        
        {/* Dashboard */}
        <Route path="/dashboard" element={
          <RouteWrapper LayoutComponent={LayoutComponent} routeName="Dashboard">
            <DashboardPage />
          </RouteWrapper>
        } />
        
        {/* Leads */}
        <Route path="/leads" element={
          <RouteWrapper LayoutComponent={LayoutComponent} routeName="Leads">
            <LeadsPage />
          </RouteWrapper>
        } />
        
        <Route path="/upload-leads" element={
          <RouteWrapper LayoutComponent={LayoutComponent} routeName="Upload Leads">
            <UploadLeadsPage />
          </RouteWrapper>
        } />
        
        <Route path="/auto-dialing" element={
          <RouteWrapper LayoutComponent={LayoutComponent} routeName="Auto-Dialing">
            <AutoDialingPage />
          </RouteWrapper>
        } />
        
        {/* Smart Inbox */}
        <Route path="/smart-inbox" element={
          <RouteWrapper LayoutComponent={LayoutComponent} routeName="Smart Inbox">
            <SmartInboxPage />
          </RouteWrapper>
        } />
        
        {/* Inventory */}
        <Route path="/inventory-dashboard" element={
          <RouteWrapper LayoutComponent={LayoutComponent} routeName="Inventory Dashboard">
            <InventoryDashboardPage />
          </RouteWrapper>
        } />
        
        <Route path="/upload-inventory" element={
          <RouteWrapper LayoutComponent={LayoutComponent} routeName="Upload Inventory">
            <InventoryUploadPage />
          </RouteWrapper>
        } />
        
        <Route path="/rpo-insights" element={
          <RouteWrapper LayoutComponent={LayoutComponent} routeName="RPO Insights">
            <RPOInsightsPage />
          </RouteWrapper>
        } />
        
        <Route path="/rpo-database" element={
          <RouteWrapper LayoutComponent={LayoutComponent} routeName="RPO Database">
            <RPODatabasePage />
          </RouteWrapper>
        } />
        
        {/* Analytics */}
        <Route path="/financial-dashboard" element={
          <RouteWrapper LayoutComponent={LayoutComponent} routeName="Financial Dashboard">
            <FinancialDashboardPage />
          </RouteWrapper>
        } />
        
        <Route path="/ai-monitor" element={
          <RouteWrapper LayoutComponent={LayoutComponent} routeName="AI Monitor">
            <AIMonitorPage />
          </RouteWrapper>
        } />
        
        <Route path="/sales-dashboard" element={
          <RouteWrapper LayoutComponent={LayoutComponent} routeName="Sales Dashboard">
            <SalesDashboardPage />
          </RouteWrapper>
        } />
        
        <Route path="/analytics" element={
          <RouteWrapper LayoutComponent={LayoutComponent} routeName="Analytics">
            <AdvancedAnalyticsPage />
          </RouteWrapper>
        } />
        
        {/* AI Performance & Training */}
        <Route path="/ai-performance" element={
          <RouteWrapper LayoutComponent={LayoutComponent} routeName="AI Performance">
            <AIPerformanceDashboardPage />
          </RouteWrapper>
        } />

        <Route path="/ai-training" element={
          <RouteWrapper LayoutComponent={LayoutComponent} routeName="AI Training">
            <AITrainingCenterPage />
          </RouteWrapper>
        } />
        
        <Route path="/ai-opt-ins" element={
          <RouteWrapper LayoutComponent={LayoutComponent} routeName="AI Opt-In Management">
            <AIOptInDashboardPage />
          </RouteWrapper>
        } />

        <Route path="/ai-notifications" element={
          <RouteWrapper LayoutComponent={LayoutComponent} routeName="AI Notifications">
            <AINotificationsPage />
          </RouteWrapper>
        } />

        <Route path="/ai-analytics" element={
          <RouteWrapper LayoutComponent={LayoutComponent} routeName="AI Analytics">
            <AIAnalyticsDashboardPage />
          </RouteWrapper>
        } />

        <Route path="/ai-workflows" element={
          <RouteWrapper LayoutComponent={LayoutComponent} routeName="AI Workflows">
            <AIWorkflowsPage />
          </RouteWrapper>
        } />

        <Route path="/ai-temperature" element={
          <RouteWrapper LayoutComponent={LayoutComponent} routeName="Lead Temperature">
            <AITemperaturePage />
          </RouteWrapper>
        } />

        <Route path="/call-analysis" element={
          <RouteWrapper LayoutComponent={LayoutComponent} routeName="Call Analysis">
            <CallAnalysisPage />
          </RouteWrapper>
        } />

        <Route path="/workflow-engine" element={
          <RouteWrapper LayoutComponent={LayoutComponent} routeName="Workflow Engine">
            <WorkflowEnginePage />
          </RouteWrapper>
        } />
        
        {/* Tools */}
        <Route path="/predictive-analytics" element={
          <RouteWrapper LayoutComponent={LayoutComponent} routeName="Predictive Analytics">
            <PredictiveAnalyticsPage />
          </RouteWrapper>
        } />
        
        <Route path="/message-export" element={
          <RouteWrapper LayoutComponent={LayoutComponent} routeName="Message Export">
            <MessageExportPage />
          </RouteWrapper>
        } />
        
        <Route path="/personalization" element={
          <RouteWrapper LayoutComponent={LayoutComponent} routeName="Personalization">
            <PersonalizationPage />
          </RouteWrapper>
        } />
        
        {/* Admin */}
        <Route path="/admin-dashboard" element={
          <RouteWrapper LayoutComponent={LayoutComponent} routeName="Admin Dashboard">
            <AdminDashboardPage />
          </RouteWrapper>
        } />
        
        <Route path="/manager-dashboard" element={
          <RouteWrapper LayoutComponent={LayoutComponent} routeName="Manager Dashboard">
            <ManagerDashboardPage />
          </RouteWrapper>
        } />
        
        {/* Settings */}
        <Route path="/settings" element={
          <RouteWrapper LayoutComponent={LayoutComponent} routeName="Settings">
            <SettingsPage />
          </RouteWrapper>
        } />
        
        {/* Sales Profile Management */}
        <Route path="/sales-profile" element={
          <RouteWrapper LayoutComponent={LayoutComponent} routeName="Sales Profile">
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
    </AppErrorBoundary>
  );
};

export default AppRoutes;