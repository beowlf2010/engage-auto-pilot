
import { useState } from "react";
import { 
  Home, 
  Users, 
  MessageSquare, 
  Upload, 
  Settings,
  Car,
  Menu,
  X,
  LogOut,
  Package,
  BarChart3
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation } from "react-router-dom";

interface SidebarProps {
  user: {
    firstName: string;
    lastName: string;
    role: string;
  };
  activeView: string;
  onViewChange: (view: string) => void;
  unreadCount: number;
}

const Sidebar = ({ user, activeView, onViewChange, unreadCount }: SidebarProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { toast } = useToast();
  const location = useLocation();

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: "Signed out successfully",
        description: "You have been logged out of your account",
      });
    } catch (error) {
      toast({
        title: "Error signing out",
        description: "There was a problem signing you out",
        variant: "destructive",
      });
    }
  };

  // Main navigation items - now using proper routing
  const mainNavigation = [
    { id: "dashboard", label: "Dashboard", icon: Home, path: "/" },
    { id: "leads", label: "Leads", icon: Users, path: "/leads" },
    { 
      id: "inbox", 
      label: "Smart Inbox", 
      icon: MessageSquare,
      path: "/inbox",
      badge: unreadCount > 0 ? unreadCount : undefined
    },
    ...(["manager", "admin"].includes(user.role) ? [
      { id: "upload", label: "Upload Leads", icon: Upload, path: "/upload-leads" }
    ] : []),
    { id: "settings", label: "Settings", icon: Settings, path: "/settings" },
  ];

  // Inventory management section for managers/admins
  const inventoryNavigation = ["manager", "admin"].includes(user.role) ? [
    { 
      id: "inventory-dashboard", 
      label: "Dashboard", 
      icon: Package,
      path: "/inventory-dashboard"
    },
    { 
      id: "inventory-upload", 
      label: "Upload Inventory", 
      icon: Car,
      path: "/inventory-upload"
    },
    { 
      id: "rpo-insights", 
      label: "RPO Insights", 
      icon: BarChart3,
      path: "/rpo-insights"
    }
  ] : [];

  const isInventoryRoute = location.pathname.startsWith('/inventory') || 
                          location.pathname.startsWith('/vehicle-detail') || 
                          location.pathname.startsWith('/rpo-insights');

  return (
    <div className={`bg-white border-r border-slate-200 transition-all duration-300 ${
      isCollapsed ? "w-20" : "w-64"
    } flex flex-col h-screen`}>
      {/* Header */}
      <div className="p-4 border-b border-slate-200 flex items-center justify-between">
        {!isCollapsed && (
          <div>
            <h1 className="font-bold text-xl text-slate-800">CRM</h1>
            <p className="text-sm text-slate-600">Sales Dashboard</p>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-2"
        >
          {isCollapsed ? <Menu className="w-4 h-4" /> : <X className="w-4 h-4" />}
        </Button>
      </div>

      {/* User Info */}
      {!isCollapsed && (
        <div className="p-4 border-b border-slate-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium">
              {user.firstName[0]}{user.lastName[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-800 truncate">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-xs text-slate-600 capitalize">{user.role}</p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {/* Main Navigation */}
        {mainNavigation.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <Link key={item.id} to={item.path}>
              <Button
                variant={isActive ? "default" : "ghost"}
                className={`w-full justify-start ${isCollapsed ? "px-3" : ""}`}
                onClick={() => onViewChange(item.id)}
              >
                <Icon className={`w-4 h-4 ${isCollapsed ? "" : "mr-3"}`} />
                {!isCollapsed && (
                  <>
                    <span className="flex-1 text-left">{item.label}</span>
                    {item.badge && (
                      <Badge variant="destructive" className="ml-2">
                        {item.badge}
                      </Badge>
                    )}
                  </>
                )}
              </Button>
            </Link>
          );
        })}

        {/* Inventory Management Section */}
        {inventoryNavigation.length > 0 && (
          <>
            {!isCollapsed && (
              <div className="pt-4">
                <div className="text-xs font-medium text-slate-500 uppercase tracking-wider px-3 pb-2">
                  Inventory Management
                </div>
              </div>
            )}

            {inventoryNavigation.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              
              return (
                <Link key={item.id} to={item.path}>
                  <Button
                    variant={isActive ? "default" : "ghost"}
                    className={`w-full justify-start ${isCollapsed ? "px-3" : ""}`}
                  >
                    <Icon className={`w-4 h-4 ${isCollapsed ? "" : "mr-3"}`} />
                    {!isCollapsed && (
                      <span className="flex-1 text-left">{item.label}</span>
                    )}
                  </Button>
                </Link>
              );
            })}
          </>
        )}
      </nav>

      {/* Sign Out */}
      <div className="p-4 border-t border-slate-200">
        <Button
          variant="ghost"
          className={`w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 ${
            isCollapsed ? "px-3" : ""
          }`}
          onClick={handleSignOut}
        >
          <LogOut className={`w-4 h-4 ${isCollapsed ? "" : "mr-3"}`} />
          {!isCollapsed && "Sign Out"}
        </Button>
      </div>
    </div>
  );
};

export default Sidebar;
