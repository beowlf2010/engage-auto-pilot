
import { supabase } from '@/integrations/supabase/client';

export const getRPOAnalytics = async () => {
  try {
    const { data, error } = await supabase.rpc('get_rpo_analytics');
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching RPO analytics:', error);
    return [];
  }
};
