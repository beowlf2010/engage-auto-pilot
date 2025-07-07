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
  const [leadCounts, setLeadCounts] = useState({
    totalLeads: 0,
    newLeads: 0,
    engagedLeads: 0,
    aiEnabledLeads: 0,
    needsAttention: 0
  });
  const [loading, setLoading] = useState(true);

  const fetchLeadCounts = useCallback(async () => {
    try {
      const counts = await getCorrectLeadCounts();
      setLeadCounts(counts);
    } catch (error) {
      console.error('Error fetching lead counts:', error);
    } finally {
      setLoading(false);
    }
  }, []);

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
      <DashboardStats 
        messageStats={messageStats}
        leadCounts={leadCounts}
        unreadMessages={unreadMessages}
        statsLoading={statsLoading}
      />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="lg:col-span-2">
          <QuickActions 
            unreadMessages={unreadMessages}
            needsAttention={leadCounts.needsAttention}
            onNavigate={handleNavigate}
          />
        </div>

        {/* AI Insights Widget */}
        <div className="lg:col-span-1">
          <AIInsightsWidget />
        </div>
      </div>

      {/* Recent Activity */}
      <RecentActivity 
        leadCounts={leadCounts}
        unreadMessages={unreadMessages}
        onNavigate={handleNavigate}
      />
    </div>
  );
});

export default Dashboard;
