
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface MarkLostResult {
  success: boolean;
  error?: string;
}

export const markLeadAsLost = async (leadId: string): Promise<MarkLostResult> => {
  try {
    console.log(`🚫 [LEAD STATUS] Marking lead ${leadId} as lost`);
    
    const { error } = await supabase
      .from('leads')
      .update({
        status: 'lost',
        ai_opt_in: false,
        ai_contact_enabled: false,
        ai_replies_enabled: false,
        ai_sequence_paused: true,
        ai_pause_reason: 'marked_lost',
        next_ai_send_at: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', leadId);

    if (error) {
      console.error('❌ [LEAD STATUS] Error marking lead as lost:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ [LEAD STATUS] Lead marked as lost successfully');
    return { success: true };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ [LEAD STATUS] Exception marking lead as lost:', error);
    return { success: false, error: errorMsg };
  }
};

export const markLeadAsSold = async (leadId: string): Promise<MarkLostResult> => {
  try {
    console.log(`✅ [LEAD STATUS] Marking lead ${leadId} as sold`);
    
    const { error } = await supabase
      .from('leads')
      .update({
        status: 'closed',
        ai_opt_in: false,
        ai_contact_enabled: false,
        ai_replies_enabled: false,
        ai_sequence_paused: true,
        ai_pause_reason: 'marked_sold',
        next_ai_send_at: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', leadId);

    if (error) {
      console.error('❌ [LEAD STATUS] Error marking lead as sold:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ [LEAD STATUS] Lead marked as sold successfully');
    return { success: true };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ [LEAD STATUS] Exception marking lead as sold:', error);
    return { success: false, error: errorMsg };
  }
};

export const markMultipleLeadsAsLost = async (leadIds: string[]): Promise<MarkLostResult> => {
  try {
    console.log(`🚫 [LEAD STATUS] Marking ${leadIds.length} leads as lost`);
    
    const { error } = await supabase
      .from('leads')
      .update({
        status: 'lost',
        ai_opt_in: false,
        ai_contact_enabled: false,
        ai_replies_enabled: false,
        ai_sequence_paused: true,
        ai_pause_reason: 'marked_lost',
        next_ai_send_at: null,
        updated_at: new Date().toISOString()
      })
      .in('id', leadIds);

    if (error) {
      console.error('❌ [LEAD STATUS] Error marking leads as lost:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ [LEAD STATUS] Leads marked as lost successfully');
    return { success: true };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ [LEAD STATUS] Exception marking leads as lost:', error);
    return { success: false, error: errorMsg };
  }
};

export const markMultipleLeadsAsSold = async (leadIds: string[]): Promise<MarkLostResult> => {
  try {
    console.log(`✅ [LEAD STATUS] Marking ${leadIds.length} leads as sold`);
    
    const { error } = await supabase
      .from('leads')
      .update({
        status: 'closed',
        ai_opt_in: false,
        ai_contact_enabled: false,
        ai_replies_enabled: false,
        ai_sequence_paused: true,
        ai_pause_reason: 'marked_sold',
        next_ai_send_at: null,
        updated_at: new Date().toISOString()
      })
      .in('id', leadIds);

    if (error) {
      console.error('❌ [LEAD STATUS] Error marking leads as sold:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ [LEAD STATUS] Leads marked as sold successfully');
    return { success: true };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ [LEAD STATUS] Exception marking leads as sold:', error);
    return { success: false, error: errorMsg };
  }
};
