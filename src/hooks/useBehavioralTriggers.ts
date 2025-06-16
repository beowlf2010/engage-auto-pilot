
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { processPendingEnhancedTriggers } from '@/services/enhancedBehavioralService';
import { BehavioralTrigger, TriggerStats } from '@/components/analytics/behavioral-triggers/types';

export const useBehavioralTriggers = () => {
  const [triggers, setTriggers] = useState<BehavioralTrigger[]>([]);
  const [processing, setProcessing] = useState(false);
  const [stats, setStats] = useState<TriggerStats>({
    total: 0,
    pending: 0,
    processed: 0,
    highUrgency: 0
  });

  const loadTriggers = async () => {
    try {
      // First try the RPC function, fallback to direct table query
      let data: any[] = [];
      
      try {
        const { data: rpcData, error: rpcError } = await supabase.rpc('get_enhanced_triggers');
        if (!rpcError && rpcData) {
          data = rpcData;
        }
      } catch (rpcError) {
        console.log('RPC function not available, using direct query');
      }

      // Fallback to direct table query if RPC fails
      if (!data.length) {
        const { data: tableData, error } = await supabase
          .from('enhanced_behavioral_triggers' as any)
          .select(`
            *,
            leads(first_name, last_name, vehicle_interest)
          `)
          .order('created_at', { ascending: false })
          .limit(20);

        if (!error && tableData) {
          data = tableData;
        }
      }

      if (data) {
        setTriggers(data);
      }
    } catch (error) {
      console.error('Error loading triggers:', error);
      setTriggers([]);
    }
  };

  const loadStats = async () => {
    try {
      const { data: allTriggers } = await supabase
        .from('enhanced_behavioral_triggers' as any)
        .select('processed, urgency_level');

      if (allTriggers) {
        const total = allTriggers.length;
        const pending = allTriggers.filter((t: any) => !t.processed).length;
        const processed = allTriggers.filter((t: any) => t.processed).length;
        const highUrgency = allTriggers.filter((t: any) => 
          ['high', 'critical'].includes(t.urgency_level)
        ).length;

        setStats({ total, pending, processed, highUrgency });
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleProcessTriggers = async () => {
    setProcessing(true);
    try {
      await processPendingEnhancedTriggers();
      await loadTriggers();
      await loadStats();
    } catch (error) {
      console.error('Error processing triggers:', error);
    } finally {
      setProcessing(false);
    }
  };

  useEffect(() => {
    loadTriggers();
    loadStats();
  }, []);

  return {
    triggers,
    processing,
    stats,
    handleProcessTriggers,
    loadTriggers,
    loadStats
  };
};
