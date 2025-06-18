
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
                      <SmartInboxPage />
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
                
                {/* Redirect any unknown routes to the inbox */}
                <Route path="*" element={<Navigate to="/smart-inbox" replace />} />
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
