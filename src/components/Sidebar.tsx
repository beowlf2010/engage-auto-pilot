
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/components/auth/AuthProvider";
import AutoVantageLogo from "@/components/navigation/AutoVantageLogo";
import { 
  LayoutDashboard,
  Users,
  Mail,
  Package,
  Car,
  DollarSign,
  ChevronDown,
  ChevronRight,
  Upload,
  Brain,
  Eye,
  BarChart3,
  TrendingUp,
  Settings,
  Shield,
  MessageSquare,
  Palette,
  LogOut
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
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [inventoryExpanded, setInventoryExpanded] = useState(true);
  const [analyticsExpanded, setAnalyticsExpanded] = useState(true);
  const [toolsExpanded, setToolsExpanded] = useState(false);

  const isManagerOrAdmin = ["manager", "admin"].includes(user.role);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const primaryNavigationItems = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
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
      label: "Smart Inbox",
      icon: Mail,
      href: "/smart-inbox",
      badge: unreadCount > 0 ? unreadCount : null
    }
  ];

  const inventoryItems = [
    {
      id: "inventory-dashboard",
      label: "Inventory Dashboard",
      icon: BarChart3,
      href: "/inventory-dashboard",
      badge: null
    },
    {
      id: "upload-inventory",
      label: "Upload Inventory",
      icon: Upload,
      href: "/upload-inventory",
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

  const analyticsItems = [
    {
      id: "financial-dashboard",
      label: "Financial Dashboard",
      icon: DollarSign,
      href: "/financial-dashboard",
      badge: null,
      managerOnly: true
    },
    {
      id: "ai-monitor",
      label: "AI Monitor",
      icon: Eye,
      href: "/ai-monitor",
      badge: null,
      managerOnly: true
    },
    {
      id: "sales-dashboard",
      label: "Sales Dashboard",
      icon: TrendingUp,
      href: "/sales-dashboard",
      badge: null
    },
    {
      id: "analytics",
      label: "Analytics",
      icon: BarChart3,
      href: "/analytics",
      badge: null,
      managerOnly: true
    }
  ];

  const toolsItems = [
    {
      id: "predictive-analytics",
      label: "Predictive Analytics",
      icon: Brain,
      href: "/predictive-analytics",
      badge: null,
      managerOnly: true
    },
    {
      id: "message-export",
      label: "Message Export",
      icon: Upload,
      href: "/message-export",
      badge: "New",
      managerOnly: true
    },
    {
      id: "personalization",
      label: "Personalization",
      icon: Palette,
      href: "/personalization",
      badge: null,
      managerOnly: true
    }
  ];

  const adminItems = isManagerOrAdmin ? [
    {
      id: "admin-dashboard",
      label: "Admin Dashboard",
      icon: Shield,
      href: "/admin-dashboard",
      badge: null,
      adminOnly: true
    },
    {
      id: "manager-dashboard",
      label: "Manager Dashboard",
      icon: BarChart3,
      href: "/manager-dashboard",
      badge: null
    }
  ] : [];

  const renderNavItem = (item: any, isSubItem = false) => {
    if (item.managerOnly && !isManagerOrAdmin) return null;
    if (item.adminOnly && user.role !== 'admin') return null;

    const isActive = location.pathname === item.href || 
      (item.href === '/inventory-dashboard' && location.pathname.startsWith('/inventory'));
    
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
          <Badge variant="secondary" className={cn(
            item.badge === "New" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
          )}>
            {item.badge}
          </Badge>
        )}
      </Link>
    );
  };

  const renderSection = (title: string, items: any[], expanded: boolean, onToggle: () => void, icon: any) => {
    const Icon = icon;
    return (
      <div className="pt-4">
        <Button
          variant="ghost"
          className="w-full justify-between px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900"
          onClick={onToggle}
        >
          <div className="flex items-center space-x-3">
            <Icon className="w-4 h-4" />
            <span>{title}</span>
          </div>
          {expanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </Button>
        {expanded && (
          <div className="mt-1 space-y-1">
            {items.map(item => renderNavItem(item, true))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-64 bg-white border-r border-slate-200 flex flex-col h-screen">
      {/* Header */}
      <div className="p-6 border-b border-slate-200">
        <AutoVantageLogo />
        <div className="mt-4">
          <p className="text-sm font-medium text-slate-800">
            {user.firstName} {user.lastName}
          </p>
          <p className="text-xs text-slate-500 capitalize">{user.role}</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {/* Primary Navigation */}
        <div className="space-y-1">
          {primaryNavigationItems.map(item => renderNavItem(item))}
        </div>

        {/* Inventory Section */}
        {renderSection("Inventory", inventoryItems, inventoryExpanded, () => setInventoryExpanded(!inventoryExpanded), Package)}

        {/* Analytics Section */}
        {renderSection("Analytics", analyticsItems, analyticsExpanded, () => setAnalyticsExpanded(!analyticsExpanded), BarChart3)}

        {/* Tools Section - Manager/Admin Only */}
        {isManagerOrAdmin && renderSection("Tools", toolsItems, toolsExpanded, () => setToolsExpanded(!toolsExpanded), Brain)}

        {/* Admin Items */}
        {adminItems.length > 0 && (
          <div className="pt-4 border-t border-slate-200">
            <div className="space-y-1">
              {adminItems.map(item => renderNavItem(item))}
            </div>
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

      {/* Sign Out */}
      <div className="p-4 border-t border-slate-200">
        <Button
          variant="ghost"
          onClick={handleSignOut}
          className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          <LogOut className="w-4 h-4 mr-3" />
          Sign Out
        </Button>
      </div>
    </div>
  );
};

export default Sidebar;
