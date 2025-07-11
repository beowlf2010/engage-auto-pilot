import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { optimizedRealtimeManager } from '@/services/optimizedRealtimeManager';

interface AutomationStatus {
  isRunning: boolean;
  lastRunAt: Date | null;
  nextRunAt: Date | null;
  recentActivity: ActivityLog[];
  statistics: {
    messagesProcessed: number;
    messagesSuccessful: number;
    messagesFailed: number;
    avgProcessingTime: number;
  };
}

interface ActivityLog {
  id: string;
  timestamp: Date;
  type: 'message_sent' | 'lead_processed' | 'automation_started' | 'automation_completed';
  leadId?: string;
  leadName?: string;
  message?: string;
  success: boolean;
}

export const useAIAutomationStatus = () => {
  const [status, setStatus] = useState<AutomationStatus>({
    isRunning: false,
    lastRunAt: null,
    nextRunAt: null,
    recentActivity: [],
    statistics: {
      messagesProcessed: 0,
      messagesSuccessful: 0,
      messagesFailed: 0,
      avgProcessingTime: 0
    }
  });

  const [countdown, setCountdown] = useState<string>('');

  // Calculate next automation run (every 15 minutes)
  const calculateNextRun = () => {
    const now = new Date();
    const minutesToNext = 15 - (now.getMinutes() % 15);
    const nextRun = new Date(now.getTime() + minutesToNext * 60 * 1000);
    nextRun.setSeconds(0, 0);
    return nextRun;
  };

  // Update countdown timer
  useEffect(() => {
    const updateCountdown = () => {
      const nextRun = calculateNextRun();
      const now = new Date();
      const timeLeft = nextRun.getTime() - now.getTime();
      
      if (timeLeft <= 0) {
        setCountdown('Running now...');
        setStatus(prev => ({ ...prev, isRunning: true }));
      } else {
        const minutes = Math.floor(timeLeft / 60000);
        const seconds = Math.floor((timeLeft % 60000) / 1000);
        setCountdown(`${minutes}:${seconds.toString().padStart(2, '0')}`);
        setStatus(prev => ({ ...prev, isRunning: false, nextRunAt: nextRun }));
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch recent activity and statistics
  const fetchAutomationData = async () => {
    try {
      // Get recent conversations that were AI generated
      const { data: recentMessages } = await supabase
        .from('conversations')
        .select(`
          id,
          sent_at,
          body,
          ai_generated,
          leads!inner(id, first_name, last_name)
        `)
        .eq('direction', 'out')
        .eq('ai_generated', true)
        .gte('sent_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('sent_at', { ascending: false })
        .limit(20);

      const activity: ActivityLog[] = recentMessages?.map(msg => ({
        id: msg.id,
        timestamp: new Date(msg.sent_at),
        type: 'message_sent' as const,
        leadId: msg.leads.id,
        leadName: `${msg.leads.first_name} ${msg.leads.last_name}`,
        message: msg.body.substring(0, 100) + (msg.body.length > 100 ? '...' : ''),
        success: true
      })) || [];

      // Get automation statistics for today
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const { data: todayStats } = await supabase
        .from('conversations')
        .select('id, sent_at')
        .eq('direction', 'out')
        .eq('ai_generated', true)
        .gte('sent_at', todayStart.toISOString());

      const statistics = {
        messagesProcessed: todayStats?.length || 0,
        messagesSuccessful: todayStats?.length || 0,
        messagesFailed: 0,
        avgProcessingTime: 0 // Could be calculated from logs if available
      };

      // Find the last run time
      const lastMessage = recentMessages?.[0];
      const lastRunAt = lastMessage ? new Date(lastMessage.sent_at) : null;

      setStatus(prev => ({
        ...prev,
        lastRunAt,
        recentActivity: activity,
        statistics
      }));

    } catch (error) {
      console.error('Error fetching automation data:', error);
    }
  };

  // Real-time subscription to new messages
  useEffect(() => {
    fetchAutomationData();

    const unsubscribe = optimizedRealtimeManager.subscribe({
      id: 'ai-automation-status',
      callback: (payload) => {
        if (payload.table === 'conversations' && payload.eventType === 'INSERT') {
          const newConversation = payload.new;
          if (newConversation.direction === 'out' && newConversation.ai_generated) {
            // Refresh data when new AI messages are sent
            fetchAutomationData();
          }
        }
      },
      filters: {
        event: '*',
        schema: 'public',
        table: 'conversations'
      }
    });

    const interval = setInterval(fetchAutomationData, 60000); // Refresh every minute

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const triggerTestRun = async () => {
    try {
      setStatus(prev => ({ ...prev, isRunning: true }));
      
      const response = await supabase.functions.invoke('ai-automation', {
        body: { 
          automated: false, 
          source: 'manual_test',
          priority: 'high' 
        }
      });

      if (response.error) throw response.error;

      // Refresh data after test run
      setTimeout(fetchAutomationData, 2000);
      
      return response.data;
    } catch (error) {
      console.error('Error triggering test run:', error);
      throw error;
    } finally {
      setStatus(prev => ({ ...prev, isRunning: false }));
    }
  };

  return {
    ...status,
    countdown,
    triggerTestRun,
    refresh: fetchAutomationData
  };
};