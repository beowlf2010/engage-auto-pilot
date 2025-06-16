
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { NavigationItem as NavigationItemType } from './navigationConfig';
import { getColorClasses } from './navigationStyles';

interface NavigationItemProps {
  item: NavigationItemType;
}

const NavigationItem: React.FC<NavigationItemProps> = ({ item }) => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const Icon = item.icon;
  const isActive = location.pathname === item.path || 
    (item.path === '/inventory-dashboard' && location.pathname.startsWith('/inventory')) ||
    (item.path === '/streamlined-leads' && location.pathname === '/leads') ||
    (item.path === '/smart-inbox' && location.pathname === '/inbox');

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => navigate(item.path)}
      className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-200 ${getColorClasses(item.color, isActive)}`}
    >
      <Icon size={16} />
      <span className="font-medium text-sm">{item.label}</span>
      {item.badge && (
        <span className="ml-1 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
          {item.badge}
        </span>
      )}
    </Button>
  );
};

export default NavigationItem;
