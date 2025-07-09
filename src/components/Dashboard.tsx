import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDashboardData } from '@/hooks/useDashboardData';
import { DashboardStats } from './dashboard/DashboardStats';
import { QuickActions } from './dashboard/QuickActions';
import { RecentActivity } from './dashboard/RecentActivity';
import AIInsightsWidget from './dashboard/AIInsightsWidget';
import { SafeErrorBoundary } from '@/components/error/SafeErrorBoundary';
import { StatsGridSkeleton, QuickActionsSkeleton, RecentActivitySkeleton, AIInsightsSkeleton } from '@/components/ui/dashboard-skeletons';
import { RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

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
  const { data, loading, isLoading, hasAnyData, error, refetch, lastUpdated } = useDashboardData();

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
        {/* Welcome Section - Always visible */}
        <div className="bg-gradient-to-r from-primary via-primary/80 to-primary/60 rounded-lg p-6 text-primary-foreground">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold mb-2">
                Welcome back, {user.firstName}!
              </h1>
              <p className="text-primary-foreground/80">
                Here's what's happening with your automotive sales today
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* Live indicator */}
              <div className="flex items-center gap-2">
                {hasAnyData ? (
                  <>
                    <Wifi className="h-4 w-4 text-green-300" />
                    <Badge variant="secondary" className="bg-white/20 text-white">
                      Live • {formatLastUpdated(lastUpdated)}
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
              
              {/* Manual refresh button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={refetch}
                disabled={isLoading}
                className="text-white hover:bg-white/20"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
          
          {error && (
            <div className="mt-3 text-sm text-primary-foreground/80 bg-white/10 rounded p-2">
              ⚠️ {error} - Some data may be outdated
            </div>
          )}
        </div>

        {/* Stats Overview - Progressive loading */}
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

        {/* Main Content Grid - Progressive loading */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick Actions */}
          <div className="lg:col-span-2">
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

          {/* AI Insights Widget */}
          <div className="lg:col-span-1">
            <SafeErrorBoundary>
              {isLoading ? (
                <AIInsightsSkeleton />
              ) : (
                <AIInsightsWidget />
              )}
            </SafeErrorBoundary>
          </div>
        </div>

        {/* Recent Activity - Progressive loading */}
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
    </SafeErrorBoundary>
  );
});

export default Dashboard;