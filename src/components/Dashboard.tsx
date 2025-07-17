import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEnhancedDashboard } from '@/hooks/useEnhancedDashboard';
import { DashboardStats } from './dashboard/DashboardStats';
import { QuickActions } from './dashboard/QuickActions';
import { RecentActivity } from './dashboard/RecentActivity';
import { TrendsWidget } from './dashboard/TrendsWidget';
import AIInsightsWidget from './dashboard/AIInsightsWidget';
import { SafeErrorBoundary } from '@/components/error/SafeErrorBoundary';
import { StatsGridSkeleton, QuickActionsSkeleton, RecentActivitySkeleton, AIInsightsSkeleton } from '@/components/ui/dashboard-skeletons';
import { RefreshCw, Wifi, WifiOff, Database, Zap, BarChart3 } from 'lucide-react';
import { SMSMonitoringCard } from '@/components/dashboard/SMSMonitoringCard';
import { SMSTestPanel } from '@/components/dashboard/SMSTestPanel';
import { AIStatusDashboard } from '@/components/ai/AIStatusDashboard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

interface DashboardProps {
  user: {
    id: string;
    role: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
}

const Dashboard = React.memo(({ user }: DashboardProps) => {
  const navigate = useNavigate();
  const { 
    data, 
    loading, 
    isLoading, 
    hasAnyData, 
    error, 
    refetch, 
    lastUpdated,
    isRefetching,
    isStale 
  } = useEnhancedDashboard();

  const handleNavigate = useCallback((path: string) => {
    navigate(path);
  }, [navigate]);

  const formatLastUpdated = useCallback((date: Date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    return `${Math.floor(diffInSeconds / 3600)}h ago`;
  }, []);

  return (
    <SafeErrorBoundary>
      <div className="space-y-4">
        {/* Compact Welcome Header */}
        <div className="bg-gradient-to-r from-primary to-primary/80 rounded-lg p-4 text-primary-foreground">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold">Welcome back, {user.firstName}! 👋</h1>
              <p className="text-primary-foreground/90 text-sm">Sales performance overview</p>
            </div>
            
            <div className="flex items-center gap-2">
              {hasAnyData ? (
                <div className="flex items-center gap-1">
                  {isRefetching ? (
                    <Database className="h-4 w-4 text-yellow-300 animate-pulse" />
                  ) : (
                    <Wifi className="h-4 w-4 text-green-300" />
                  )}
                  <Badge variant="secondary" className="bg-white/20 text-white text-xs">
                    {isRefetching ? 'Syncing...' : 'Live'}
                  </Badge>
                </div>
              ) : (
                <WifiOff className="h-4 w-4 text-yellow-300" />
              )}
              
              <Button
                variant="ghost"
                size="sm"
                onClick={refetch}
                disabled={isLoading}
                className="text-white hover:bg-white/20 h-8 px-2"
              >
                <RefreshCw className={`h-3 w-3 ${isLoading || isRefetching ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
          
          {error && (
            <div className="mt-2 text-xs text-primary-foreground/90 bg-white/10 rounded p-2">
              ⚠️ {error}
            </div>
          )}
        </div>

        {/* Enhanced Stats Overview */}
        <SafeErrorBoundary>
          {loading.messageStats || loading.leadCounts || loading.unreadMessages ? (
            <StatsGridSkeleton />
          ) : (
            <DashboardStats 
              messageStats={data.messageStats}
              leadCounts={data.leadCounts}
              unreadMessages={data.unreadMessages}
              statsLoading={false}
            />
          )}
        </SafeErrorBoundary>

        {/* Compact Grid Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-6 gap-4">
          {/* Quick Actions */}
          <div className="xl:col-span-2">
            <SafeErrorBoundary>
              {loading.leadCounts || loading.unreadMessages ? (
                <QuickActionsSkeleton />
              ) : (
                <QuickActions 
                  unreadMessages={data.unreadMessages}
                  needsAttention={data.leadCounts.needsAttention}
                  onNavigate={handleNavigate}
                />
              )}
            </SafeErrorBoundary>
          </div>

          {/* Trends & AI Insights Side by Side */}
          <div className="xl:col-span-2">
            <SafeErrorBoundary>
              <TrendsWidget 
                trends={data.trends}
                loading={loading.trends}
              />
            </SafeErrorBoundary>
          </div>
          
          <div className="xl:col-span-2">
            <SafeErrorBoundary>
              {isLoading ? (
                <AIInsightsSkeleton />
              ) : (
                <AIInsightsWidget />
              )}
            </SafeErrorBoundary>
          </div>
        </div>

        {/* Combined Systems & Activity Row */}
        <div className="grid gap-4 lg:grid-cols-3">
          <SafeErrorBoundary>
            <SMSMonitoringCard />
          </SafeErrorBoundary>
          <SafeErrorBoundary>
            <SMSTestPanel />
          </SafeErrorBoundary>
          <SafeErrorBoundary>
            {loading.leadCounts || loading.unreadMessages ? (
              <RecentActivitySkeleton />
            ) : (
              <RecentActivity 
                leadCounts={data.leadCounts}
                unreadMessages={data.unreadMessages}
                onNavigate={handleNavigate}
              />
            )}
          </SafeErrorBoundary>
        </div>

        {/* AI Status Dashboard - More Compact */}
        <SafeErrorBoundary>
          <AIStatusDashboard />
        </SafeErrorBoundary>

        {/* Compact Performance Footer */}
        {hasAnyData && !isLoading && (
          <div className="text-center py-2">
            <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <BarChart3 className="h-3 w-3" />
                <span>Cache Active</span>
              </div>
              <Badge variant="outline" className="text-xs">
                {isRefetching ? 'Syncing...' : 'Ready'}
              </Badge>
              {isStale && <Badge variant="outline" className="text-xs">Stale</Badge>}
            </div>
          </div>
        )}
      </div>
    </SafeErrorBoundary>
  );
});

export default Dashboard;