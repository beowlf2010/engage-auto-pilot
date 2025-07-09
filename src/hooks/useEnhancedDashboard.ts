import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getCorrectLeadCounts } from '@/services/leadStatusTransitionService';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { useEffect } from 'react';

export interface DashboardMetrics {
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
  trends: {
    weeklyLeads: Array<{ date: string; count: number }>;
    weeklyMessages: Array<{ date: string; sent: number; received: number }>;
    conversionRate: number;
    responseRate: number;
  };
}

// Query keys for better cache management
const QUERY_KEYS = {
  dashboard: ['dashboard'] as const,
  leadCounts: ['dashboard', 'leadCounts'] as const,
  messageStats: ['dashboard', 'messageStats'] as const,
  unreadMessages: ['dashboard', 'unreadMessages'] as const,
  trends: ['dashboard', 'trends'] as const,
} as const;

// Individual query functions
const fetchLeadCounts = async () => {
  return await getCorrectLeadCounts();
};

const fetchMessageStats = async () => {
  const today = new Date().toISOString().split('T')[0];
  
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
};

const fetchUnreadMessages = async (): Promise<number> => {
  const { count, error } = await supabase
    .from('conversations')
    .select('*', { count: 'exact', head: true })
    .eq('direction', 'in')
    .is('read_at', null);

  if (error) throw error;
  return count || 0;
};

const fetchTrends = async () => {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const [weeklyLeads, weeklyMessages, totalConversations] = await Promise.all([
    // Weekly lead trends
    supabase
      .from('leads')
      .select('created_at')
      .gte('created_at', sevenDaysAgo.toISOString())
      .order('created_at', { ascending: true }),
    
    // Weekly message trends
    supabase
      .from('conversations')
      .select('sent_at, direction')
      .gte('sent_at', sevenDaysAgo.toISOString())
      .order('sent_at', { ascending: true }),
    
    // Total conversations for conversion rate
    supabase
      .from('conversations')
      .select('lead_id', { count: 'exact', head: true })
      .eq('direction', 'out')
  ]);

  // Process weekly leads
  const leadsByDay = weeklyLeads.data?.reduce((acc, lead) => {
    const date = new Date(lead.created_at).toISOString().split('T')[0];
    acc[date] = (acc[date] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  // Process weekly messages
  const messagesByDay = weeklyMessages.data?.reduce((acc, msg) => {
    const date = new Date(msg.sent_at).toISOString().split('T')[0];
    if (!acc[date]) acc[date] = { sent: 0, received: 0 };
    if (msg.direction === 'out') acc[date].sent++;
    else acc[date].received++;
    return acc;
  }, {} as Record<string, { sent: number; received: number }>) || {};

  // Generate 7-day arrays
  const weeklyLeadsArray = [];
  const weeklyMessagesArray = [];
  
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    weeklyLeadsArray.push({
      date: dateStr,
      count: leadsByDay[dateStr] || 0
    });
    
    weeklyMessagesArray.push({
      date: dateStr,
      sent: messagesByDay[dateStr]?.sent || 0,
      received: messagesByDay[dateStr]?.received || 0
    });
  }

  // Calculate rates
  const totalSent = weeklyMessagesArray.reduce((sum, day) => sum + day.sent, 0);
  const totalReceived = weeklyMessagesArray.reduce((sum, day) => sum + day.received, 0);
  const responseRate = totalSent > 0 ? (totalReceived / totalSent) * 100 : 0;
  
  // Simple conversion rate calculation (conversations that led to responses)
  const conversionRate = totalConversations.count && totalReceived 
    ? (totalReceived / totalConversations.count) * 100 
    : 0;

  return {
    weeklyLeads: weeklyLeadsArray,
    weeklyMessages: weeklyMessagesArray,
    conversionRate: Math.round(conversionRate * 10) / 10,
    responseRate: Math.round(responseRate * 10) / 10
  };
};

export const useEnhancedDashboard = () => {
  const queryClient = useQueryClient();
  const { safeExecute } = useErrorHandler();

  // Individual queries with React Query
  const leadCountsQuery = useQuery({
    queryKey: QUERY_KEYS.leadCounts,
    queryFn: () => safeExecute(fetchLeadCounts, {
      totalLeads: 0, newLeads: 0, engagedLeads: 0, aiEnabledLeads: 0, needsAttention: 0
    }, 'Lead counts'),
    staleTime: 60 * 1000, // 1 minute
  });

  const messageStatsQuery = useQuery({
    queryKey: QUERY_KEYS.messageStats,
    queryFn: () => safeExecute(fetchMessageStats, null, 'Message stats'),
    staleTime: 30 * 1000, // 30 seconds
  });

  const unreadMessagesQuery = useQuery({
    queryKey: QUERY_KEYS.unreadMessages,
    queryFn: () => safeExecute(fetchUnreadMessages, 0, 'Unread messages'),
    staleTime: 30 * 1000, // 30 seconds
  });

  const trendsQuery = useQuery({
    queryKey: QUERY_KEYS.trends,
    queryFn: () => safeExecute(fetchTrends, {
      weeklyLeads: [], weeklyMessages: [], conversionRate: 0, responseRate: 0
    }, 'Trends data'),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Real-time subscriptions with query invalidation
  useEffect(() => {
    const conversationsChannel = supabase
      .channel('dashboard-conversations-enhanced')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations'
        },
        () => {
          // Invalidate related queries for fresh data
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.messageStats });
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.unreadMessages });
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.trends });
        }
      )
      .subscribe();

    const leadsChannel = supabase
      .channel('dashboard-leads-enhanced')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leads'
        },
        () => {
          // Invalidate related queries for fresh data
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.leadCounts });
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.trends });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(conversationsChannel);
      supabase.removeChannel(leadsChannel);
    };
  }, [queryClient]);

  // Background refetch every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.messageStats });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.unreadMessages });
    }, 30000);

    return () => clearInterval(interval);
  }, [queryClient]);

  const data: DashboardMetrics = {
    leadCounts: leadCountsQuery.data || {
      totalLeads: 0, newLeads: 0, engagedLeads: 0, aiEnabledLeads: 0, needsAttention: 0
    },
    messageStats: messageStatsQuery.data || null,
    unreadMessages: unreadMessagesQuery.data || 0,
    trends: trendsQuery.data || {
      weeklyLeads: [], weeklyMessages: [], conversionRate: 0, responseRate: 0
    }
  };

  const loading = {
    leadCounts: leadCountsQuery.isLoading,
    messageStats: messageStatsQuery.isLoading,
    unreadMessages: unreadMessagesQuery.isLoading,
    trends: trendsQuery.isLoading,
  };

  const isLoading = Object.values(loading).some(Boolean);
  const hasAnyData = Object.values(loading).some(l => !l);
  
  const errors = [
    leadCountsQuery.error,
    messageStatsQuery.error,
    unreadMessagesQuery.error,
    trendsQuery.error
  ].filter(Boolean);

  const refetch = () => {
    leadCountsQuery.refetch();
    messageStatsQuery.refetch();
    unreadMessagesQuery.refetch();
    trendsQuery.refetch();
  };

  return {
    data,
    loading,
    isLoading,
    hasAnyData,
    error: errors.length > 0 ? `${errors.length} data source(s) failed` : null,
    refetch,
    lastUpdated: new Date(),
    // React Query specific
    isRefetching: leadCountsQuery.isRefetching || messageStatsQuery.isRefetching || 
                 unreadMessagesQuery.isRefetching || trendsQuery.isRefetching,
    isStale: leadCountsQuery.isStale || messageStatsQuery.isStale || 
             unreadMessagesQuery.isStale || trendsQuery.isStale,
  };
};