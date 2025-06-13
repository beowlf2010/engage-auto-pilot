
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./components/auth/AuthProvider";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import InventoryLayout from "./components/InventoryLayout";
import { 
  SmartInboxPage, 
  SalesDashboardPage, 
  ManagerDashboardPage, 
  AdminDashboardPage,
  StreamlinedLeadsPage,
  AIMonitorPage 
} from "./pages/StreamlinedPages";
import StreamlinedNavigation from "./components/StreamlinedNavigation";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <div className="min-h-screen bg-slate-50">
            <StreamlinedNavigation />
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/dashboard" element={<Index />} />
              <Route path="/smartinbox" element={<SmartInboxPage />} />
              <Route path="/leads" element={<StreamlinedLeadsPage />} />
              <Route path="/dash/sales" element={<SalesDashboardPage />} />
              <Route path="/dash/manager" element={<ManagerDashboardPage />} />
              <Route path="/dash/admin" element={<AdminDashboardPage />} />
              <Route path="/ai-monitor" element={<AIMonitorPage />} />
              <Route path="/inbox" element={<Index />} />
              <Route path="/upload-leads" element={<Index />} />
              <Route path="/settings" element={<Index />} />
              <Route path="/financial-dashboard" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/upload-inventory-report" element={<Index />} />
              <Route path="/inventory-dashboard" element={<InventoryLayout page="dashboard" />} />
              <Route path="/inventory-upload" element={<InventoryLayout page="inventory-upload" />} />
              <Route path="/vehicle-detail/:identifier" element={<InventoryLayout page="vehicle-detail" />} />
              <Route path="/rpo-insights" element={<InventoryLayout page="rpo-insights" />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
