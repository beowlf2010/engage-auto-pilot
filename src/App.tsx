
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import { AuthProvider } from './components/auth/AuthProvider';
import NavWrapper from './components/nav/NavWrapper';
import TestPage from './pages/TestPage';
import LeadsPage from './pages/LeadsPage';
import InboxPage from './pages/InboxPage';
import SettingsPage from './pages/SettingsPage';
import AnalyticsPage from './pages/AnalyticsPage';
import LeadDetailPage from './pages/LeadDetailPage';
import VINImportPage from './pages/VINImportPage';
import KnowledgeBasePage from './pages/KnowledgeBasePage';
import { useGlobalAIScheduler } from './hooks/useGlobalAIScheduler';

const queryClient = new QueryClient();

// Global AI Scheduler Component
const GlobalAIScheduler = () => {
  useGlobalAIScheduler();
  return null;
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <GlobalAIScheduler />
            <div className="min-h-screen bg-gray-50">
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/*" element={
                  <NavWrapper>
                    <Routes>
                      <Route path="/test" element={<TestPage />} />
                      <Route path="/leads" element={<LeadsPage />} />
                      <Route path="/lead/:id" element={<LeadDetailPage />} />
                      <Route path="/inbox" element={<InboxPage />} />
                      <Route path="/settings" element={<SettingsPage />} />
                      <Route path="/analytics" element={<AnalyticsPage />} />
                      <Route path="/vin-import" element={<VINImportPage />} />
                      <Route path="/knowledge-base" element={<KnowledgeBasePage />} />
                    </Routes>
                  </NavWrapper>
                } />
              </Routes>
            </div>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
