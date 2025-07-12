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
      <div className="space-y-6">
        {/* Enhanced Welcome Section */}
        <div className="bg-gradient-to-r from-primary via-primary/80 to-primary/60 rounded-lg p-6 text-primary-foreground relative overflow-hidden">
          {/* Background pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full -translate-y-16 translate-x-16" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white rounded-full translate-y-12 -translate-x-12" />
          </div>
          
          <div className="relative flex items-center justify-between">
            <div className="space-y-3">
              <h1 className="text-3xl font-bold">
                Welcome back, {user.firstName}! 👋
              </h1>
              <p className="text-primary-foreground/90 text-lg">
                Here's your automotive sales performance at a glance
              </p>
              
              {/* Quick stats preview */}
              <div className="flex items-center gap-4 mt-4">
                <div className="bg-white/10 rounded-lg px-3 py-2">
                  <div className="text-2xl font-bold">{data.leadCounts.totalLeads}</div>
                  <div className="text-sm text-primary-foreground/80">Total Leads</div>
                </div>
                <div className="bg-white/10 rounded-lg px-3 py-2">
                  <div className="text-2xl font-bold">{data.trends.responseRate}%</div>
                  <div className="text-sm text-primary-foreground/80">Response Rate</div>
                </div>
                <div className="bg-white/10 rounded-lg px-3 py-2">
                  <div className="text-2xl font-bold">{data.unreadMessages}</div>
                  <div className="text-sm text-primary-foreground/80">Unread</div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Enhanced status indicators */}
              <div className="flex items-center gap-2">
                {hasAnyData ? (
                  <>
                    <div className="flex items-center gap-1">
                      {isRefetching ? (
                        <Database className="h-4 w-4 text-yellow-300 animate-pulse" />
                      ) : (
                        <Wifi className="h-4 w-4 text-green-300" />
                      )}
                      {isStale && <Zap className="h-3 w-3 text-orange-300" />}
                    </div>
                    <Badge variant="secondary" className="bg-white/20 text-white">
                      {isRefetching ? 'Updating...' : isStale ? 'Stale Data' : 'Live'} • {formatLastUpdated(lastUpdated)}
                    </Badge>
                  </>
                ) : (
                  <>
                    <WifiOff className="h-4 w-4 text-yellow-300" />
                    <Badge variant="secondary" className="bg-white/20 text-white">
                      Loading...
                    </Badge>
                  </>
                )}
              </div>
              
              {/* Enhanced refresh button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={refetch}
                disabled={isLoading}
                className="text-white hover:bg-white/20"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading || isRefetching ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
          
          {error && (
            <div className="mt-4 text-sm text-primary-foreground/90 bg-white/10 rounded-lg p-3 border border-white/20">
              ⚠️ {error} - Some data may be outdated
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

        {/* Main Content Grid with Trends */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Quick Actions - 2 columns */}
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

          {/* Trends Widget - 1 column */}
          <div className="xl:col-span-1">
            <SafeErrorBoundary>
              <TrendsWidget 
                trends={data.trends}
                loading={loading.trends}
              />
            </SafeErrorBoundary>
          </div>

          {/* AI Insights Widget - 1 column */}
          <div className="xl:col-span-1">
            <SafeErrorBoundary>
              {isLoading ? (
                <AIInsightsSkeleton />
              ) : (
                <AIInsightsWidget />
              )}
            </SafeErrorBoundary>
          </div>
        </div>

        {/* SMS System Cards */}
        <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
          <SafeErrorBoundary>
            <SMSMonitoringCard />
          </SafeErrorBoundary>
          <SafeErrorBoundary>
            <SMSTestPanel />
          </SafeErrorBoundary>
        </div>

        {/* Recent Activity - Full width */}
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

        {/* Performance Indicators */}
        {hasAnyData && !isLoading && (
          <Card className="border-dashed border-muted">
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <BarChart3 className="h-4 w-4" />
                <span>React Query Cache Active</span>
                {isStale && <Badge variant="outline" className="text-xs">Stale Data</Badge>}
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>Background sync: 30s</span>
                <span>Cache: 5m</span>
                <Badge variant="outline" className="text-xs">
                  {isRefetching ? 'Syncing...' : 'Ready'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </SafeErrorBoundary>
  );
});

export default Dashboard;