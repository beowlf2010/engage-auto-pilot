
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
  Upload
} from "lucide-react"

interface NavConfig {
  title: string
  href: string
  icon: any
  roles: string[]
  badge?: string
}

export interface NavigationItem {
  path: string;
  label: string;
  icon: any;
  badge?: string;
  color?: string;
  hoverActions?: Array<{
    label: string;
    icon: any;
    action: () => void;
  }>;
}

export const navigationConfig: NavConfig[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: ["admin", "manager", "salesperson"],
  },
  {
    title: "Leads",
    href: "/leads",
    icon: Users,
    roles: ["admin", "manager", "salesperson"],
  },
  {
    title: "Streamlined Leads",
    href: "/streamlined-leads",
    icon: User,
    roles: ["admin", "manager", "salesperson"],
  },
  {
    title: "Smart Inbox",
    href: "/smart-inbox",
    icon: Mail,
    roles: ["admin", "manager", "salesperson"],
  },
  {
    title: "Inventory",
    href: "/inventory",
    icon: Package,
    roles: ["admin", "manager", "salesperson"],
  },
  {
    title: "Predictive Analytics",
    href: "/predictive-analytics",
    icon: Brain,
    roles: ["admin", "manager"],
  },
  {
    title: "Message Export",
    href: "/message-export",
    icon: Upload,
    roles: ["admin", "manager"],
    badge: "New"
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
    roles: ["admin"],
  },
]

export const getNavigationItems = (userRole: string): NavigationItem[] => {
  console.log('getNavigationItems called with role:', userRole);
  
  if (!userRole) {
    console.warn('getNavigationItems: No user role provided');
    return [];
  }
  
  const items = navigationConfig
    .filter(item => {
      const hasAccess = item.roles.includes(userRole);
      console.log(`getNavigationItems: Item "${item.title}" - roles: [${item.roles.join(', ')}], user role: ${userRole}, has access: ${hasAccess}`);
      return hasAccess;
    })
    .map(item => ({
      path: item.href,
      label: item.title,
      icon: item.icon,
      badge: item.badge,
      color: getItemColor(item.title),
      hoverActions: []
    }));
  
  console.log('getNavigationItems returning:', items.length, 'items:', items.map(i => i.label));
  
  // Specific debug for inventory
  const inventoryItem = items.find(item => item.path === '/inventory');
  console.log('getNavigationItems: Inventory item in result:', inventoryItem);
  
  return items;
};

const getItemColor = (title: string): string => {
  const colorMap: { [key: string]: string } = {
    'Dashboard': 'blue',
    'Leads': 'green',
    'Streamlined Leads': 'purple',
    'Smart Inbox': 'orange',
    'Inventory': 'red',
    'Predictive Analytics': 'blue',
    'Message Export': 'gray',
    'Settings': 'gray'
  };
  return colorMap[title] || 'blue';
};
