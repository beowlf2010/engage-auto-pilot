import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  MessageSquare, 
  Users, 
  Settings, 
  BarChart3, 
  Upload,
  Package,
  Car,
  DollarSign,
  ChevronDown,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";

interface User {
  id: string;
  email: string;
  role: string;
  firstName: string;
  lastName: string;
}

interface SidebarProps {
  user: User;
  activeView: string;
  onViewChange: (view: string) => void;
  unreadCount: number;
}

const Sidebar = ({ user, activeView, onViewChange, unreadCount }: SidebarProps) => {
  const location = useLocation();
  const [inventoryExpanded, setInventoryExpanded] = useState(true);
  const [financialExpanded, setFinancialExpanded] = useState(true);

  const isManagerOrAdmin = ["manager", "admin"].includes(user.role);

  const navigationItems = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: BarChart3,
      href: "/dashboard",
      badge: null
    },
    {
      id: "leads",
      label: "Leads",
      icon: Users,
      href: "/leads",
      badge: null
    },
    {
      id: "inbox",
      label: "Inbox",
      icon: MessageSquare,
      href: "/inbox",
      badge: unreadCount > 0 ? unreadCount : null
    }
  ];

  const managerItems = [
    {
      id: "upload-leads",
      label: "Upload Leads",
      icon: Upload,
      href: "/upload-leads",
      badge: null
    }
  ];

  const inventoryItems = [
    {
      id: "inventory-dashboard",
      label: "Dashboard",
      icon: BarChart3,
      href: "/inventory-dashboard",
      badge: null
    },
    {
      id: "inventory-upload",
      label: "Upload Inventory",
      icon: Upload,
      href: "/inventory-upload",
      badge: null,
      managerOnly: true
    },
    {
      id: "rpo-insights",
      label: "RPO Insights",
      icon: Car,
      href: "/rpo-insights",
      badge: null
    }
  ];

  const financialItems = [
    {
      id: "financial-dashboard",
      label: "Financial Dashboard",
      icon: DollarSign,
      href: "/financial-dashboard",
      badge: null,
      managerOnly: true
    }
  ];

  const renderNavItem = (item: any, isSubItem = false) => {
    if (item.managerOnly && !isManagerOrAdmin) return null;

    const isActive = location.pathname === item.href;
    
    return (
      <Link
        key={item.id}
        to={item.href}
        className={cn(
          "flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors",
          isSubItem && "ml-6",
          isActive
            ? "bg-blue-100 text-blue-700"
            : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
        )}
        onClick={() => onViewChange(item.id)}
      >
        <div className="flex items-center space-x-3">
          <item.icon className="w-4 h-4" />
          <span>{item.label}</span>
        </div>
        {item.badge && (
          <Badge variant="secondary" className="bg-red-100 text-red-700">
            {item.badge}
          </Badge>
        )}
      </Link>
    );
  };

  return (
    <div className="w-64 bg-white border-r border-slate-200 flex flex-col h-screen">
      {/* Header */}
      <div className="p-6 border-b border-slate-200">
        <h2 className="text-xl font-bold text-slate-800">CRM Dashboard</h2>
        <p className="text-sm text-slate-600 mt-1">
          {user.firstName} {user.lastName}
        </p>
        <p className="text-xs text-slate-500 capitalize">{user.role}</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {/* Main Navigation */}
        <div className="space-y-1">
          {navigationItems.map(item => renderNavItem(item))}
          {isManagerOrAdmin && managerItems.map(item => renderNavItem(item))}
        </div>

        {/* Inventory Section */}
        <div className="pt-4">
          <Button
            variant="ghost"
            className="w-full justify-between px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900"
            onClick={() => setInventoryExpanded(!inventoryExpanded)}
          >
            <div className="flex items-center space-x-3">
              <Package className="w-4 h-4" />
              <span>Inventory</span>
            </div>
            {inventoryExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </Button>
          {inventoryExpanded && (
            <div className="mt-1 space-y-1">
              {inventoryItems.map(item => renderNavItem(item, true))}
            </div>
          )}
        </div>

        {/* Financial Section - Manager/Admin Only */}
        {isManagerOrAdmin && (
          <div className="pt-4">
            <Button
              variant="ghost"
              className="w-full justify-between px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900"
              onClick={() => setFinancialExpanded(!financialExpanded)}
            >
              <div className="flex items-center space-x-3">
                <DollarSign className="w-4 h-4" />
                <span>Financial</span>
              </div>
              {financialExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </Button>
            {financialExpanded && (
              <div className="mt-1 space-y-1">
                {financialItems.map(item => renderNavItem(item, true))}
              </div>
            )}
          </div>
        )}

        {/* Settings */}
        <div className="pt-4 border-t border-slate-200">
          <Link
            to="/settings"
            className={cn(
              "flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
              location.pathname === "/settings"
                ? "bg-blue-100 text-blue-700"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            )}
          >
            <Settings className="w-4 h-4" />
            <span>Settings</span>
          </Link>
        </div>
      </nav>
    </div>
  );
};

export default Sidebar;
