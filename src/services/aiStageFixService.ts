
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export const fixLeadAIStage = async (leadId: string) => {
  try {
    console.log(`🔧 Fixing AI stage for lead ${leadId}`);
    
    // Get lead creation date to determine proper stage
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('created_at, first_name, last_name, ai_opt_in')
      .eq('id', leadId)
      .single();

    if (leadError || !lead) {
      console.error('Error fetching lead:', leadError);
      return false;
    }

    if (!lead.ai_opt_in) {
      console.log('AI not enabled for this lead');
      return false;
    }

    // Calculate days since creation
    const daysSinceCreated = Math.floor(
      (new Date().getTime() - new Date(lead.created_at).getTime()) / (1000 * 60 * 60 * 24)
    );

    // Determine proper stage based on days since creation
    let properStage = 'day_1_morning';
    if (daysSinceCreated >= 7) {
      properStage = 'week_1_followup';
    } else if (daysSinceCreated >= 3) {
      properStage = 'day_3_followup';
    } else if (daysSinceCreated >= 1) {
      properStage = 'day_2_followup';
    }

    // Schedule immediate message send
    const nextSendTime = new Date();
    nextSendTime.setMinutes(nextSendTime.getMinutes() + 2); // Send in 2 minutes

    const { error: updateError } = await supabase
      .from('leads')
      .update({
        ai_stage: properStage,
        next_ai_send_at: nextSendTime.toISOString(),
        ai_sequence_paused: false,
        ai_pause_reason: null,
        ai_messages_sent: 0 // Reset message count to restart sequence
      })
      .eq('id', leadId);

    if (updateError) {
      console.error('Error updating lead AI stage:', updateError);
      return false;
    }

    console.log(`✅ Fixed AI stage for ${lead.first_name} ${lead.last_name}: ${properStage}, next send: ${nextSendTime.toISOString()}`);
    
    toast({
      title: "AI Stage Fixed",
      description: `AI sequence restarted for ${lead.first_name} ${lead.last_name}. Next message in 2 minutes.`,
    });

    return true;
  } catch (error) {
    console.error('Error fixing AI stage:', error);
    return false;
  }
};

export const fixAllStuckLeads = async () => {
  try {
    console.log('🔧 Finding and fixing stuck AI leads...');
    
    // Find leads with AI enabled but problematic stages
    const { data: stuckLeads, error } = await supabase
      .from('leads')
      .select('id, first_name, last_name, ai_stage, created_at')
      .eq('ai_opt_in', true)
      .or('ai_stage.eq.scheduled,ai_stage.is.null,next_ai_send_at.is.null');

    if (error) {
      console.error('Error finding stuck leads:', error);
      return;
    }

    console.log(`Found ${stuckLeads?.length || 0} stuck leads`);

    for (const lead of stuckLeads || []) {
      await fixLeadAIStage(lead.id);
      // Small delay between fixes
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    toast({
      title: "Bulk Fix Complete",
      description: `Fixed ${stuckLeads?.length || 0} stuck AI sequences`,
    });
  } catch (error) {
    console.error('Error fixing stuck leads:', error);
  }
};
