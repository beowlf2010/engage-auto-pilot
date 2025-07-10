
import React from 'react';
import { useLocation } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  BarChart3,
  MessageSquare,
  Users,
  Package,
  DollarSign,
  Bot,
  TrendingUp,
  Settings,
  Brain
} from 'lucide-react';
import { navigationItems } from './navigation/navigationConfig';
import { cn } from '@/lib/utils';
import { useAuth } from './auth/AuthProvider';
import NavigationItem from './navigation/NavigationItem';
import { NotificationPanel } from './notifications/NotificationPanel';

interface StreamlinedNavigationProps {
  isCollapsed: boolean;
  onExpand: () => void;
  onCollapse: () => void;
}

const StreamlinedNavigation: React.FC<StreamlinedNavigationProps> = ({ isCollapsed, onExpand, onCollapse }) => {
  const location = useLocation();
  const { user, profile } = useAuth();

  // Filter navigation items based on user role - simple role-based filtering
  const filteredNavigationItems = navigationItems.filter(item => {
    // If no access requirement specified, show to all users
    if (!item.access || item.access.length === 0) return true;
    
    // If user has admin role, show everything
    if (profile?.role === 'admin') return true;
    
    // If user has manager role, show manager and user level items
    if (profile?.role === 'manager' && item.access.some(role => ['manager', 'sales'].includes(role))) return true;
    
    // If user has sales role, show only sales level items
    if (profile?.role === 'sales' && item.access.includes('sales')) return true;
    
    return false;
  });

  return (
    <div className="flex flex-col h-full space-y-1">
      <div className="px-3 py-2">
        <div className="flex items-center justify-between mb-2 px-4">
          <h2 className={cn("font-bold text-sm uppercase", isCollapsed ? "text-center" : "text-left")}>
            {isCollapsed ? "Menu" : "Dashboard"}
          </h2>
          {!isCollapsed && <NotificationPanel />}
        </div>
        {filteredNavigationItems.map((item) => (
          <NavigationItem key={item.label} item={item} isCollapsed={isCollapsed} />
        ))}
      </div>
    </div>
  );
};

export default StreamlinedNavigation;
