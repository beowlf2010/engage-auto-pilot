import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getCorrectLeadCounts } from '@/services/leadStatusTransitionService';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { withTimeout, TimeoutError } from '@/utils/withTimeout';
import { networkHealthService } from '@/services/networkHealthService';

interface DashboardData {
  leadCounts: {
    totalLeads: number;
    newLeads: number;
    engagedLeads: number;
    aiEnabledLeads: number;
    needsAttention: number;
  };
  messageStats: {
    date: string;
    messages_sent: number;
    replies_in: number;
    change_sent: number;
    change_replies: number;
  } | null;
  unreadMessages: number;
  lastUpdated: Date;
}

interface LoadingStates {
  leadCounts: boolean;
  messageStats: boolean;
  unreadMessages: boolean;
}

export const useDashboardData = () => {
  const [data, setData] = useState<DashboardData>({
    leadCounts: {
      totalLeads: 0,
      newLeads: 0,
      engagedLeads: 0,
      aiEnabledLeads: 0,
      needsAttention: 0
    },
    messageStats: null,
    unreadMessages: 0,
    lastUpdated: new Date()
  });

  const [loading, setLoading] = useState<LoadingStates>({
    leadCounts: true,
    messageStats: true,
    unreadMessages: true
  });

  const [error, setError] = useState<string | null>(null);
  const { safeExecute } = useErrorHandler();

  const fetchLeadCounts = useCallback(async () => {
    const defaultCounts = { totalLeads: 0, newLeads: 0, engagedLeads: 0, aiEnabledLeads: 0, needsAttention: 0 };
    try {
      const counts = await withTimeout(
        () => safeExecute(() => getCorrectLeadCounts(), defaultCounts, 'Dashboard lead counts'),
        8000
      );
      setData(prev => ({ ...prev, leadCounts: counts, lastUpdated: new Date() }));
      setLoading(prev => ({ ...prev, leadCounts: false }));
      networkHealthService.reportSuccess();
    } catch (err) {
      if (err instanceof TimeoutError) {
        networkHealthService.reportTimeout('dashboard:leadCounts');
        setData(prev => ({ ...prev, leadCounts: defaultCounts, lastUpdated: new Date() }));
        setLoading(prev => ({ ...prev, leadCounts: false }));
      } else {
        const counts = await safeExecute(
          () => getCorrectLeadCounts(),
          defaultCounts,
          'Dashboard lead counts'
        );
        setData(prev => ({ ...prev, leadCounts: counts, lastUpdated: new Date() }));
        setLoading(prev => ({ ...prev, leadCounts: false }));
      }
    }
  }, [safeExecute]);

  const fetchMessageStats = useCallback(async () => {
    const today = new Date().toISOString().split('T')[0];
    const defaultStats = {
      date: today,
      messages_sent: 0,
      replies_in: 0,
      change_sent: 0,
      change_replies: 0
    };

    try {
      const stats = await withTimeout(
        () => safeExecute(
          async () => {
            const [todayOutbound, todayInbound, yesterdayKpis] = await Promise.all([
              supabase
                .from('conversations')
                .select('id', { count: 'exact', head: true })
                .eq('direction', 'out')
                .gte('sent_at', `${today}T00:00:00`)
                .lt('sent_at', `${today}T23:59:59`),
              
              supabase
                .from('conversations')
                .select('id', { count: 'exact', head: true })
                .eq('direction', 'in')
                .gte('sent_at', `${today}T00:00:00`)
                .lt('sent_at', `${today}T23:59:59`),
              
              supabase
                .from('kpis')
                .select('messages_sent, replies_in')
                .order('date', { ascending: false })
                .limit(1)
            ]);

            const todayMessagesSent = todayOutbound.count || 0;
            const todayRepliesIn = todayInbound.count || 0;
            
            let changeSent = 0;
            let changeReplies = 0;
            
            if (yesterdayKpis.data && yesterdayKpis.data.length > 0) {
              const yesterday = yesterdayKpis.data[0];
              changeSent = yesterday.messages_sent 
                ? ((todayMessagesSent - yesterday.messages_sent) / Math.max(yesterday.messages_sent, 1)) * 100
                : 0;
              changeReplies = yesterday.replies_in
                ? ((todayRepliesIn - yesterday.replies_in) / Math.max(yesterday.replies_in, 1)) * 100
                : 0;
            }

            return {
              date: today,
              messages_sent: todayMessagesSent,
              replies_in: todayRepliesIn,
              change_sent: Math.round(changeSent),
              change_replies: Math.round(changeReplies)
            };
          },
          defaultStats,
          'Dashboard message stats'
        ),
        8000
      );

      setData(prev => ({ ...prev, messageStats: stats, lastUpdated: new Date() }));
      setLoading(prev => ({ ...prev, messageStats: false }));
      networkHealthService.reportSuccess();
    } catch (err) {
      if (err instanceof TimeoutError) {
        networkHealthService.reportTimeout('dashboard:messageStats');
        setData(prev => ({ ...prev, messageStats: defaultStats, lastUpdated: new Date() }));
        setLoading(prev => ({ ...prev, messageStats: false }));
      } else {
        const stats = await safeExecute(
          async () => defaultStats,
          defaultStats,
          'Dashboard message stats'
        );
        setData(prev => ({ ...prev, messageStats: stats, lastUpdated: new Date() }));
        setLoading(prev => ({ ...prev, messageStats: false }));
      }
    }
  }, [safeExecute]);

  const fetchUnreadMessages = useCallback(async () => {
    try {
      const count = await withTimeout(
        () => safeExecute(
          async () => {
            const { count, error } = await supabase
              .from('conversations')
              .select('*', { count: 'exact', head: true })
              .eq('direction', 'in')
              .is('read_at', null);

            if (error) throw error;
            return count || 0;
          },
          0,
          'Dashboard unread messages'
        ),
        8000
      );

      setData(prev => ({ ...prev, unreadMessages: count, lastUpdated: new Date() }));
      setLoading(prev => ({ ...prev, unreadMessages: false }));
      networkHealthService.reportSuccess();
    } catch (err) {
      if (err instanceof TimeoutError) {
        networkHealthService.reportTimeout('dashboard:unreadMessages');
        setData(prev => ({ ...prev, unreadMessages: 0, lastUpdated: new Date() }));
        setLoading(prev => ({ ...prev, unreadMessages: false }));
      } else {
        const count = await safeExecute(async () => 0, 0, 'Dashboard unread messages');
        setData(prev => ({ ...prev, unreadMessages: count, lastUpdated: new Date() }));
        setLoading(prev => ({ ...prev, unreadMessages: false }));
      }
    }
  }, [safeExecute]);

  // Unified data fetch with parallel loading
  const fetchAllData = useCallback(async () => {
    setError(null);
    try {
      // Use Promise.allSettled to load all data in parallel
      const results = await Promise.allSettled([
        fetchLeadCounts(),
        fetchMessageStats(),
        fetchUnreadMessages()
      ]);

      // Check for any rejections
      const failures = results.filter(result => result.status === 'rejected');
      if (failures.length > 0) {
        console.warn('Some dashboard data failed to load:', failures);
        setError(`Failed to load ${failures.length} data sources`);
      }
    } catch (error) {
      console.error('Dashboard data fetch error:', error);
      setError('Failed to load dashboard data');
    }
  }, [fetchLeadCounts, fetchMessageStats, fetchUnreadMessages]);

  // Real-time subscriptions
  useEffect(() => {
    // Set up real-time subscriptions for live updates
    const conversationsChannel = supabase
      .channel('dashboard-conversations')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations'
        },
        () => {
          // Refresh message stats and unread count on conversation changes
          fetchMessageStats();
          fetchUnreadMessages();
        }
      )
      .subscribe();

    const leadsChannel = supabase
      .channel('dashboard-leads')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leads'
        },
        () => {
          // Refresh lead counts on lead changes
          fetchLeadCounts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(conversationsChannel);
      supabase.removeChannel(leadsChannel);
    };
  }, [fetchLeadCounts, fetchMessageStats, fetchUnreadMessages]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchAllData();
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchAllData]);

  // Initial load
  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const isLoading = loading.leadCounts || loading.messageStats || loading.unreadMessages;
  const hasAnyData = !loading.leadCounts || !loading.messageStats || !loading.unreadMessages;

  return {
    data,
    loading,
    isLoading,
    hasAnyData,
    error,
    refetch: fetchAllData,
    lastUpdated: data.lastUpdated
  };
};