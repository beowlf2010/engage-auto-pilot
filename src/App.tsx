
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './components/auth/AuthProvider';
import AuthPage from './components/auth/AuthPage';
import ProtectedRoute from './components/auth/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';
import { useIsMobile } from './hooks/use-mobile';
import LeadsPage from './pages/LeadsPage';
import UploadLeadsPage from './pages/UploadLeadsPage';
import DashboardPage from './pages/DashboardPage';
import SmartInboxPage from './pages/SmartInboxPage';
import InventoryDashboardPage from './pages/InventoryDashboardPage';
import InventoryUploadPage from './pages/InventoryUploadPage';
import RPOInsightsPage from './pages/RPOInsightsPage';
import RPODatabasePage from './pages/RPODatabasePage';
import FinancialDashboardPage from './pages/FinancialDashboardPage';
import AIMonitorPage from './pages/AIMonitorPage';
import SalesDashboardPage from './pages/SalesDashboardPage';
import AdvancedAnalyticsPage from './pages/AdvancedAnalyticsPage';
import PredictiveAnalyticsPage from './pages/PredictiveAnalyticsPage';
import MessageExportPage from './pages/MessageExportPage';
import PersonalizationPage from './pages/PersonalizationPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import ManagerDashboardPage from './pages/ManagerDashboardPage';
import AutoDialingPage from './pages/AutoDialingPage';
import SettingsPage from './pages/SettingsPage';
import { Toaster } from '@/components/ui/toaster';

const queryClient = new QueryClient();

const AppContent = () => {
  const { user, loading } = useAuth();
  const isMobile = useIsMobile();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <Router>
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
        
        {/* Default redirect to dashboard */}
        <Route path="/" element={<Navigate to={user ? "/dashboard" : "/auth"} replace />} />
      </Routes>
    </Router>
  );
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <div className="min-h-screen bg-gray-50 w-full">
          <AppContent />
          <Toaster />
        </div>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
