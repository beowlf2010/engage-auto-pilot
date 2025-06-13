
import React from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { Button } from '@/components/ui/button';
import { useNavigate, useLocation } from 'react-router-dom';
import { MessageSquare, Users, BarChart3, Settings } from 'lucide-react';

const StreamlinedNavigation = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (!profile) return null;

  const getNavItems = () => {
    const baseItems = [
      { path: '/smartinbox', label: 'Smart Inbox', icon: MessageSquare },
      { path: '/leads', label: 'Leads', icon: Users }
    ];

    if (profile.role === 'sales') {
      return [
        ...baseItems,
        { path: '/dash/sales', label: 'My Dashboard', icon: BarChart3 }
      ];
    }

    if (profile.role === 'manager') {
      return [
        ...baseItems,
        { path: '/dash/manager', label: 'Manager Dashboard', icon: BarChart3 }
      ];
    }

    if (profile.role === 'admin') {
      return [
        ...baseItems,
        { path: '/dash/admin', label: 'Admin Dashboard', icon: BarChart3 },
        { path: '/users', label: 'Users', icon: Settings }
      ];
    }

    return baseItems;
  };

  const navItems = getNavItems();

  return (
    <nav className="bg-white border-b border-slate-200 px-4 py-2">
      <div className="flex items-center space-x-1">
        <div className="text-xl font-bold text-slate-800 mr-6">
          AUTO-TEXT CRM
        </div>
        
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <Button
              key={item.path}
              variant={isActive ? "default" : "ghost"}
              size="sm"
              onClick={() => navigate(item.path)}
              className="flex items-center space-x-2"
            >
              <Icon size={16} />
              <span>{item.label}</span>
            </Button>
          );
        })}
      </div>
    </nav>
  );
};

export default StreamlinedNavigation;
