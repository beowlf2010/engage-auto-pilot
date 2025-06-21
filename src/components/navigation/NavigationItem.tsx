
import React from 'react';
import { useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { NavigationItem as NavigationItemType } from './navigationConfig';

interface NavigationItemProps {
  item: NavigationItemType;
  isCollapsed?: boolean;
  onClick?: () => void;
}

const NavigationItem: React.FC<NavigationItemProps> = ({ item, isCollapsed, onClick }) => {
  const location = useLocation();
  const isActive = location.pathname === item.href;

  const handleClick = () => {
    window.location.href = item.href;
    onClick?.();
  };

  return (
    <Button
      variant={isActive ? "secondary" : "ghost"}
      className={cn(
        "w-full justify-start gap-3 h-12",
        isCollapsed && "justify-center px-2"
      )}
      onClick={handleClick}
    >
      <item.icon className="h-5 w-5 flex-shrink-0" />
      {!isCollapsed && (
        <>
          <span className="font-medium">{item.label}</span>
          {item.badge?.type === 'unread' && (
            <Badge variant="destructive" className="ml-auto">
              New
            </Badge>
          )}
        </>
      )}
    </Button>
  );
};

export default NavigationItem;
