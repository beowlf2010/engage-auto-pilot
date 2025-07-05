import { supabase } from '@/integrations/supabase/client';

interface CallQueueItem {
  queue_id: string;
  lead_id: string;
  phone_number: string;
  priority: number;
  attempt_count: number;
  lead_name: string;
  lead_temperature: string;
}

interface CallLog {
  id: string;
  lead_id: string;
  phone_number: string;
  call_status: string;
  call_outcome: string | null;
  duration_seconds: number;
  created_at: string;
  ended_at: string | null;
}

export class AutoDialingService {
  private static instance: AutoDialingService;

  static getInstance(): AutoDialingService {
    if (!AutoDialingService.instance) {
      AutoDialingService.instance = new AutoDialingService();
    }
    return AutoDialingService.instance;
  }

  // Add lead to dialing queue
  async addLeadToQueue(
    leadId: string,
    phoneNumber: string,
    priority: number = 5,
    campaignId?: string
  ): Promise<string> {
    console.log('📞 [AUTO-DIAL] Adding lead to queue:', leadId, phoneNumber);

    const { data, error } = await supabase.rpc('add_lead_to_dial_queue', {
      p_lead_id: leadId,
      p_phone_number: phoneNumber,
      p_priority: priority,
      p_campaign_id: campaignId
    });

    if (error) {
      console.error('Failed to add lead to queue:', error);
      throw error;
    }

    return data;
  }

  // Get next calls to make
  async getNextCallsToMake(limit: number = 10): Promise<CallQueueItem[]> {
    const { data, error } = await supabase.rpc('get_next_calls_to_make', {
      p_limit: limit
    });

    if (error) {
      console.error('Failed to get next calls:', error);
      throw error;
    }

    return data || [];
  }

  // Make a call
  async makeCall(queueId: string, leadId: string, phoneNumber: string, campaignId?: string): Promise<any> {
    console.log('📞 [AUTO-DIAL] Making call:', phoneNumber);

    const { data, error } = await supabase.functions.invoke('make-call', {
      body: {
        queueId,
        leadId,
        phoneNumber,
        campaignId
      }
    });

    if (error) {
      console.error('Failed to make call:', error);
      throw error;
    }

    return data;
  }

  // Get call logs for a lead
  async getCallLogs(leadId: string): Promise<CallLog[]> {
    const { data, error } = await supabase
      .from('call_logs')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to get call logs:', error);
      throw error;
    }

    return data || [];
  }

  // Get call queue status
  async getCallQueueStatus(): Promise<{
    queued: number;
    calling: number;
    completed: number;
    failed: number;
  }> {
    const { data, error } = await supabase
      .from('auto_dial_queue')
      .select('status')
      .not('status', 'eq', 'paused');

    if (error) {
      console.error('Failed to get queue status:', error);
      return { queued: 0, calling: 0, completed: 0, failed: 0 };
    }

    const statusCounts = data.reduce((acc, item) => {
      acc[item.status as keyof typeof acc] = (acc[item.status as keyof typeof acc] || 0) + 1;
      return acc;
    }, { queued: 0, calling: 0, completed: 0, failed: 0 });

    return statusCounts;
  }

  // Update call queue item priority
  async updateCallPriority(queueId: string, priority: number): Promise<void> {
    const { error } = await supabase
      .from('auto_dial_queue')
      .update({ 
        priority,
        updated_at: new Date().toISOString()
      })
      .eq('id', queueId);

    if (error) {
      console.error('Failed to update call priority:', error);
      throw error;
    }
  }

  // Pause/Resume dialing for a lead
  async pauseDialing(leadId: string, doNotCallUntil?: Date): Promise<void> {
    const { error } = await supabase
      .from('auto_dial_queue')
      .update({
        status: 'paused',
        do_not_call_until: doNotCallUntil?.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('lead_id', leadId);

    if (error) {
      console.error('Failed to pause dialing:', error);
      throw error;
    }
  }

  async resumeDialing(leadId: string): Promise<void> {
    const { error } = await supabase
      .from('auto_dial_queue')
      .update({
        status: 'queued',
        do_not_call_until: null,
        updated_at: new Date().toISOString()
      })
      .eq('lead_id', leadId);

    if (error) {
      console.error('Failed to resume dialing:', error);
      throw error;
    }
  }

  // Smart queue management - prioritize hot leads
  async prioritizeHotLeads(): Promise<void> {
    console.log('🔥 [AUTO-DIAL] Prioritizing hot leads...');

    // Update priorities based on lead temperature and recent activity
    const { error } = await supabase.rpc('prioritize_hot_leads_in_queue');

    if (error) {
      console.error('Failed to prioritize hot leads:', error);
      throw error;
    }
  }

  // Analytics - Get call success rates
  async getCallAnalytics(dateRange: { start: Date; end: Date }): Promise<{
    totalCalls: number;
    successfulCalls: number;
    averageDuration: number;
    successRate: number;
    outcomeBreakdown: Record<string, number>;
  }> {
    const { data, error } = await supabase
      .from('call_logs')
      .select('call_outcome, duration_seconds')
      .gte('created_at', dateRange.start.toISOString())
      .lte('created_at', dateRange.end.toISOString());

    if (error) {
      console.error('Failed to get call analytics:', error);
      return {
        totalCalls: 0,
        successfulCalls: 0,
        averageDuration: 0,
        successRate: 0,
        outcomeBreakdown: {}
      };
    }

    const totalCalls = data.length;
    const successfulCalls = data.filter(call => call.call_outcome === 'answered').length;
    const averageDuration = data.reduce((sum, call) => sum + (call.duration_seconds || 0), 0) / totalCalls;
    const successRate = totalCalls > 0 ? (successfulCalls / totalCalls) * 100 : 0;

    const outcomeBreakdown = data.reduce((acc, call) => {
      const outcome = call.call_outcome || 'unknown';
      acc[outcome] = (acc[outcome] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalCalls,
      successfulCalls,
      averageDuration: Math.round(averageDuration),
      successRate: Math.round(successRate * 100) / 100,
      outcomeBreakdown
    };
  }
}

export const autoDialingService = AutoDialingService.getInstance();