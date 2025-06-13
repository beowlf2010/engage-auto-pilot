
import { useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "@/components/auth/AuthProvider";
import InventoryDashboard from "@/components/InventoryDashboard";
import InventoryUpload from "@/components/InventoryUpload";
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
    lastName: profile.last_name,
    phone: profile.phone
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
        return <InventoryUpload user={user} />;
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
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="dashboard" className="flex items-center space-x-2">
              <Package className="w-4 h-4" />
              <span>Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="upload" className="flex items-center space-x-2">
              <Upload className="w-4 h-4" />
              <span>Upload</span>
            </TabsTrigger>
            <TabsTrigger value="insights" className="flex items-center space-x-2">
              <BarChart3 className="w-4 h-4" />
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
