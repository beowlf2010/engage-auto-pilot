
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/components/auth/AuthProvider";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import LeadDetailPage from "./pages/LeadDetailPage";
import AIMonitorPage from "./pages/AIMonitorPage";
import AdvancedAnalyticsPage from "./pages/AdvancedAnalyticsPage";
import PersonalizationPage from "./pages/PersonalizationPage";
import PredictiveAnalyticsPage from "./pages/PredictiveAnalyticsPage";
import StreamlinedPages from "./pages/StreamlinedPages";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/" element={
                <ProtectedRoute>
                  <Index />
                </ProtectedRoute>
              } />
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <Index />
                </ProtectedRoute>
              } />
              <Route path="/leads" element={
                <ProtectedRoute>
                  <Index />
                </ProtectedRoute>
              } />
              <Route path="/leads/:id" element={
                <ProtectedRoute>
                  <LeadDetailPage />
                </ProtectedRoute>
              } />
              <Route path="/inbox" element={
                <ProtectedRoute>
                  <Index />
                </ProtectedRoute>
              } />
              <Route path="/upload-leads" element={
                <ProtectedRoute>
                  <Index />
                </ProtectedRoute>
              } />
              <Route path="/settings" element={
                <ProtectedRoute>
                  <Index />
                </ProtectedRoute>
              } />
              <Route path="/financial-dashboard" element={
                <ProtectedRoute>
                  <Index />
                </ProtectedRoute>
              } />
              <Route path="/inventory-dashboard" element={
                <ProtectedRoute>
                  <StreamlinedPages />
                </ProtectedRoute>
              } />
              <Route path="/inventory-upload" element={
                <ProtectedRoute>
                  <StreamlinedPages />
                </ProtectedRoute>
              } />
              <Route path="/rpo-insights" element={
                <ProtectedRoute>
                  <StreamlinedPages />
                </ProtectedRoute>
              } />
              <Route path="/ai-monitor" element={
                <ProtectedRoute>
                  <AIMonitorPage />
                </ProtectedRoute>
              } />
              <Route path="/advanced-analytics" element={
                <ProtectedRoute>
                  <AdvancedAnalyticsPage />
                </ProtectedRoute>
              } />
              <Route path="/personalization" element={
                <ProtectedRoute>
                  <PersonalizationPage />
                </ProtectedRoute>
              } />
              <Route path="/predictive-analytics" element={
                <ProtectedRoute>
                  <PredictiveAnalyticsPage />
                </ProtectedRoute>
              } />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
