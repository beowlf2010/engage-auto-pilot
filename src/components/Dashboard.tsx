import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useConversationData } from '@/hooks/useConversationData';
import { getCorrectLeadCounts } from '@/services/leadStatusTransitionService';
import { useDailyMessageStats } from '@/hooks/useDailyMessageStats';
import { OptimizedLoading } from '@/components/ui/OptimizedLoading';
import { DashboardStats } from './dashboard/DashboardStats';
import { QuickActions } from './dashboard/QuickActions';
import { RecentActivity } from './dashboard/RecentActivity';
import AIInsightsWidget from './dashboard/AIInsightsWidget';
import { SafeErrorBoundary } from '@/components/error/SafeErrorBoundary';
import { useErrorHandler } from '@/hooks/useErrorHandler';

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
  const { messages } = useConversationData();
  const { stats: messageStats, loading: statsLoading } = useDailyMessageStats();
  const { handleError, safeExecute } = useErrorHandler();
  const [leadCounts, setLeadCounts] = useState({
    totalLeads: 0,
    newLeads: 0,
    engagedLeads: 0,
    aiEnabledLeads: 0,
    needsAttention: 0
  });
  const [loading, setLoading] = useState(true);

  const fetchLeadCounts = useCallback(async () => {
    const counts = await safeExecute(
      () => getCorrectLeadCounts(),
      { totalLeads: 0, newLeads: 0, engagedLeads: 0, aiEnabledLeads: 0, needsAttention: 0 },
      'Dashboard lead counts'
    );
    setLeadCounts(counts);
    setLoading(false);
  }, [safeExecute]);

  useEffect(() => {
    fetchLeadCounts();
  }, [fetchLeadCounts]);

  const unreadMessages = useMemo(() => 
    messages.filter(msg => !msg.readAt && msg.direction === 'in').length,
    [messages]
  );

  const handleNavigate = useCallback((path: string) => {
    navigate(path);
  }, [navigate]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-primary via-primary/80 to-primary/60 rounded-lg p-6 text-primary-foreground">
          <h1 className="text-2xl font-bold mb-2">Welcome back, {user.firstName}!</h1>
          <p className="text-primary-foreground/80">Loading your automotive sales dashboard...</p>
        </div>
        <OptimizedLoading variant="dashboard" />
      </div>
    );
  }

  return (
    <SafeErrorBoundary>
      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-primary via-primary/80 to-primary/60 rounded-lg p-6 text-primary-foreground">
          <h1 className="text-2xl font-bold mb-2">
            Welcome back, {user.firstName}!
          </h1>
          <p className="text-primary-foreground/80">
            Here's what's happening with your automotive sales today
          </p>
        </div>

        {/* Stats Overview */}
        <SafeErrorBoundary>
          <DashboardStats 
            messageStats={messageStats}
            leadCounts={leadCounts}
            unreadMessages={unreadMessages}
            statsLoading={statsLoading}
          />
        </SafeErrorBoundary>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick Actions */}
          <div className="lg:col-span-2">
            <SafeErrorBoundary>
              <QuickActions 
                unreadMessages={unreadMessages}
                needsAttention={leadCounts.needsAttention}
                onNavigate={handleNavigate}
              />
            </SafeErrorBoundary>
          </div>

          {/* AI Insights Widget */}
          <div className="lg:col-span-1">
            <SafeErrorBoundary>
              <AIInsightsWidget />
            </SafeErrorBoundary>
          </div>
        </div>

        {/* Recent Activity */}
        <SafeErrorBoundary>
          <RecentActivity 
            leadCounts={leadCounts}
            unreadMessages={unreadMessages}
            onNavigate={handleNavigate}
          />
        </SafeErrorBoundary>
      </div>
    </SafeErrorBoundary>
  );
});

export default Dashboard;
