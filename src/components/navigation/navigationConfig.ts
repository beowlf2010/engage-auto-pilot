
import { 
  MessageSquare, 
  Users, 
  BarChart3, 
  Settings, 
  Package,
  Plus,
  Send,
  Eye,
  UserPlus,
  DollarSign,
  Upload
} from 'lucide-react';

export interface NavigationItem {
  path: string;
  label: string;
  icon: any;
  color: string;
  hoverActions: Array<{
    label: string;
    icon: any;
    action: () => void;
  }>;
}

export const getNavigationItems = (role: string, navigate: (path: string) => void): NavigationItem[] => {
  const baseItems: NavigationItem[] = [
    { 
      path: '/smartinbox', 
      label: 'Smart Inbox', 
      icon: MessageSquare,
      color: 'blue',
      hoverActions: [
        { label: 'Send New Message', icon: Send, action: () => navigate('/smartinbox') },
        { label: 'View All Conversations', icon: Eye, action: () => navigate('/smartinbox') }
      ]
    },
    { 
      path: '/leads', 
      label: 'Leads', 
      icon: Users,
      color: 'green',
      hoverActions: [
        { label: 'Add New Lead', icon: UserPlus, action: () => navigate('/upload-leads') },
        { label: 'View All Leads', icon: Eye, action: () => navigate('/leads') }
      ]
    }
  ];

  if (role === 'sales') {
    return [
      ...baseItems,
      { 
        path: '/dash/sales', 
        label: 'My Dashboard', 
        icon: BarChart3,
        color: 'purple',
        hoverActions: [
          { label: 'View Performance', icon: BarChart3, action: () => navigate('/dash/sales') }
        ]
      },
      { 
        path: '/settings', 
        label: 'Settings', 
        icon: Settings,
        color: 'gray',
        hoverActions: [
          { label: 'Configure Settings', icon: Settings, action: () => navigate('/settings') }
        ]
      }
    ];
  }

  if (role === 'manager') {
    return [
      ...baseItems,
      { 
        path: '/dash/manager', 
        label: 'Manager Dashboard', 
        icon: BarChart3,
        color: 'purple',
        hoverActions: [
          { label: 'Sales Dashboard', icon: BarChart3, action: () => navigate('/dash/sales') },
          { label: 'Manager Dashboard', icon: BarChart3, action: () => navigate('/dash/manager') }
        ]
      },
      { 
        path: '/financial-dashboard', 
        label: 'Financial', 
        icon: DollarSign,
        color: 'emerald',
        hoverActions: [
          { label: 'Upload Data', icon: Upload, action: () => navigate('/financial-dashboard') },
          { label: 'View Deals', icon: Eye, action: () => navigate('/financial-dashboard') }
        ]
      },
      { 
        path: '/inventory-dashboard', 
        label: 'Inventory', 
        icon: Package,
        color: 'orange',
        hoverActions: [
          { label: 'Dashboard', icon: BarChart3, action: () => navigate('/inventory-dashboard') },
          { label: 'Upload Inventory', icon: Plus, action: () => navigate('/inventory-upload') },
          { label: 'RPO Insights', icon: Eye, action: () => navigate('/rpo-insights') }
        ]
      },
      { 
        path: '/ai-monitor', 
        label: 'AI Monitor', 
        icon: Settings,
        color: 'red',
        hoverActions: [
          { label: 'Monitor AI Activity', icon: Eye, action: () => navigate('/ai-monitor') }
        ]
      },
      { 
        path: '/settings', 
        label: 'Settings', 
        icon: Settings,
        color: 'gray',
        hoverActions: [
          { label: 'Configure Settings', icon: Settings, action: () => navigate('/settings') }
        ]
      }
    ];
  }

  if (role === 'admin') {
    return [
      ...baseItems,
      { 
        path: '/dash/admin', 
        label: 'Admin Dashboard', 
        icon: BarChart3,
        color: 'purple',
        hoverActions: [
          { label: 'Sales Dashboard', icon: BarChart3, action: () => navigate('/dash/sales') },
          { label: 'Manager Dashboard', icon: BarChart3, action: () => navigate('/dash/manager') },
          { label: 'Admin Dashboard', icon: BarChart3, action: () => navigate('/dash/admin') }
        ]
      },
      { 
        path: '/financial-dashboard', 
        label: 'Financial', 
        icon: DollarSign,
        color: 'emerald',
        hoverActions: [
          { label: 'Upload Data', icon: Upload, action: () => navigate('/financial-dashboard') },
          { label: 'View Deals', icon: Eye, action: () => navigate('/financial-dashboard') }
        ]
      },
      { 
        path: '/inventory-dashboard', 
        label: 'Inventory', 
        icon: Package,
        color: 'orange',
        hoverActions: [
          { label: 'Dashboard', icon: BarChart3, action: () => navigate('/inventory-dashboard') },
          { label: 'Upload Inventory', icon: Plus, action: () => navigate('/inventory-upload') },
          { label: 'RPO Insights', icon: Eye, action: () => navigate('/rpo-insights') }
        ]
      },
      { 
        path: '/ai-monitor', 
        label: 'AI Monitor', 
        icon: Settings,
        color: 'red',
        hoverActions: [
          { label: 'Monitor AI Activity', icon: Eye, action: () => navigate('/ai-monitor') }
        ]
      },
      { 
        path: '/settings', 
        label: 'Settings', 
        icon: Settings,
        color: 'gray',
        hoverActions: [
          { label: 'Configure Settings', icon: Settings, action: () => navigate('/settings') }
        ]
      }
    ];
  }

  return baseItems;
};
