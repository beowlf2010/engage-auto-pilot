
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/components/auth/AuthProvider";
import ProtectedRoute from "@/components/ProtectedRoute";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import ForgotPasswordPage from "@/pages/ForgotPasswordPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import SmartInboxPage from "@/pages/SmartInboxPage";
import SettingsPage from "@/pages/SettingsPage";
import UsersPage from "@/pages/UsersPage";
import LeadsPage from "@/pages/LeadsPage";
import LeadDetailsPage from "@/pages/LeadDetailsPage";
import TemplatesPage from "@/pages/TemplatesPage";
import PhoneNumbersPage from "@/pages/PhoneNumbersPage";
import AnalyticsPage from "@/pages/AnalyticsPage";
import BillingPage from "@/pages/BillingPage";
import EmailPage from "@/pages/EmailPage";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter>
          <AuthProvider>
            <div className="min-h-screen bg-background font-sans antialiased">
              <Routes>
                <Route path="/auth" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                
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
                  path="/settings"
                  element={
                    <ProtectedRoute>
                      <SettingsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/users"
                  element={
                    <ProtectedRoute>
                      <UsersPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/leads"
                  element={
                    <ProtectedRoute>
                      <LeadsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/lead/:id"
                  element={
                    <ProtectedRoute>
                      <LeadDetailsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/templates"
                  element={
                    <ProtectedRoute>
                      <TemplatesPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/phone-numbers"
                  element={
                    <ProtectedRoute>
                      <PhoneNumbersPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/analytics"
                  element={
                    <ProtectedRoute>
                      <AnalyticsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/billing"
                  element={
                    <ProtectedRoute>
                      <BillingPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/email"
                  element={
                    <ProtectedRoute>
                      <EmailPage />
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
