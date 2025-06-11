
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
import FinancialDashboard from "./pages/FinancialDashboard";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/dashboard" element={<Index />} />
            <Route path="/leads" element={<Index />} />
            <Route path="/inbox" element={<Index />} />
            <Route path="/upload-leads" element={<Index />} />
            <Route path="/settings" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/upload-inventory-report" element={<Index />} />
            <Route path="/inventory-dashboard" element={<InventoryLayout page="dashboard" />} />
            <Route path="/inventory-upload" element={<InventoryLayout page="inventory-upload" />} />
            <Route path="/vehicle-detail/:identifier" element={<InventoryLayout page="vehicle-detail" />} />
            <Route path="/rpo-insights" element={<InventoryLayout page="rpo-insights" />} />
            <Route path="/financial-dashboard" element={<FinancialDashboard />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
