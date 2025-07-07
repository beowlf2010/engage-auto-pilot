import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { navigationItems } from '@/components/navigation/navigationConfig';
import { useAuth } from '@/components/auth/AuthProvider';

interface MobileBottomNavProps {
  unreadCount: number;
}

const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ unreadCount }) => {
  const location = useLocation();
  const { profile } = useAuth();

  // Filter navigation items for mobile bottom nav (most important 5)
  const mobileNavItems = navigationItems
    .filter(item => {
      // Check access permissions
      if (!profile?.role || !item.access.includes(profile.role)) return false;
      
      // Select most important items for mobile bottom nav
      return ['Dashboard', 'Smart Inbox', 'Leads', 'Inventory', 'Analytics'].includes(item.label);
    })
    .map(item => ({
      href: item.href,
      icon: item.icon,
      label: item.label === 'Smart Inbox' ? 'Inbox' : 
             item.label === 'Inventory' ? 'Inventory' :
             item.label === 'Analytics' ? 'Analytics' : item.label,
      badge: item.badge?.type === 'unread' && unreadCount > 0 ? unreadCount : null
    }))
    .slice(0, 5); // Ensure max 5 items for mobile

  return (
    <nav className="sticky bottom-0 bg-background border-t px-2 py-1">
      <div className="flex justify-around">
        {mobileNavItems.map(({ href, icon: Icon, label, badge }) => {
          const isActive = location.pathname === href;
          
          return (
            <Link
              key={href}
              to={href}
              className={cn(
                "flex flex-col items-center py-2 px-3 rounded-lg transition-colors min-w-0",
                isActive
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div className="relative">
                <Icon className="h-5 w-5" />
                {badge && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-2 -right-2 h-4 w-4 p-0 text-xs flex items-center justify-center"
                  >
                    {badge > 99 ? '99+' : badge}
                  </Badge>
                )}
              </div>
              <span className="text-xs mt-1 truncate max-w-full">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileBottomNav;