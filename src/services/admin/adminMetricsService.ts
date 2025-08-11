import { supabase } from '@/integrations/supabase/client';

export interface GlobalAdminMetrics {
  totalLeads: number;
  aiPausedCount: number;
  dncCall: number;
  dncEmail: number;
  dncMail: number;
}

export const getGlobalAdminMetrics = async (): Promise<GlobalAdminMetrics> => {
  // Fetch counts in parallel for efficiency
  const [total, aiPaused, dncCall, dncEmail, dncMail] = await Promise.all([
    supabase.from('leads').select('id', { count: 'exact', head: true }),
    supabase.from('leads').select('id', { count: 'exact', head: true }).eq('ai_opt_in', false),
    supabase.from('leads').select('id', { count: 'exact', head: true }).eq('do_not_call', true),
    supabase.from('leads').select('id', { count: 'exact', head: true }).eq('do_not_email', true),
    supabase.from('leads').select('id', { count: 'exact', head: true }).eq('do_not_mail', true),
  ]);

  const safeCount = (res: any) => (res.error ? 0 : (res.count as number) || 0);

  return {
    totalLeads: safeCount(total),
    aiPausedCount: safeCount(aiPaused),
    dncCall: safeCount(dncCall),
    dncEmail: safeCount(dncEmail),
    dncMail: safeCount(dncMail),
  };
};
