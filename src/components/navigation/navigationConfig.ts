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
  Phone
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
    label: 'Analytics',
    href: '/analytics',
    icon: TrendingUp,
    access: ['admin', 'manager']
  },
  {
    label: 'Settings',
    href: '/settings',
    icon: Settings,
    access: ['admin', 'manager']
  }
];
