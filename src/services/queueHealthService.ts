
import { supabase } from '@/integrations/supabase/client';

export interface QueueHealthData {
  totalOverdue: number;
  totalProcessing: number;
  totalPaused: number;
  queueHealthScore: number;
  lastCheckTime: string;
  alertsTriggered: string[];
}

export interface AutomationSettings {
  batchSize: number;
  maxConcurrentSends: number;
  dailyMessageLimit: number;
  autoUnpauseStaleLeads: boolean;
  stalePauseThresholdDays: number;
}

export const getQueueHealthStatus = async (): Promise<QueueHealthData | null> => {
  try {
    console.log('🔍 Fetching queue health status...');
    
    // Get latest queue health record
    const { data: healthData, error } = await supabase
      .from('ai_queue_health')
      .select('*')
      .order('check_time', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching queue health:', error);
      return null;
    }

    // If no data exists, calculate current status
    if (!healthData) {
      const { data: leads } = await supabase
        .from('leads')
        .select('id, ai_opt_in, ai_sequence_paused, next_ai_send_at')
        .eq('ai_opt_in', true);

      if (!leads) return null;

      const now = new Date();
      const overdue = leads.filter(l => 
        !l.ai_sequence_paused && 
        l.next_ai_send_at && 
        new Date(l.next_ai_send_at) < now
      ).length;

      const paused = leads.filter(l => l.ai_sequence_paused).length;
      const processing = leads.filter(l => !l.ai_sequence_paused).length;

      return {
        totalOverdue: overdue,
        totalProcessing: processing,
        totalPaused: paused,
        queueHealthScore: overdue === 0 ? 100 : Math.max(25, 100 - (overdue * 2)),
        lastCheckTime: now.toISOString(),
        alertsTriggered: overdue > 20 ? ['High overdue count'] : []
      };
    }

    return {
      totalOverdue: healthData.total_overdue || 0,
      totalProcessing: healthData.total_processing || 0,
      totalPaused: healthData.total_paused || 0,
      queueHealthScore: healthData.queue_health_score || 0,
      lastCheckTime: healthData.check_time,
      alertsTriggered: Array.isArray(healthData.alerts_triggered) ? healthData.alerts_triggered : []
    };
  } catch (error) {
    console.error('Error in getQueueHealthStatus:', error);
    return null;
  }
};

export const getAutomationSettings = async (): Promise<AutomationSettings> => {
  try {
    const { data: settings } = await supabase
      .from('ai_automation_settings')
      .select('setting_key, setting_value');

    const settingsMap = settings?.reduce((acc, setting) => {
      acc[setting.setting_key] = setting.setting_value;
      return acc;
    }, {} as Record<string, any>) || {};

    return {
      batchSize: parseInt(settingsMap.batch_size) || 100,
      maxConcurrentSends: parseInt(settingsMap.max_concurrent_sends) || 10,
      dailyMessageLimit: parseInt(settingsMap.daily_message_limit_per_lead) || 8,
      autoUnpauseStaleLeads: settingsMap.auto_unpause_stale_leads === true,
      stalePauseThresholdDays: parseInt(settingsMap.stale_pause_threshold_days) || 7
    };
  } catch (error) {
    console.error('Error fetching automation settings:', error);
    return {
      batchSize: 100,
      maxConcurrentSends: 10,
      dailyMessageLimit: 8,
      autoUnpauseStaleLeads: true,
      stalePauseThresholdDays: 7
    };
  }
};

export const getOverdueLeadsDetails = async () => {
  try {
    const { data: leads } = await supabase
      .from('leads')
      .select(`
        id, first_name, last_name, vehicle_interest, 
        ai_opt_in, ai_sequence_paused, ai_pause_reason,
        next_ai_send_at, ai_messages_sent, message_intensity,
        created_at
      `)
      .eq('ai_opt_in', true)
      .not('next_ai_send_at', 'is', null)
      .lte('next_ai_send_at', new Date().toISOString())
      .order('next_ai_send_at', { ascending: true })
      .limit(50);

    return leads || [];
  } catch (error) {
    console.error('Error fetching overdue leads:', error);
    return [];
  }
};

export const unpauseStaleLeads = async (): Promise<number> => {
  try {
    console.log('🔄 Manually triggering stale lead unpause...');
    
    const { data, error } = await supabase.rpc('auto_unpause_stale_leads');
    
    if (error) {
      console.error('Error unpausing stale leads:', error);
      return 0;
    }
    
    console.log(`✅ Unpaused ${data} stale leads`);
    return data || 0;
  } catch (error) {
    console.error('Exception in unpauseStaleLeads:', error);
    return 0;
  }
};
