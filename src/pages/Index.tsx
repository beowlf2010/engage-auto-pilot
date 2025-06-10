
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/Sidebar";
import Dashboard from "@/components/Dashboard";
import LeadsList from "@/components/LeadsList";
import UploadLeads from "@/components/UploadLeads";
import Settings from "@/components/Settings";
import SmartInbox from "@/components/SmartInbox";

// Mock user data - in real app this would come from Supabase JWT
const mockUser = {
  id: "1",
  email: "john.doe@dealership.com",
  role: "manager", // sales, manager, admin
  firstName: "John",
  lastName: "Doe",
  phone: "+1234567890"
};

const Index = () => {
  const [activeView, setActiveView] = useState("dashboard");
  const [user] = useState(mockUser);
  const { toast } = useToast();

  // Simulate push notifications for incoming messages
  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > 0.95) { // 5% chance every 5 seconds
        toast({
          title: "New Message Received",
          description: "Sarah Johnson replied to your follow-up",
          duration: 5000,
        });
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [toast]);

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
      <Sidebar user={user} activeView={activeView} onViewChange={setActiveView} />
      <main className="flex-1 overflow-hidden">
        <div className="h-full p-6">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default Index;
