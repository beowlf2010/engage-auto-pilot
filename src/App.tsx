
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import { AuthProvider } from './components/auth/AuthProvider';
import LeadDetailPage from './pages/LeadDetailPage';
import DashboardPage from './pages/DashboardPage';
import StreamlinedLeadsPage from './pages/StreamlinedLeadsPage';
import SmartInboxPage from './pages/SmartInboxPage';
import InventoryDashboardPage from './pages/InventoryDashboardPage';
import FinancialDashboardPage from './pages/FinancialDashboardPage';
import PredictiveAnalyticsPage from './pages/PredictiveAnalyticsPage';
import MessageExportPage from './pages/MessageExportPage';
import SettingsPage from './pages/SettingsPage';
import AuthPage from './pages/AuthPage';
import { useGlobalAIScheduler } from './hooks/useGlobalAIScheduler';

const queryClient = new QueryClient();

// Global AI Scheduler Component
const GlobalAIScheduler = () => {
  useGlobalAIScheduler();
  return null;
};

function App() {
  console.log('App component rendering');
  
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
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/streamlined-leads" element={<StreamlinedLeadsPage />} />
                <Route path="/smart-inbox" element={<SmartInboxPage />} />
                <Route path="/inventory-dashboard" element={<InventoryDashboardPage />} />
                <Route path="/financial-dashboard" element={<FinancialDashboardPage />} />
                <Route path="/predictive-analytics" element={<PredictiveAnalyticsPage />} />
                <Route path="/message-export" element={<MessageExportPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/lead/:leadId" element={<LeadDetailPage />} />
              </Routes>
            </div>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
