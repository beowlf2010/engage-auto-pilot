import React from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { Button } from '@/components/ui/button';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  MessageSquare, 
  Users, 
  BarChart3, 
  Settings, 
  Package,
  Plus,
  Send,
  Eye,
  UserPlus
} from 'lucide-react';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@/components/ui/navigation-menu';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';

const StreamlinedNavigation = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (!profile) return null;

  const getNavItems = () => {
    const baseItems = [
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

    if (profile.role === 'sales') {
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

    if (profile.role === 'manager') {
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

    if (profile.role === 'admin') {
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

  const getColorClasses = (color: string, isActive: boolean) => {
    const colorMap = {
      blue: {
        active: 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg',
        hover: 'hover:bg-blue-50 hover:text-blue-700 border-b-2 border-transparent hover:border-blue-500'
      },
      green: {
        active: 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg',
        hover: 'hover:bg-green-50 hover:text-green-700 border-b-2 border-transparent hover:border-green-500'
      },
      purple: {
        active: 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg',
        hover: 'hover:bg-purple-50 hover:text-purple-700 border-b-2 border-transparent hover:border-purple-500'
      },
      orange: {
        active: 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg',
        hover: 'hover:bg-orange-50 hover:text-orange-700 border-b-2 border-transparent hover:border-orange-500'
      },
      red: {
        active: 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg',
        hover: 'hover:bg-red-50 hover:text-red-700 border-b-2 border-transparent hover:border-red-500'
      },
      gray: {
        active: 'bg-gradient-to-r from-gray-500 to-gray-600 text-white shadow-lg',
        hover: 'hover:bg-gray-50 hover:text-gray-700 border-b-2 border-transparent hover:border-gray-500'
      }
    };

    return isActive ? colorMap[color]?.active : colorMap[color]?.hover || '';
  };

  const navItems = getNavItems();

  return (
    <nav className="bg-white border-b border-slate-200 px-6 py-3 shadow-sm">
      <div className="flex items-center space-x-2">
        <div 
          className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mr-8 cursor-pointer"
          onClick={() => navigate('/')}
        >
          AUTO-TEXT CRM
        </div>
        
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path || 
            (item.path === '/inventory-dashboard' && location.pathname.startsWith('/inventory'));
          
          return (
            <HoverCard key={item.path} openDelay={100} closeDelay={100}>
              <HoverCardTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(item.path)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${getColorClasses(item.color, isActive)}`}
                >
                  <Icon size={18} />
                  <span className="font-medium">{item.label}</span>
                </Button>
              </HoverCardTrigger>
              <HoverCardContent 
                className="w-64 p-3" 
                side="bottom" 
                align="start"
                sideOffset={5}
              >
                <div className="space-y-2">
                  <div className="font-semibold text-sm text-slate-800 mb-3">
                    Quick Actions
                  </div>
                  {item.hoverActions?.map((action, index) => {
                    const ActionIcon = action.icon;
                    return (
                      <button
                        key={index}
                        onClick={action.action}
                        className="w-full flex items-center space-x-3 p-2 rounded-md hover:bg-slate-100 transition-colors text-left text-sm"
                      >
                        <ActionIcon size={16} className="text-slate-600" />
                        <span>{action.label}</span>
                      </button>
                    );
                  })}
                </div>
              </HoverCardContent>
            </HoverCard>
          );
        })}
      </div>
    </nav>
  );
};

export default StreamlinedNavigation;
