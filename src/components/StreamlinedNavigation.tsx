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

interface StreamlinedNavigationProps {
  isCollapsed: boolean;
  onExpand: () => void;
  onCollapse: () => void;
}

const StreamlinedNavigation: React.FC<StreamlinedNavigationProps> = ({ isCollapsed, onExpand, onCollapse }) => {
  const location = useLocation();
  const { user, hasAccess } = useAuth();

  const filteredNavigationItems = navigationItems.filter(item => hasAccess(item.access));

  return (
    <div className="flex flex-col h-full space-y-1">
      <div className="px-3 py-2">
        <h2 className={cn("mb-2 px-4 font-bold text-sm uppercase", isCollapsed ? "text-center" : "text-left")}>
          {isCollapsed ? "Menu" : "Dashboard"}
        </h2>
        {filteredNavigationItems.map((item) => (
          <NavigationItem key={item.label} item={item} isCollapsed={isCollapsed} />
        ))}
      </div>
    </div>
  );
};

export default StreamlinedNavigation;
