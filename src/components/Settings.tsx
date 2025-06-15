import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { 
  Clock, 
  Key, 
  Users, 
  Bot,
  Save,
  Brain,
  Mail,
  ShieldCheck
} from "lucide-react";
import UserManagementTable from "./user-management/UserManagementTable";
import CadenceSettings from "./settings/CadenceSettings";
import BusinessHoursSettings from "./settings/BusinessHoursSettings";
import ApiKeysSettings from "./settings/ApiKeysSettings";
import EnhancedAISettings from "./settings/EnhancedAISettings";
import EmailSettings from "./settings/EmailSettings";
import { ComplianceAuditExport, ComplianceDisclaimers } from "./settings/ComplianceSettings";
import CommsSettingsPanel from "./settings/CommsSettingsPanel";

interface SettingsProps {
  user: {
    role: string;
  };
}

const Settings = ({ user }: SettingsProps) => {
  const [activeTab, setActiveTab] = useState("cadence");
  const { toast } = useToast();

  const tabs = [
    { id: "cadence", label: "AI Cadence", icon: Bot, roles: ["sales", "manager", "admin"] },
    { id: "enhanced", label: "Enhanced AI", icon: Brain, roles: ["manager", "admin"] },
    { id: "business", label: "Business Hours", icon: Clock, roles: ["sales", "manager", "admin"] },
    { id: "email", label: "Email Settings", icon: Mail, roles: ["sales", "manager", "admin"] },
    { id: "compliance", label: "Compliance", icon: ShieldCheck, roles: ["manager", "admin"] },
    { id: "api", label: "API Keys", icon: Key, roles: ["admin"] },
    { id: "users", label: "User Management", icon: Users, roles: ["manager", "admin"] },
    { id: "comms", label: "Comms Settings", icon: ShieldCheck, roles: ["admin"] }
  ];

  const filteredTabs = tabs.filter(tab => tab.roles.includes(user.role));

  const handleSave = () => {
    toast({
      title: "Settings saved",
      description: "Your changes have been saved successfully"
    });
  };

  const renderContent = () => {
    switch (activeTab) {
      case "cadence": 
        return <CadenceSettings userRole={user.role} />;
      case "enhanced": 
        return <EnhancedAISettings userRole={user.role} />;
      case "business": 
        return <BusinessHoursSettings userRole={user.role} />;
      case "email": 
        return <EmailSettings userRole={user.role} />;
      case "compliance":
        return (
          <div className="space-y-6">
            <ComplianceAuditExport />
            <ComplianceDisclaimers />
          </div>
        );
      case "api": 
        return <ApiKeysSettings userRole={user.role} />;
      case "users": 
        return <UserManagementTable currentUserRole={user.role} />;
      case "comms":
        return <CommsSettingsPanel />;
      default: 
        return <CadenceSettings userRole={user.role} />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Settings</h1>
          <p className="text-slate-600 mt-1">Configure your CRM system preferences</p>
        </div>
        {user.role !== "sales" && activeTab !== "users" && activeTab !== "api" && activeTab !== "enhanced" && activeTab !== "email" && (
          <Button onClick={handleSave} className="mt-4 md:mt-0">
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-8">
          {filteredTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      {renderContent()}
    </div>
  );
};

export default Settings;
