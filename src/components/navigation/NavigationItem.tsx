
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import { NavigationItem as NavigationItemType } from './navigationConfig';
import { getColorClasses } from './navigationStyles';

interface NavigationItemProps {
  item: NavigationItemType;
}

const NavigationItem: React.FC<NavigationItemProps> = ({ item }) => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const Icon = item.icon;
  const isActive = location.pathname === item.path;
  const itemColor = item.color || 'blue'; // Fallback to blue if color is missing

  return (
    <HoverCard openDelay={100} closeDelay={100}>
      <HoverCardTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(item.path)}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${getColorClasses(itemColor, isActive)}`}
        >
          <Icon size={18} />
          <span className="font-medium">{item.label}</span>
          {item.badge && (
            <span className="ml-2 px-2 py-1 text-xs bg-red-100 text-red-700 rounded-full">
              {item.badge}
            </span>
          )}
        </Button>
      </HoverCardTrigger>
      {item.hoverActions && item.hoverActions.length > 0 && (
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
            {item.hoverActions.map((action, index) => {
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
      )}
    </HoverCard>
  );
};

export default NavigationItem;
