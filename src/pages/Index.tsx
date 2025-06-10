
import { useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { useConversations } from "@/hooks/useConversations";
import { useUnreadCount } from "@/hooks/useUnreadCount";
import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";
import Sidebar from "@/components/Sidebar";
import Dashboard from "@/components/Dashboard";
import LeadsList from "@/components/LeadsList";
import UploadLeads from "@/components/UploadLeads";
import Settings from "@/components/Settings";
import SmartInbox from "@/components/SmartInbox";

const Index = () => {
  const [activeView, setActiveView] = useState("dashboard");
  const { profile, loading } = useAuth();
  const { toast } = useToast();
  const { conversations } = useConversations();
  const unreadCount = useUnreadCount(conversations);
  
  // Initialize real-time notifications
  useRealtimeNotifications();

  if (loading || !profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  // Transform profile data to match expected user structure
  const user = {
    id: profile.id,
    email: profile.email,
    role: profile.role,
    firstName: profile.first_name,
    lastName: profile.last_name,
    phone: profile.phone
  };

  const renderContent = () => {
    switch (activeView) {
      case "dashboard":
        return <Dashboard user={user} />;
      case "leads":
        return <LeadsList user={user} />;
      case "inbox":
        return <SmartInbox user={user} />;
      case "upload":
        return <UploadLeads user={user} />;
      case "settings":
        return <Settings user={user} />;
      default:
        return <Dashboard user={user} />;
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
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default Index;
