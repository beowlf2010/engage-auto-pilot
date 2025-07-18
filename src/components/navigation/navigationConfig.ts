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
    label: 'Upload Data',
    href: '/data-upload',
    icon: Upload,
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
    label: 'AI Opt-In Manager',
    href: '/ai-opt-ins',
    icon: Brain,
    access: ['admin', 'manager']
  },
  // Simplified AI section - all functionality moved to AI Dashboard
  {
    label: 'Call Analysis',
    href: '/call-analysis',
    icon: Phone,
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
