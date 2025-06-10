
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  Users, 
  MessageSquare, 
  Upload, 
  Settings,
  Car,
  Bell
} from "lucide-react";

interface SidebarProps {
  user: {
    id: string;
    email: string;
    role: string;
    firstName: string;
    lastName: string;
  };
  activeView: string;
  onViewChange: (view: string) => void;
}

const Sidebar = ({ user, activeView, onViewChange }: SidebarProps) => {
  const menuItems = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
      roles: ["sales", "manager", "admin"]
    },
    {
      id: "leads",
      label: "Leads",
      icon: Users,
      roles: ["sales", "manager", "admin"]
    },
    {
      id: "inbox",
      label: "Smart Inbox",
      icon: MessageSquare,
      roles: ["sales", "manager", "admin"],
      badge: "3" // Mock unread count
    },
    {
      id: "upload",
      label: "Upload Leads",
      icon: Upload,
      roles: ["manager", "admin"]
    },
    {
      id: "settings",
      label: "Settings",
      icon: Settings,
      roles: ["sales", "manager", "admin"]
    }
  ];

  const filteredItems = menuItems.filter(item => 
    item.roles.includes(user.role)
  );

  return (
    <div className="w-64 bg-white shadow-xl border-r border-slate-200">
      {/* Logo & Branding */}
      <div className="p-6 border-b border-slate-200">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg flex items-center justify-center">
            <Car className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800">Auto Lead AI</h1>
            <p className="text-xs text-slate-500">CRM System</p>
          </div>
        </div>
      </div>

      {/* User Info */}
      <div className="p-4 border-b border-slate-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            <span className="text-white font-semibold text-sm">
              {user.firstName[0]}{user.lastName[0]}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-800 truncate">
              {user.firstName} {user.lastName}
            </p>
            <p className="text-xs text-slate-500 capitalize">{user.role}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="p-4 space-y-2">
        {filteredItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            className={cn(
              "w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-left transition-all duration-200",
              activeView === item.id
                ? "bg-blue-50 text-blue-700 border border-blue-200"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"
            )}
          >
            <item.icon className="w-5 h-5" />
            <span className="flex-1 font-medium">{item.label}</span>
            {item.badge && (
              <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                {item.badge}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* Notification Status */}
      <div className="absolute bottom-4 left-4 right-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="flex items-center space-x-2">
            <Bell className="w-4 h-4 text-green-600" />
            <span className="text-sm text-green-700">Push notifications enabled</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
