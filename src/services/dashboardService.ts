import { supabase } from '@/integrations/supabase/client';
import { errorHandlingService } from '@/services/errorHandlingService';
import { getCorrectLeadCounts } from '@/services/leadStatusTransitionService';

export interface DashboardData {
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
  unreadCount: number;
  recentActivity: any[];
}

class DashboardService {
  private static instance: DashboardService;

  public static getInstance(): DashboardService {
    if (!DashboardService.instance) {
      DashboardService.instance = new DashboardService();
    }
    return DashboardService.instance;
  }

  async getDashboardData(): Promise<DashboardData> {
    try {
      // Use Promise.allSettled to handle failures gracefully
      const [leadCountsResult, messageStatsResult, unreadCountResult, recentActivityResult] = await Promise.allSettled([
        this.getLeadCounts(),
        this.getMessageStats(),
        this.getUnreadCount(),
        this.getRecentActivity()
      ]);

      return {
        leadCounts: leadCountsResult.status === 'fulfilled' ? leadCountsResult.value : {
          totalLeads: 0,
          newLeads: 0,
          engagedLeads: 0,
          aiEnabledLeads: 0,
          needsAttention: 0
        },
        messageStats: messageStatsResult.status === 'fulfilled' ? messageStatsResult.value : null,
        unreadCount: unreadCountResult.status === 'fulfilled' ? unreadCountResult.value : 0,
        recentActivity: recentActivityResult.status === 'fulfilled' ? recentActivityResult.value : []
      };
    } catch (error) {
      errorHandlingService.handleError(error, { operation: 'getDashboardData' });
      
      // Return safe defaults
      return {
        leadCounts: {
          totalLeads: 0,
          newLeads: 0,
          engagedLeads: 0,
          aiEnabledLeads: 0,
          needsAttention: 0
        },
        messageStats: null,
        unreadCount: 0,
        recentActivity: []
      };
    }
  }

  private async getLeadCounts() {
    try {
      return await getCorrectLeadCounts();
    } catch (error) {
      errorHandlingService.handleError(error, { operation: 'getLeadCounts' });
      throw error;
    }
  }

  private async getMessageStats() {
    try {
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

      return null;
    } catch (error) {
      errorHandlingService.handleError(error, { operation: 'getMessageStats' });
      throw error;
    }
  }

  private async getUnreadCount() {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('id')
        .eq('direction', 'in')
        .is('read_at', null);

      if (error) throw error;

      return data ? data.length : 0;
    } catch (error) {
      errorHandlingService.handleError(error, { operation: 'getUnreadCount' });
      throw error;
    }
  }

  private async getRecentActivity() {
    try {
      // Get recent conversations and appointments
      const [conversationsResult, appointmentsResult] = await Promise.allSettled([
        supabase
          .from('conversations')
          .select('id, lead_id, body, direction, sent_at')
          .order('sent_at', { ascending: false })
          .limit(5),
        supabase
          .from('appointments')
          .select('id, lead_id, title, scheduled_at, status')
          .order('created_at', { ascending: false })
          .limit(5)
      ]);

      const conversations = conversationsResult.status === 'fulfilled' ? conversationsResult.value.data || [] : [];
      const appointments = appointmentsResult.status === 'fulfilled' ? appointmentsResult.value.data || [] : [];

      // Combine and sort by timestamp
      const activities = [
        ...conversations.map(c => ({ ...c, type: 'conversation', timestamp: c.sent_at })),
        ...appointments.map(a => ({ ...a, type: 'appointment', timestamp: a.scheduled_at }))
      ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      return activities.slice(0, 10);
    } catch (error) {
      errorHandlingService.handleError(error, { operation: 'getRecentActivity' });
      throw error;
    }
  }

  // Health check method
  async healthCheck(): Promise<{ status: 'healthy' | 'degraded' | 'unhealthy'; checks: Record<string, boolean> }> {
    const checks = {
      database: false,
      leads: false,
      conversations: false,
      appointments: false
    };

    try {
      // Test database connection
      const { error: dbError } = await supabase.from('profiles').select('id').limit(1);
      checks.database = !dbError;

      // Test leads table
      const { error: leadsError } = await supabase.from('leads').select('id').limit(1);
      checks.leads = !leadsError;

      // Test conversations table
      const { error: conversationsError } = await supabase.from('conversations').select('id').limit(1);
      checks.conversations = !conversationsError;

      // Test appointments table
      const { error: appointmentsError } = await supabase.from('appointments').select('id').limit(1);
      checks.appointments = !appointmentsError;

      const healthyCount = Object.values(checks).filter(Boolean).length;
      const status = healthyCount === 4 ? 'healthy' : healthyCount >= 2 ? 'degraded' : 'unhealthy';

      return { status, checks };
    } catch (error) {
      errorHandlingService.handleError(error, { operation: 'healthCheck' });
      return { status: 'unhealthy', checks };
    }
  }
}

export const dashboardService = DashboardService.getInstance();