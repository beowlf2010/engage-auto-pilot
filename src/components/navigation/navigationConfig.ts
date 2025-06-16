
import {
  Home,
  LayoutDashboard,
  Settings,
  User,
  Users,
  Calendar,
  Mail,
  Package,
  TrendingUp,
  BarChart3,
  Brain,
  Upload,
  ChevronDown,
  LogOut
} from "lucide-react"

interface NavConfig {
  title: string
  href: string
  icon: any
  roles: string[]
  badge?: string
  priority: 'primary' | 'secondary'
}

export interface NavigationItem {
  path: string;
  label: string;
  icon: any;
  badge?: string;
  color?: string;
  priority: 'primary' | 'secondary';
  hoverActions?: Array<{
    label: string;
    icon: any;
    action: () => void;
  }>;
}

export const navigationConfig: NavConfig[] = [
  // Primary navigation items
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: ["admin", "manager", "salesperson"],
    priority: 'primary'
  },
  {
    title: "Leads",
    href: "/streamlined-leads",
    icon: Users,
    roles: ["admin", "manager", "salesperson"],
    priority: 'primary'
  },
  {
    title: "Inbox",
    href: "/smart-inbox",
    icon: Mail,
    roles: ["admin", "manager", "salesperson"],
    priority: 'primary'
  },
  {
    title: "Inventory",
    href: "/inventory-dashboard",
    icon: Package,
    roles: ["admin", "manager", "salesperson"],
    priority: 'primary'
  },
  {
    title: "Financial Dashboard",
    href: "/financial-dashboard",
    icon: BarChart3,
    roles: ["admin", "manager"],
    priority: 'primary'
  },
  
  // Secondary navigation items (for dropdown)
  {
    title: "Predictive Analytics",
    href: "/predictive-analytics",
    icon: Brain,
    roles: ["admin", "manager"],
    priority: 'secondary'
  },
  {
    title: "Message Export",
    href: "/message-export",
    icon: Upload,
    roles: ["admin", "manager"],
    badge: "New",
    priority: 'secondary'
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
    roles: ["admin"],
    priority: 'secondary'
  },
]

export const getNavigationItems = (userRole: string, navigate: (path: string) => void): NavigationItem[] => {
  return navigationConfig
    .filter(item => item.roles.includes(userRole))
    .map(item => ({
      path: item.href,
      label: item.title,
      icon: item.icon,
      badge: item.badge,
      color: 'blue',
      priority: item.priority,
      hoverActions: []
    }));
};
