
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { generateEnhancedAIMessage, resumePausedSequences } from '@/services/enhancedAIMessageService';
import { sendMessage } from '@/services/messagesService';
import { useAuth } from '@/components/auth/AuthProvider';

export const useEnhancedAIScheduler = () => {
  const [processing, setProcessing] = useState(false);
  const { profile } = useAuth();

  const processScheduledMessages = async () => {
    if (!profile || processing) return;

    setProcessing(true);
    console.log('Processing intelligent AI scheduled messages...');

    try {
      // First, resume any paused sequences that should resume
      await resumePausedSequences();

      // Process AI takeover scenarios (leads waiting for human response past deadline)
      await processAITakeoverMessages();

      // Get all leads with AI enabled and messages due
      const { data: leads, error } = await supabase
        .from('leads')
        .select('id, first_name, last_name, vehicle_interest, ai_messages_sent')
        .eq('ai_opt_in', true)
        .eq('ai_sequence_paused', false)
        .eq('pending_human_response', false) // Only process leads not waiting for human response
        .not('next_ai_send_at', 'is', null)
        .lte('next_ai_send_at', new Date().toISOString())
        .limit(10); // Process in batches

      if (error) throw error;

      console.log(`Found ${leads?.length || 0} leads with intelligent messages due`);

      for (const lead of leads || []) {
        try {
          // Generate truly unique AI message
          const message = await generateEnhancedAIMessage(lead.id);
          
          if (message) {
            // Send the AI-generated message
            await sendMessage(lead.id, message, profile, true);
            
            // Schedule the next message using intelligent scheduling
            const { scheduleEnhancedAIMessages } = await import('@/services/enhancedAIMessageService');
            await scheduleEnhancedAIMessages(lead.id);
            
            console.log(`Sent intelligent AI message to ${lead.first_name} ${lead.last_name}: "${message.substring(0, 50)}..."`);
          } else {
            // Clear the schedule if no message was generated (quality controls)
            await supabase
              .from('leads')
              .update({ 
                next_ai_send_at: null,
                ai_sequence_paused: true,
                ai_pause_reason: 'quality_control_block'
              })
              .eq('id', lead.id);
            
            console.log(`No message generated for ${lead.first_name} ${lead.last_name} (quality controls)`);
          }
        } catch (error) {
          console.error(`Error processing intelligent message for lead ${lead.id}:`, error);
        }
      }
    } catch (error) {
      console.error('Error processing intelligent scheduled messages:', error);
    } finally {
      setProcessing(false);
    }
  };

  const processAITakeoverMessages = async () => {
    try {
      const now = new Date();
      
      // Find leads that need AI takeover (human response deadline passed)
      const { data: takeoverLeads, error } = await supabase
        .from('leads')
        .select('id, first_name, last_name, vehicle_interest, ai_takeover_delay_minutes')
        .eq('ai_takeover_enabled', true)
        .eq('pending_human_response', true)
        .not('human_response_deadline', 'is', null)
        .lte('human_response_deadline', now.toISOString());

      if (error) throw error;

      console.log(`Found ${takeoverLeads?.length || 0} leads needing AI takeover`);

      for (const lead of takeoverLeads || []) {
        try {
          // Generate contextual AI response acknowledging the lead's message
          const message = await generateTakeoverMessage(lead.id);
          
          if (message) {
            // Send the AI takeover message
            await sendMessage(lead.id, message, profile, true);
            
            // Clear pending human response status and schedule next AI message
            await supabase
              .from('leads')
              .update({
                pending_human_response: false,
                human_response_deadline: null,
                ai_sequence_paused: false,
                ai_pause_reason: null
              })
              .eq('id', lead.id);

            // Schedule next intelligent message
            const { scheduleEnhancedAIMessages } = await import('@/services/enhancedAIMessageService');
            await scheduleEnhancedAIMessages(lead.id);
            
            console.log(`AI took over conversation for ${lead.first_name} ${lead.last_name}: "${message.substring(0, 50)}..."`);
          }
        } catch (error) {
          console.error(`Error in AI takeover for lead ${lead.id}:`, error);
        }
      }
    } catch (error) {
      console.error('Error processing AI takeover messages:', error);
    }
  };

  const generateTakeoverMessage = async (leadId: string): Promise<string | null> => {
    try {
      // Get recent conversation context
      const { data: recentMessages } = await supabase
        .from('conversations')
        .select('body, direction, sent_at')
        .eq('lead_id', leadId)
        .order('sent_at', { ascending: false })
        .limit(3);

      const latestMessage = recentMessages?.[0];
      if (!latestMessage || latestMessage.direction !== 'in') {
        return null;
      }

      // Get lead info for personalization
      const { data: lead } = await supabase
        .from('leads')
        .select('first_name, vehicle_interest')
        .eq('id', leadId)
        .single();

      if (!lead) return null;

      // Generate contextual takeover message that acknowledges their reply
      const takeoverMessages = [
        `Hi ${lead.first_name}! Thanks for your message. I'm here to help you with ${lead.vehicle_interest}. What questions can I answer for you?`,
        `Hey ${lead.first_name}! I saw your message and wanted to follow up. Are you still interested in ${lead.vehicle_interest}? I'd love to help!`,
        `Hi ${lead.first_name}! Thanks for reaching out. I'm here to help with any questions about ${lead.vehicle_interest}. What would you like to know?`,
        `Hello ${lead.first_name}! I got your message and I'm here to assist. What can I tell you about ${lead.vehicle_interest}?`
      ];

      // Return a random takeover message
      return takeoverMessages[Math.floor(Math.random() * takeoverMessages.length)];
      
    } catch (error) {
      console.error('Error generating takeover message:', error);
      return null;
    }
  };

  // Check for scheduled messages every 60 seconds for intelligent processing
  useEffect(() => {
    const interval = setInterval(processScheduledMessages, 60000);
    
    // Run immediately on mount
    processScheduledMessages();
    
    return () => clearInterval(interval);
  }, [profile, processing]);

  return { processing, processScheduledMessages };
};
