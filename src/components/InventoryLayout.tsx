
import { useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "@/components/auth/AuthProvider";
import { useConversations } from "@/hooks/useConversations";
import { useUnreadCount } from "@/hooks/useUnreadCount";
import Sidebar from "@/components/Sidebar";
import InventoryDashboard from "@/components/InventoryDashboard";
import InventoryUpload from "@/components/InventoryUpload";
import VehicleDetail from "@/components/VehicleDetail";
import RPOInsights from "@/components/RPOInsights";
import BreadcrumbNav from "@/components/inventory/BreadcrumbNav";

interface InventoryLayoutProps {
  page: 'dashboard' | 'inventory-upload' | 'vehicle-detail' | 'rpo-insights';
}

const InventoryLayout = ({ page }: InventoryLayoutProps) => {
  const [activeView, setActiveView] = useState("inventory-dashboard");
  const { profile, loading } = useAuth();
  const { conversations } = useConversations();
  const unreadCount = useUnreadCount(conversations);
  const { identifier } = useParams();

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex">
      <Sidebar 
        user={user} 
        activeView={activeView} 
        onViewChange={setActiveView}
        unreadCount={unreadCount}
      />
      <main className="flex-1 overflow-hidden">
        <div className="h-full p-6">
          <BreadcrumbNav />
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default InventoryLayout;
