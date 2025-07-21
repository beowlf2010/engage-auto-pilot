
import { useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "@/components/auth/AuthProvider";
import InventoryDashboard from "@/components/InventoryDashboard";
import EnhancedInventoryUpload from "@/components/inventory-upload/EnhancedInventoryUpload";
import VehicleDetail from "@/components/VehicleDetail";
import RPOInsights from "@/components/RPOInsights";
import BreadcrumbNav from "@/components/inventory/BreadcrumbNav";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Package, Upload, BarChart3, Car } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

interface InventoryLayoutProps {
  page: 'dashboard' | 'inventory-upload' | 'vehicle-detail' | 'rpo-insights';
}

const InventoryLayout = ({ page }: InventoryLayoutProps) => {
  const { profile, loading } = useAuth();
  const { identifier } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  if (loading || !profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  const user = {
    id: profile.id,
    email: profile.email,
    role: profile.role,
    firstName: profile.first_name,
    lastName: profile.last_name
  };

  const getActiveTab = () => {
    if (location.pathname === '/inventory-dashboard') return 'dashboard';
    if (location.pathname === '/inventory-upload') return 'upload';
    if (location.pathname === '/rpo-insights') return 'insights';
    if (location.pathname.startsWith('/vehicle-detail/')) return 'dashboard';
    return 'dashboard';
  };

  const handleTabChange = (value: string) => {
    switch (value) {
      case 'dashboard':
        navigate('/inventory-dashboard');
        break;
      case 'upload':
        navigate('/inventory-upload');
        break;
      case 'insights':
        navigate('/rpo-insights');
        break;
    }
  };

  const renderContent = () => {
    switch (page) {
      case 'dashboard':
        return <InventoryDashboard />;
      case 'inventory-upload':
        return <EnhancedInventoryUpload userId={user.id} />;
      case 'vehicle-detail':
        return <VehicleDetail />;
      case 'rpo-insights':
        return <RPOInsights />;
      default:
        return <InventoryDashboard />;
    }
  };

  // Don't show tabs on vehicle detail page
  const showTabs = page !== 'vehicle-detail';

  return (
    <div className="container mx-auto py-6">
      <BreadcrumbNav />
      
      {showTabs ? (
        <Tabs value={getActiveTab()} onValueChange={handleTabChange} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-transparent gap-3 h-auto p-0">
            <TabsTrigger 
              value="dashboard" 
              className="flex items-center space-x-2 bg-blue-50 text-blue-700 border-2 border-blue-200 hover:bg-blue-100 hover:border-blue-300 data-[state=active]:bg-blue-500 data-[state=active]:text-white data-[state=active]:border-blue-500 data-[state=active]:shadow-lg transition-all duration-200 rounded-lg py-3 px-4 font-semibold"
            >
              <Package className="w-5 h-5" />
              <span>Dashboard</span>
            </TabsTrigger>
            <TabsTrigger 
              value="upload" 
              className="flex items-center space-x-2 bg-green-50 text-green-700 border-2 border-green-200 hover:bg-green-100 hover:border-green-300 data-[state=active]:bg-green-500 data-[state=active]:text-white data-[state=active]:border-green-500 data-[state=active]:shadow-lg transition-all duration-200 rounded-lg py-3 px-4 font-semibold"
            >
              <Upload className="w-5 h-5" />
              <span>Upload</span>
            </TabsTrigger>
            <TabsTrigger 
              value="insights" 
              className="flex items-center space-x-2 bg-orange-50 text-orange-700 border-2 border-orange-200 hover:bg-orange-100 hover:border-orange-300 data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=active]:border-orange-500 data-[state=active]:shadow-lg transition-all duration-200 rounded-lg py-3 px-4 font-semibold"
            >
              <BarChart3 className="w-5 h-5" />
              <span>RPO Insights</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value={getActiveTab()} className="space-y-6">
            {renderContent()}
          </TabsContent>
        </Tabs>
      ) : (
        <div className="space-y-6">
          {renderContent()}
        </div>
      )}
    </div>
  );
};

export default InventoryLayout;
