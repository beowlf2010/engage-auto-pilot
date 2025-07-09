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
      const defaultStats = {
        date: new Date().toISOString().split('T')[0],
        messages_sent: 0,
        replies_in: 0,
        change_sent: 0,
        change_replies: 0
      };

      const result = await safeExecute(
        async () => {
          // Get today's and yesterday's stats for comparison
          const { data, error } = await supabase
            .from('kpis')
            .select('date, messages_sent, replies_in')
            .order('date', { ascending: false })
            .limit(2);

          if (error) throw error;

          if (data && data.length > 0) {
            const today = data[0];
            const yesterday = data[1];

            const change_sent = yesterday 
              ? ((today.messages_sent - yesterday.messages_sent) / Math.max(yesterday.messages_sent, 1)) * 100
              : 0;
            
            const change_replies = yesterday
              ? ((today.replies_in - yesterday.replies_in) / Math.max(yesterday.replies_in, 1)) * 100
              : 0;

            return {
              date: today.date,
              messages_sent: today.messages_sent || 0,
              replies_in: today.replies_in || 0,
              change_sent: Math.round(change_sent),
              change_replies: Math.round(change_replies)
            };
          }
          return defaultStats;
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