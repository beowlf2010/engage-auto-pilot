import React, { useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/components/auth/AuthProvider";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppLayout from "@/components/layout/AppLayout";
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
import { NotificationService } from '@/services/notificationService';

const queryClient = new QueryClient();

function App() {
  useEffect(() => {
    // Request notification permission on app start
    NotificationService.requestPermission().then(granted => {
      if (granted) {
        console.log('Notification permission granted');
      }
    });
  }, []);

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
                      <AppLayout>
                        <DashboardPage />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <AppLayout>
                        <DashboardPage />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/smart-inbox"
                  element={
                    <ProtectedRoute>
                      <AppLayout>
                        <SmartInboxPage />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/inventory-dashboard"
                  element={
                    <ProtectedRoute>
                      <AppLayout>
                        <InventoryDashboardPage />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/upload-inventory"
                  element={
                    <ProtectedRoute>
                      <AppLayout>
                        <InventoryUploadPage />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/financial-dashboard"
                  element={
                    <ProtectedRoute>
                      <AppLayout>
                        <FinancialDashboardPage />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/predictive-analytics"
                  element={
                    <ProtectedRoute>
                      <AppLayout>
                        <PredictiveAnalyticsPage />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/message-export"
                  element={
                    <ProtectedRoute>
                      <AppLayout>
                        <MessageExportPage />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/ai-monitor"
                  element={
                    <ProtectedRoute>
                      <AppLayout>
                        <AIMonitorPage />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin-dashboard"
                  element={
                    <ProtectedRoute>
                      <AppLayout>
                        <AdminDashboardPage />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/manager-dashboard"
                  element={
                    <ProtectedRoute>
                      <AppLayout>
                        <ManagerDashboardPage />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/personalization"
                  element={
                    <ProtectedRoute>
                      <AppLayout>
                        <PersonalizationPage />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/rpo-insights"
                  element={
                    <ProtectedRoute>
                      <AppLayout>
                        <RPOInsightsPage />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/sales-dashboard"
                  element={
                    <ProtectedRoute>
                      <AppLayout>
                        <SalesDashboardPage />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/vehicle/:id"
                  element={
                    <ProtectedRoute>
                      <AppLayout>
                        <VehicleDetailPage />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/settings"
                  element={
                    <ProtectedRoute>
                      <AppLayout>
                        <SettingsPage />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/leads"
                  element={
                    <ProtectedRoute>
                      <AppLayout>
                        <StreamlinedLeadsPage />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/lead/:id"
                  element={
                    <ProtectedRoute>
                      <AppLayout>
                        <LeadDetailPage />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/analytics"
                  element={
                    <ProtectedRoute>
                      <AppLayout>
                        <AdvancedAnalyticsPage />
                      </AppLayout>
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
