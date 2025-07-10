import {
  BarChart3,
  MessageSquare,
  Users,
  Package,
  DollarSign,
  Bot,
  TrendingUp,
  Settings,
  Brain,
  Phone,
  User,
  Upload,
  Shield,
  Palette,
  FileSpreadsheet,
  Zap,
  Bell,
  Activity,
  Workflow,
  Thermometer
} from 'lucide-react';

export interface NavigationItem {
  label: string;
  href: string;
  icon: any;
  access: string[];
  badge?: { type: 'unread' };
}

export const navigationItems: NavigationItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: BarChart3,
    access: ['admin', 'manager', 'sales']
  },
  {
    label: 'Smart Inbox',
    href: '/smart-inbox',
    icon: MessageSquare,
    access: ['admin', 'manager', 'sales'],
    badge: { type: 'unread' }
  },
  {
    label: 'Leads',
    href: '/leads',
    icon: Users,
    access: ['admin', 'manager', 'sales']
  },
  {
    label: 'Upload Leads',
    href: '/upload-leads',
    icon: FileSpreadsheet,
    access: ['admin', 'manager']
  },
  {
    label: 'Auto-Dialing',
    href: '/auto-dialing',
    icon: Phone,
    access: ['admin', 'manager', 'sales']
  },
  {
    label: 'Inventory',
    href: '/inventory-dashboard',
    icon: Package,
    access: ['admin', 'manager', 'sales']
  },
  {
    label: 'Upload Inventory',
    href: '/upload-inventory',
    icon: Upload,
    access: ['admin', 'manager']
  },
  {
    label: 'RPO Insights',
    href: '/rpo-insights',
    icon: Brain,
    access: ['admin', 'manager']
  },
  {
    label: 'RPO Database',
    href: '/rpo-database',
    icon: Package,
    access: ['admin', 'manager']
  },
  {
    label: 'Financial',
    href: '/financial-dashboard',
    icon: DollarSign,
    access: ['admin', 'manager']
  },
  {
    label: 'AI Monitor',
    href: '/ai-monitor',
    icon: Bot,
    access: ['admin', 'manager']
  },
  {
    label: 'AI Dashboard',
    href: '/ai-dashboard',
    icon: Zap,
    access: ['admin', 'manager', 'sales']
  },
  {
    label: 'AI Performance',
    href: '/ai-performance',
    icon: Brain,
    access: ['admin', 'manager']
  },
  {
    label: 'AI Training',
    href: '/ai-training',
    icon: TrendingUp,
    access: ['admin', 'manager']
  },
  {
    label: 'AI Opt-In Management',
    href: '/ai-opt-ins',
    icon: Bot,
    access: ['admin', 'manager']
  },
  {
    label: 'AI Notifications',
    href: '/ai-notifications',
    icon: Bell,
    access: ['admin', 'manager', 'sales']
  },
  {
    label: 'AI Analytics',
    href: '/ai-analytics',
    icon: Activity,
    access: ['admin', 'manager']
  },
  {
    label: 'AI Workflows',
    href: '/ai-workflows',
    icon: Workflow,
    access: ['admin', 'manager']
  },
  {
    label: 'Lead Temperature',
    href: '/ai-temperature',
    icon: Thermometer,
    access: ['admin', 'manager', 'sales']
  },
  {
    label: 'Sales Dashboard',
    href: '/sales-dashboard',
    icon: TrendingUp,
    access: ['admin', 'manager', 'sales']
  },
  {
    label: 'Analytics',
    href: '/analytics',
    icon: TrendingUp,
    access: ['admin', 'manager']
  },
  {
    label: 'Predictive Analytics',
    href: '/predictive-analytics',
    icon: Brain,
    access: ['admin', 'manager']
  },
  {
    label: 'Message Export',
    href: '/message-export',
    icon: Upload,
    access: ['admin', 'manager']
  },
  {
    label: 'Personalization',
    href: '/personalization',
    icon: Palette,
    access: ['admin', 'manager']
  },
  {
    label: 'Admin Dashboard',
    href: '/admin-dashboard',
    icon: Shield,
    access: ['admin']
  },
  {
    label: 'Manager Dashboard',
    href: '/manager-dashboard',
    icon: BarChart3,
    access: ['admin', 'manager']
  },
  {
    label: 'Sales Profile',
    href: '/sales-profile',
    icon: User,
    access: ['admin', 'manager', 'sales']
  },
  {
    label: 'Settings',
    href: '/settings',
    icon: Settings,
    access: ['admin', 'manager']
  }
];
