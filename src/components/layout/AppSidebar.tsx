import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { navigationItems } from '@/components/navigation/navigationConfig';
import AutoVantageLogo from '@/components/navigation/AutoVantageLogo';
import { cn } from '@/lib/utils';

interface AppSidebarProps {
  unreadCount?: number;
}

export function AppSidebar({ unreadCount = 0 }: AppSidebarProps) {
  const { profile, signOut } = useAuth();
  const { state } = useSidebar();
  const location = useLocation();
  const collapsed = state === 'collapsed';

  const isActive = (path: string) => location.pathname === path;
  
  const hasAccess = (item: any) => {
    if (!profile?.role) return false;
    return item.access.includes(profile.role);
  };

  // Group navigation items
  const primaryItems = navigationItems.filter(item => 
    ['Dashboard', 'Smart Inbox', 'Leads', 'Upload Leads', 'Auto-Dialing'].includes(item.label) && hasAccess(item)
  );

  const inventoryItems = navigationItems.filter(item => 
    ['Inventory', 'Upload Inventory', 'RPO Insights'].includes(item.label) && hasAccess(item)
  );

  const aiItems = navigationItems.filter(item => 
    ['AI Monitor', 'AI Performance', 'AI Training'].includes(item.label) && hasAccess(item)
  );

  const analyticsItems = navigationItems.filter(item => 
    ['Financial', 'Sales Dashboard', 'Analytics'].includes(item.label) && hasAccess(item)
  );

  const toolsItems = navigationItems.filter(item => 
    ['Predictive Analytics', 'Message Export', 'Personalization'].includes(item.label) && hasAccess(item)
  );

  const adminItems = navigationItems.filter(item => 
    ['Admin Dashboard', 'Manager Dashboard'].includes(item.label) && hasAccess(item)
  );

  const profileItems = navigationItems.filter(item => 
    ['Sales Profile', 'Settings'].includes(item.label) && hasAccess(item)
  );

  const handleSignOut = async () => {
    await signOut();
  };

  const renderNavItem = (item: any) => {
    const active = isActive(item.href);
    const showUnreadBadge = item.badge?.type === 'unread' && unreadCount > 0;

    return (
      <SidebarMenuItem key={item.href}>
        <SidebarMenuButton asChild isActive={active}>
          <Link to={item.href} className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              <item.icon className="h-4 w-4" />
              {!collapsed && <span>{item.label}</span>}
            </div>
            {!collapsed && showUnreadBadge && (
              <Badge variant="destructive" className="ml-auto">
                {unreadCount}
              </Badge>
            )}
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  const renderGroup = (title: string, items: any[]) => {
    if (items.length === 0) return null;

    return (
      <SidebarGroup>
        {!collapsed && <SidebarGroupLabel>{title}</SidebarGroupLabel>}
        <SidebarGroupContent>
          <SidebarMenu>
            {items.map(renderNavItem)}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <SidebarHeader className="border-b border-border p-4">
        <div className="flex items-center gap-3">
          <AutoVantageLogo />
          {!collapsed && profile && (
            <div className="flex flex-col text-sm">
              <span className="font-medium text-foreground">
                {profile.first_name} {profile.last_name}
              </span>
              <span className="text-xs text-muted-foreground capitalize">
                {profile.role}
              </span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {renderGroup("Main", primaryItems)}
        {renderGroup("Inventory", inventoryItems)}
        {renderGroup("AI Intelligence", aiItems)}
        {renderGroup("Analytics", analyticsItems)}
        {renderGroup("Tools", toolsItems)}
        {renderGroup("Admin", adminItems)}
        {renderGroup("Profile", profileItems)}
      </SidebarContent>

      <SidebarFooter className="border-t border-border p-4">
        <Button
          variant="ghost"
          onClick={handleSignOut}
          className={cn(
            "w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10",
            collapsed && "px-2"
          )}
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span className="ml-3">Sign Out</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}