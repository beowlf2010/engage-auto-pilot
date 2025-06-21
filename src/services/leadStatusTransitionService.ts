
import { supabase } from '@/integrations/supabase/client';

export interface LeadStatusTransition {
  leadId: string;
  fromStatus: string;
  toStatus: string;
  reason: string;
  aiMessagesSent?: number;
  hasReply?: boolean;
}

export const transitionLeadStatus = async (
  leadId: string, 
  newStatus: 'new' | 'engaged' | 'paused' | 'closed' | 'lost',
  reason: string
): Promise<boolean> => {
  try {
    console.log(`🔄 [LEAD STATUS] Transitioning lead ${leadId} to ${newStatus}: ${reason}`);
    
    const { error } = await supabase
      .from('leads')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', leadId);

    if (error) {
      console.error('❌ [LEAD STATUS] Error updating lead status:', error);
      return false;
    }

    console.log(`✅ [LEAD STATUS] Lead ${leadId} status updated to ${newStatus}`);
    return true;
  } catch (error) {
    console.error('❌ [LEAD STATUS] Exception updating lead status:', error);
    return false;
  }
};

export const handleAIMessageSent = async (leadId: string): Promise<void> => {
  try {
    // Get current lead data
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('status, ai_messages_sent, last_reply_at, created_at')
      .eq('id', leadId)
      .single();

    if (leadError || !lead) {
      console.error('❌ [LEAD STATUS] Error fetching lead for status transition:', leadError);
      return;
    }

    // If lead is still 'new' and this is their first AI message, move to 'engaged'
    if (lead.status === 'new' && (lead.ai_messages_sent || 0) === 0) {
      await transitionLeadStatus(leadId, 'engaged', 'First AI message sent');
    }
  } catch (error) {
    console.error('❌ [LEAD STATUS] Error handling AI message sent:', error);
  }
};

export const handleCustomerReply = async (leadId: string): Promise<void> => {
  try {
    // Get current lead data
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('status')
      .eq('id', leadId)
      .single();

    if (leadError || !lead) {
      console.error('❌ [LEAD STATUS] Error fetching lead for reply transition:', leadError);
      return;
    }

    // If lead is 'new', move to 'engaged' when they reply
    if (lead.status === 'new') {
      await transitionLeadStatus(leadId, 'engaged', 'Customer replied');
    }
  } catch (error) {
    console.error('❌ [LEAD STATUS] Error handling customer reply:', error);
  }
};

export const getCorrectLeadCounts = async () => {
  try {
    const { data: statusCounts, error } = await supabase
      .from('leads')
      .select('status, ai_opt_in')
      .not('status', 'eq', 'lost'); // Exclude lost leads from attention counts

    if (error) {
      console.error('❌ [LEAD STATUS] Error getting lead counts:', error);
      return {
        totalLeads: 0,
        newLeads: 0,
        engagedLeads: 0,
        aiEnabledLeads: 0,
        needsAttention: 0
      };
    }

    const total = statusCounts.length;
    const newLeads = statusCounts.filter(l => l.status === 'new').length;
    const engagedLeads = statusCounts.filter(l => l.status === 'engaged').length;
    const aiEnabled = statusCounts.filter(l => l.ai_opt_in).length;
    
    // "Needs attention" should only be truly new leads (not contacted yet)
    const needsAttention = newLeads;

    return {
      totalLeads: total,
      newLeads,
      engagedLeads,
      aiEnabledLeads: aiEnabled,
      needsAttention
    };
  } catch (error) {
    console.error('❌ [LEAD STATUS] Error calculating lead counts:', error);
    return {
      totalLeads: 0,
      newLeads: 0,
      engagedLeads: 0,
      aiEnabledLeads: 0,
      needsAttention: 0
    };
  }
};
