import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { 
  LayoutDashboard, 
  Users, 
  Mail, 
  Package, 
  BarChart3 
} from 'lucide-react';

interface MobileBottomNavProps {
  unreadCount: number;
}

const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ unreadCount }) => {
  const location = useLocation();

  const navItems = [
    {
      href: '/dashboard',
      icon: LayoutDashboard,
      label: 'Dashboard'
    },
    {
      href: '/leads',
      icon: Users,
      label: 'Leads'
    },
    {
      href: '/smart-inbox',
      icon: Mail,
      label: 'Inbox',
      badge: unreadCount > 0 ? unreadCount : null
    },
    {
      href: '/inventory-dashboard',
      icon: Package,
      label: 'Inventory'
    },
    {
      href: '/sales-dashboard',
      icon: BarChart3,
      label: 'Analytics'
    }
  ];

  return (
    <nav className="sticky bottom-0 bg-background border-t px-2 py-1">
      <div className="flex justify-around">
        {navItems.map(({ href, icon: Icon, label, badge }) => {
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