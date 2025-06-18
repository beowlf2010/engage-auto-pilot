
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface TakeoverCheckResult {
  shouldTakeover: boolean;
  leadId: string;
  reason?: string;
}

// Check if AI should take over a conversation
export const checkAITakeover = async (leadId: string): Promise<TakeoverCheckResult> => {
  try {
    const { data: lead, error } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (error || !lead) {
      return { shouldTakeover: false, leadId, reason: 'Lead not found' };
    }

    // Check if AI takeover is enabled and there's a pending human response
    if (!lead.ai_takeover_enabled || !lead.pending_human_response) {
      return { shouldTakeover: false, leadId, reason: 'AI takeover not enabled or no pending response' };
    }

    // Check if the deadline has passed
    const deadline = new Date(lead.human_response_deadline);
    const now = new Date();

    if (deadline <= now) {
      return { shouldTakeover: true, leadId, reason: 'Human response deadline has passed' };
    }

    return { shouldTakeover: false, leadId, reason: 'Deadline not yet reached' };
  } catch (error) {
    console.error('Error checking AI takeover:', error);
    return { shouldTakeover: false, leadId, reason: 'Error checking takeover conditions' };
  }
};

// Execute AI takeover for a lead
export const executeAITakeover = async (leadId: string): Promise<boolean> => {
  try {
    console.log(`🤖 Executing AI takeover for lead ${leadId}`);

    // Clear the pending human response flag
    const { error: updateError } = await supabase
      .from('leads')
      .update({
        pending_human_response: false,
        human_response_deadline: null,
        ai_stage: 'takeover_executed',
        next_ai_send_at: new Date().toISOString() // Schedule immediate AI response
      })
      .eq('id', leadId);

    if (updateError) {
      console.error('Error updating lead for takeover:', updateError);
      return false;
    }

    console.log(`✅ AI takeover executed for lead ${leadId}`);
    return true;
  } catch (error) {
    console.error('Error executing AI takeover:', error);
    return false;
  }
};

// Process all leads that need AI takeover
export const processAITakeovers = async (): Promise<void> => {
  try {
    console.log('🔍 Checking for leads needing AI takeover...');

    // Get leads with pending human responses where deadline has passed
    const { data: leads, error } = await supabase
      .from('leads')
      .select('id, first_name, last_name, human_response_deadline')
      .eq('ai_takeover_enabled', true)
      .eq('pending_human_response', true)
      .not('human_response_deadline', 'is', null);

    if (error) {
      console.error('Error fetching leads for takeover:', error);
      return;
    }

    if (!leads || leads.length === 0) {
      console.log('📭 No leads need AI takeover');
      return;
    }

    const now = new Date();
    const takeoverLeads = leads.filter(lead => 
      new Date(lead.human_response_deadline) <= now
    );

    if (takeoverLeads.length === 0) {
      console.log('⏰ No takeover deadlines have passed yet');
      return;
    }

    console.log(`🚀 Processing AI takeover for ${takeoverLeads.length} leads`);

    for (const lead of takeoverLeads) {
      const success = await executeAITakeover(lead.id);
      if (success) {
        console.log(`✅ AI takeover completed for ${lead.first_name} ${lead.last_name}`);
      } else {
        console.error(`❌ AI takeover failed for ${lead.first_name} ${lead.last_name}`);
      }
    }
  } catch (error) {
    console.error('Error processing AI takeovers:', error);
  }
};

// Trigger AI takeover for a specific lead (manual trigger)
export const triggerAITakeover = async (leadId: string): Promise<void> => {
  const takeoverCheck = await checkAITakeover(leadId);
  
  if (!takeoverCheck.shouldTakeover) {
    toast({
      title: "AI Takeover Not Available",
      description: takeoverCheck.reason || "AI takeover conditions not met",
      variant: "destructive"
    });
    return;
  }

  const success = await executeAITakeover(leadId);
  
  if (success) {
    toast({
      title: "AI Takeover Executed",
      description: "AI has taken over the conversation and will respond shortly",
      variant: "default"
    });
  } else {
    toast({
      title: "Error",
      description: "Failed to execute AI takeover",
      variant: "destructive"
    });
  }
};
