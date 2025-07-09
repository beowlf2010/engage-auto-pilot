import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useErrorHandler } from '@/hooks/useErrorHandler';

interface DailyStats {
  date: string;
  messages_sent: number;
  replies_in: number;
  change_sent: number;
  change_replies: number;
}

export const useDailyMessageStats = () => {
  const [stats, setStats] = useState<DailyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { safeExecute } = useErrorHandler();

  useEffect(() => {
    const fetchStats = async () => {
      const today = new Date().toISOString().split('T')[0];
      const defaultStats = {
        date: today,
        messages_sent: 0,
        replies_in: 0,
        change_sent: 0,
        change_replies: 0
      };

      const result = await safeExecute(
        async () => {
          // Get real-time data for today from conversations table
          const [todayOutbound, todayInbound, yesterdayKpis] = await Promise.all([
            // Today's outbound messages (real-time)
            supabase
              .from('conversations')
              .select('id', { count: 'exact', head: true })
              .eq('direction', 'out')
              .gte('sent_at', `${today}T00:00:00`)
              .lt('sent_at', `${today}T23:59:59`),
            
            // Today's inbound messages (real-time)
            supabase
              .from('conversations')
              .select('id', { count: 'exact', head: true })
              .eq('direction', 'in')
              .gte('sent_at', `${today}T00:00:00`)
              .lt('sent_at', `${today}T23:59:59`),
            
            // Yesterday's data from KPIs for comparison
            supabase
              .from('kpis')
              .select('messages_sent, replies_in')
              .order('date', { ascending: false })
              .limit(1)
          ]);

          const todayMessagesSent = todayOutbound.count || 0;
          const todayRepliesIn = todayInbound.count || 0;
          
          // Calculate change from yesterday if available
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
      );

      setStats(result);
      setLoading(false);
    };

    fetchStats();
  }, [safeExecute]);

  return { stats, loading };
};