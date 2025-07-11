import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import { 
  LayoutDashboard, 
  Upload, 
  Search, 
  Database, 
  TrendingUp, 
  Brain,
  BarChart3,
  Package,
  Settings,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { EmergencyStopHeader } from '@/components/emergency/EmergencyStopHeader';

interface InventoryLayoutProps {
  children: React.ReactNode;
}

const inventoryMenuItems = [
  {
    title: 'Overview',
    url: '/inventory-dashboard',
    icon: LayoutDashboard,
    description: 'Main inventory dashboard'
  },
  {
    title: 'Upload Inventory',
    url: '/upload-inventory',
    icon: Upload,
    description: 'Upload new inventory data'
  },
  {
    title: 'RPO Insights',
    url: '/rpo-insights',
    icon: Search,
    description: 'Vehicle feature analysis'
  },
  {
    title: 'RPO Database',
    url: '/rpo-database',
    icon: Database,
    description: 'Complete RPO reference'
  }
];

const analyticsMenuItems = [
  {
    title: 'Predictive Analytics',
    url: '/predictive-analytics',
    icon: TrendingUp,
    description: 'Demand predictions'
  },
  {
    title: 'AI Intelligence',
    url: '/inventory-intelligence',
    icon: Brain,
    description: 'Smart recommendations'
  },
  {
    title: 'Performance Metrics',
    url: '/inventory-metrics',
    icon: BarChart3,
    description: 'Sales performance'
  }
];

function InventorySidebar() {
  const { state, open } = useSidebar();
  const location = useLocation();
  const collapsed = state === "collapsed";
  const currentPath = location.pathname;

  const isActive = (path: string) => currentPath === path;
  const isInventoryActive = inventoryMenuItems.some(item => isActive(item.url));
  const isAnalyticsActive = analyticsMenuItems.some(item => isActive(item.url));

  const getNavClassName = ({ isActive }: { isActive: boolean }) =>
    cn(
      "w-full justify-start transition-colors",
      isActive 
        ? "bg-primary/10 text-primary font-medium border-r-2 border-primary" 
        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
    );

  return (
    <Sidebar className={cn("border-r", collapsed ? "w-14" : "w-64")} variant="sidebar" collapsible="icon">
      {/* Header */}
      <div className="p-4 border-b bg-muted/5">
        <div className="flex items-center gap-2">
          <Package className="w-6 h-6 text-primary" />
          {!collapsed && (
            <div>
              <h2 className="font-semibold text-lg">Inventory</h2>
              <p className="text-xs text-muted-foreground">Management Hub</p>
            </div>
          )}
        </div>
      </div>

      <SidebarContent className="overflow-y-auto">
        {/* Core Inventory Features */}
        <SidebarGroup className="py-4">
          <SidebarGroupLabel className="px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {!collapsed && "Core Features"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1 px-2">
              {inventoryMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="group">
                    <NavLink
                      to={item.url}
                      className={getNavClassName}
                      title={collapsed ? item.description : undefined}
                    >
                      <item.icon className="w-4 h-4 shrink-0" />
                      {!collapsed && (
                        <div className="flex-1 min-w-0">
                          <span className="block truncate">{item.title}</span>
                          <span className="text-xs text-muted-foreground/80 block truncate">
                            {item.description}
                          </span>
                        </div>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Analytics & Intelligence */}
        <SidebarGroup className="py-4">
          <SidebarGroupLabel className="px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {!collapsed && "Analytics & AI"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1 px-2">
              {analyticsMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="group">
                    <NavLink
                      to={item.url}
                      className={getNavClassName}
                      title={collapsed ? item.description : undefined}
                    >
                      <item.icon className="w-4 h-4 shrink-0" />
                      {!collapsed && (
                        <div className="flex-1 min-w-0">
                          <span className="block truncate">{item.title}</span>
                          <span className="text-xs text-muted-foreground/80 block truncate">
                            {item.description}
                          </span>
                        </div>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Quick Actions */}
        {!collapsed && (
          <div className="p-4 mt-auto border-t bg-muted/5">
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Quick Actions
              </p>
              <div className="grid grid-cols-2 gap-2">
                <NavLink
                  to="/upload-inventory"
                  className="flex items-center gap-2 p-2 text-xs bg-primary/10 hover:bg-primary/20 rounded-md transition-colors"
                >
                  <Upload className="w-3 h-3" />
                  Upload
                </NavLink>
                <NavLink
                  to="/rpo-insights"
                  className="flex items-center gap-2 p-2 text-xs bg-muted hover:bg-muted/80 rounded-md transition-colors"
                >
                  <Zap className="w-3 h-3" />
                  Analyze
                </NavLink>
              </div>
            </div>
          </div>
        )}
      </SidebarContent>
    </Sidebar>
  );
}

export default function InventoryLayout({ children }: InventoryLayoutProps) {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex flex-col w-full">
        <EmergencyStopHeader />
        <div className="flex flex-1 w-full">
          <InventorySidebar />
          
          <div className="flex-1 flex flex-col min-w-0">
            {/* Mobile header with trigger */}
            <header className="lg:hidden h-14 flex items-center border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4">
              <SidebarTrigger className="mr-4" />
              <h1 className="font-semibold">Inventory Management</h1>
            </header>

            {/* Main content */}
            <main className="flex-1 overflow-auto">
              <div className="container max-w-full p-6">
                {children}
              </div>
            </main>
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}