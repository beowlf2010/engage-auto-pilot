import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

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

  useEffect(() => {
    const fetchStats = async () => {
      try {
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

          setStats({
            date: today.date,
            messages_sent: today.messages_sent || 0,
            replies_in: today.replies_in || 0,
            change_sent: Math.round(change_sent),
            change_replies: Math.round(change_replies)
          });
        }
      } catch (error) {
        console.error('Error fetching daily message stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return { stats, loading };
};