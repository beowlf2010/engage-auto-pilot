
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/components/auth/AuthProvider";
import ProtectedRoute from "@/components/ProtectedRoute";
import AuthPage from "@/pages/AuthPage";
import SmartInboxPage from "@/pages/SmartInboxPage";
import SettingsPage from "@/pages/SettingsPage";
import StreamlinedLeadsPage from "@/pages/StreamlinedLeadsPage";
import LeadDetailPage from "@/pages/LeadDetailPage";
import AdvancedAnalyticsPage from "@/pages/AdvancedAnalyticsPage";
import InventoryDashboardPage from "@/pages/InventoryDashboardPage";
import InventoryUploadPage from "@/pages/InventoryUploadPage";
import DashboardPage from "@/pages/DashboardPage";
import FinancialDashboardPage from "@/pages/FinancialDashboardPage";
import PredictiveAnalyticsPage from "@/pages/PredictiveAnalyticsPage";
import MessageExportPage from "@/pages/MessageExportPage";
import AIMonitorPage from "@/pages/AIMonitorPage";
import AdminDashboardPage from "@/pages/AdminDashboardPage";
import ManagerDashboardPage from "@/pages/ManagerDashboardPage";
import PersonalizationPage from "@/pages/PersonalizationPage";
import RPOInsightsPage from "@/pages/RPOInsightsPage";
import SalesDashboardPage from "@/pages/SalesDashboardPage";
import VehicleDetailPage from "@/pages/VehicleDetailPage";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter>
          <AuthProvider>
            <div className="min-h-screen bg-background font-sans antialiased">
              <Routes>
                <Route path="/auth" element={<AuthPage />} />
                
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <DashboardPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <DashboardPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/smart-inbox"
                  element={
                    <ProtectedRoute>
                      <SmartInboxPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/inventory-dashboard"
                  element={
                    <ProtectedRoute>
                      <InventoryDashboardPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/upload-inventory"
                  element={
                    <ProtectedRoute>
                      <InventoryUploadPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/financial-dashboard"
                  element={
                    <ProtectedRoute>
                      <FinancialDashboardPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/predictive-analytics"
                  element={
                    <ProtectedRoute>
                      <PredictiveAnalyticsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/message-export"
                  element={
                    <ProtectedRoute>
                      <MessageExportPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/ai-monitor"
                  element={
                    <ProtectedRoute>
                      <AIMonitorPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin-dashboard"
                  element={
                    <ProtectedRoute>
                      <AdminDashboardPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/manager-dashboard"
                  element={
                    <ProtectedRoute>
                      <ManagerDashboardPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/personalization"
                  element={
                    <ProtectedRoute>
                      <PersonalizationPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/rpo-insights"
                  element={
                    <ProtectedRoute>
                      <RPOInsightsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/sales-dashboard"
                  element={
                    <ProtectedRoute>
                      <SalesDashboardPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/vehicle/:id"
                  element={
                    <ProtectedRoute>
                      <VehicleDetailPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/settings"
                  element={
                    <ProtectedRoute>
                      <SettingsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/leads"
                  element={
                    <ProtectedRoute>
                      <StreamlinedLeadsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/lead/:id"
                  element={
                    <ProtectedRoute>
                      <LeadDetailPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/analytics"
                  element={
                    <ProtectedRoute>
                      <AdvancedAnalyticsPage />
                    </ProtectedRoute>
                  }
                />
                
                {/* Redirect any unknown routes to the dashboard */}
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
              <Toaster />
              <SonnerToaster 
                position="top-right"
                expand={true}
                richColors={true}
                closeButton={true}
              />
            </div>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
