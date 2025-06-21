import React from 'react';
import { useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { navigationItems } from '@/components/navigation/navigationConfig';

interface EnhancedNavigationProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

const EnhancedNavigation: React.FC<EnhancedNavigationProps> = ({ isCollapsed, onToggle }) => {
  const location = useLocation();

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-2 flex justify-between items-center">
        {!isCollapsed && <span className="font-bold text-lg">Menu</span>}
        <Button variant="outline" size="icon" onClick={onToggle}>
          {isCollapsed ? 'Expand' : 'Collapse'}
        </Button>
      </div>
      <nav className="flex-1 overflow-y-auto">
        <ul className="space-y-1 px-2">
          {navigationItems.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <li key={item.label}>
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  className="w-full justify-start gap-3 h-12"
                  onClick={() => { window.location.href = item.href; }}
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
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
};

export default EnhancedNavigation;
