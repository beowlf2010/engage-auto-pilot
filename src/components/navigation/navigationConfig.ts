
import { LucideIcon, BarChart3, Users, MessageSquare, Upload, Settings, Car, DollarSign, Shield, Brain } from 'lucide-react';

export interface NavigationItem {
  label: string;
  path: string;
  icon: LucideIcon;
  color: string;
  hoverActions?: Array<{
    label: string;
    icon: LucideIcon;
    action: () => void;
  }>;
}

export const getNavigationItems = (userRole: string, navigate: (path: string) => void): NavigationItem[] => {
  const baseItems: NavigationItem[] = [
    {
      label: 'Dashboard',
      path: '/dashboard',
      icon: BarChart3,
      color: 'blue',
      hoverActions: [
        {
          label: 'View Analytics',
          icon: BarChart3,
          action: () => navigate('/dashboard')
        }
      ]
    },
    {
      label: 'Leads',
      path: '/leads',
      icon: Users,
      color: 'green',
      hoverActions: [
        {
          label: 'Add New Lead',
          icon: Users,
          action: () => navigate('/leads')
        }
      ]
    },
    {
      label: 'Smart Inbox',
      path: '/inbox',
      icon: MessageSquare,
      color: 'purple',
      hoverActions: [
        {
          label: 'AI Monitor',
          icon: Shield,
          action: () => navigate('/ai-monitor')
        }
      ]
    },
    {
      label: 'Inventory',
      path: '/inventory-dashboard',
      icon: Car,
      color: 'orange',
      hoverActions: [
        {
          label: 'View Inventory',
          icon: Car,
          action: () => navigate('/inventory-dashboard')
        }
      ]
    }
  ];

  const managerItems: NavigationItem[] = [
    {
      label: 'Predictive Analytics',
      path: '/predictive-analytics',
      icon: Brain,
      color: 'purple',
      hoverActions: [
        {
          label: 'Sales Forecast',
          icon: BarChart3,
          action: () => navigate('/predictive-analytics')
        }
      ]
    },
    {
      label: 'Financial',
      path: '/financial-dashboard',
      icon: DollarSign,
      color: 'red',
      hoverActions: [
        {
          label: 'Upload Reports',
          icon: Upload,
          action: () => navigate('/upload-leads')
        }
      ]
    }
  ];

  const allItems = [...baseItems];

  if (['manager', 'admin'].includes(userRole)) {
    allItems.push(...managerItems);
  }

  // Add settings for all users
  allItems.push({
    label: 'Settings',
    path: '/settings',
    icon: Settings,
    color: 'gray',
    hoverActions: [
      {
        label: 'Account Settings',
        icon: Settings,
        action: () => navigate('/settings')
      }
    ]
  });

  return allItems;
};
