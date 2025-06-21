
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export const fixLeadAIStage = async (leadId: string) => {
  try {
    console.log(`🔧 Fixing AI stage for lead ${leadId}`);
    
    // Get lead details including phone numbers
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

    // Check if lead has a valid phone number
    const { data: phoneData } = await supabase
      .from('phone_numbers')
      .select('number, is_primary')
      .eq('lead_id', leadId)
      .eq('is_primary', true)
      .single();

    if (!phoneData || phoneData.number === '+15551234567') {
      console.warn('Lead has no valid phone number - AI will be paused');
      
      const { error: updateError } = await supabase
        .from('leads')
        .update({
          ai_sequence_paused: true,
          ai_pause_reason: 'No valid phone number',
          pending_human_response: true
        })
        .eq('id', leadId);

      if (updateError) {
        console.error('Error pausing AI for lead without phone:', updateError);
        return false;
      }

      toast({
        title: "AI Paused",
        description: `${lead.first_name} ${lead.last_name} needs a valid phone number before AI can continue.`,
        variant: "destructive"
      });

      return false;
    }

    // Calculate days since creation
    const daysSinceCreated = Math.floor(
      (new Date().getTime() - new Date(lead.created_at).getTime()) / (1000 * 60 * 60 * 24)
    );

    // Determine proper stage based on days since creation
    let properStage = 'initial_contact';
    if (daysSinceCreated >= 7) {
      properStage = 'week_1_followup';
    } else if (daysSinceCreated >= 3) {
      properStage = 'day_3_followup';
    } else if (daysSinceCreated >= 1) {
      properStage = 'day_2_followup';
    }

    // Clear any failed conversations first
    await supabase
      .from('conversations')
      .delete()
      .eq('lead_id', leadId)
      .eq('direction', 'out')
      .in('sms_status', ['pending', 'failed']);

    // Clear any pending AI messages
    await supabase
      .from('ai_message_approval_queue')
      .delete()
      .eq('lead_id', leadId);

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
        ai_messages_sent: 0, // Reset message count to restart sequence
        pending_human_response: false
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
    
    // Find leads with AI enabled but problematic stages or missing phone numbers
    const { data: stuckLeads, error } = await supabase
      .from('leads')
      .select(`
        id, first_name, last_name, ai_stage, created_at,
        phone_numbers!inner(number, is_primary)
      `)
      .eq('ai_opt_in', true)
      .or('ai_stage.eq.ready_for_contact,ai_stage.is.null,next_ai_send_at.is.null');

    if (error) {
      console.error('Error finding stuck leads:', error);
      return;
    }

    console.log(`Found ${stuckLeads?.length || 0} potentially stuck leads`);

    let fixedCount = 0;
    for (const lead of stuckLeads || []) {
      const hasValidPhone = lead.phone_numbers?.some(
        (phone: any) => phone.is_primary && phone.number !== '+15551234567'
      );

      if (!hasValidPhone) {
        console.log(`Skipping ${lead.first_name} ${lead.last_name} - no valid phone number`);
        continue;
      }

      const success = await fixLeadAIStage(lead.id);
      if (success) {
        fixedCount++;
      }
      
      // Small delay between fixes
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    toast({
      title: "Bulk Fix Complete",
      description: `Fixed ${fixedCount} stuck AI sequences`,
    });
  } catch (error) {
    console.error('Error fixing stuck leads:', error);
  }
};

// New function to validate and fix leads with placeholder phone numbers
export const fixLeadsWithPlaceholderPhones = async () => {
  try {
    console.log('📞 Finding leads with placeholder phone numbers...');
    
    const { data: leadsWithPlaceholders, error } = await supabase
      .from('leads')
      .select(`
        id, first_name, last_name,
        phone_numbers!inner(id, number, is_primary)
      `)
      .eq('phone_numbers.number', '+15551234567')
      .eq('phone_numbers.is_primary', true);

    if (error) {
      console.error('Error finding placeholder phones:', error);
      return;
    }

    console.log(`Found ${leadsWithPlaceholders?.length || 0} leads with placeholder phone numbers`);

    for (const lead of leadsWithPlaceholders || []) {
      // Pause AI for these leads until real phone numbers are added
      await supabase
        .from('leads')
        .update({
          ai_sequence_paused: true,
          ai_pause_reason: 'Placeholder phone number needs replacement',
          pending_human_response: true
        })
        .eq('id', lead.id);

      console.log(`Paused AI for ${lead.first_name} ${lead.last_name} - placeholder phone detected`);
    }

    if (leadsWithPlaceholders && leadsWithPlaceholders.length > 0) {
      toast({
        title: "Phone Numbers Need Update",
        description: `${leadsWithPlaceholders.length} leads have placeholder phone numbers and need manual updates.`,
        variant: "destructive"
      });
    }

  } catch (error) {
    console.error('Error fixing placeholder phones:', error);
  }
};
