
import { useEffect, useRef } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { generateEnhancedAIMessage } from '@/services/enhancedAIMessageService';
import { sendMessage } from '@/services/messagesService';

export const useGlobalAIScheduler = () => {
  const { profile } = useAuth();
  const processingRef = useRef(false);
  const processingLeadsRef = useRef(new Set<string>());

  const processScheduledMessages = async () => {
    if (!profile || processingRef.current) return;

    processingRef.current = true;
    console.log('🤖 Processing global AI scheduled messages...');

    try {
      // Get leads with messages due
      const { data: leadsWithMessagesDue, error } = await supabase
        .from('leads')
        .select('id, first_name, last_name, vehicle_interest, ai_messages_sent, ai_stage')
        .eq('ai_opt_in', true)
        .eq('ai_sequence_paused', false)
        .eq('pending_human_response', false)
        .not('next_ai_send_at', 'is', null)
        .lte('next_ai_send_at', new Date().toISOString())
        .limit(5); // Process in small batches

      if (error) {
        console.error('Error fetching leads with due messages:', error);
        return;
      }

      console.log(`📨 Found ${leadsWithMessagesDue?.length || 0} leads with messages due`);

      for (const lead of leadsWithMessagesDue || []) {
        // Skip if already processing this lead
        if (processingLeadsRef.current.has(lead.id)) {
          console.log(`⏭️ Skipping ${lead.first_name} - already processing`);
          continue;
        }

        // Add to processing set
        processingLeadsRef.current.add(lead.id);

        try {
          console.log(`🎯 Processing message for ${lead.first_name} ${lead.last_name} (Stage: ${lead.ai_stage})`);
          
          // Immediately clear the next_ai_send_at to prevent duplicate processing
          const { error: clearError } = await supabase
            .from('leads')
            .update({ next_ai_send_at: null })
            .eq('id', lead.id);

          if (clearError) {
            console.error(`❌ Error clearing schedule for ${lead.first_name}:`, clearError);
            continue;
          }

          // Generate AI message
          const message = await generateEnhancedAIMessage(lead.id);
          
          if (message) {
            // Send the message
            await sendMessage(lead.id, message, profile, true);
            
            // Update message count
            const currentCount = lead.ai_messages_sent || 0;
            await supabase
              .from('leads')
              .update({
                ai_messages_sent: currentCount + 1
              })
              .eq('id', lead.id);

            // Schedule next message
            const { scheduleEnhancedAIMessages } = await import('@/services/enhancedAIMessageService');
            await scheduleEnhancedAIMessages(lead.id);
            
            console.log(`✅ Sent AI message to ${lead.first_name}: "${message.substring(0, 50)}..."`);
          } else {
            console.log(`❌ No message generated for ${lead.first_name} ${lead.last_name}`);
            
            // Pause sequence if no message generated
            await supabase
              .from('leads')
              .update({ 
                ai_sequence_paused: true,
                ai_pause_reason: 'no_message_generated'
              })
              .eq('id', lead.id);
          }
        } catch (error) {
          console.error(`Error processing message for lead ${lead.id}:`, error);
          
          // Rollback - reschedule for later if there was an error
          const nextRetry = new Date();
          nextRetry.setMinutes(nextRetry.getMinutes() + 5); // Retry in 5 minutes
          
          await supabase
            .from('leads')
            .update({ 
              next_ai_send_at: nextRetry.toISOString(),
              ai_pause_reason: 'processing_error'
            })
            .eq('id', lead.id);
        } finally {
          // Remove from processing set
          processingLeadsRef.current.delete(lead.id);
        }
      }

      // Process AI takeover scenarios
      await processAITakeoverMessages();

    } catch (error) {
      console.error('Error in global AI scheduler:', error);
    } finally {
      processingRef.current = false;
    }
  };

  const processAITakeoverMessages = async () => {
    try {
      const now = new Date();
      
      // Find leads that need AI takeover
      const { data: takeoverLeads, error } = await supabase
        .from('leads')
        .select('id, first_name, last_name, vehicle_interest')
        .eq('ai_takeover_enabled', true)
        .eq('pending_human_response', true)
        .not('human_response_deadline', 'is', null)
        .lte('human_response_deadline', now.toISOString());

      if (error) throw error;

      console.log(`🤖 Found ${takeoverLeads?.length || 0} leads needing AI takeover`);

      for (const lead of takeoverLeads || []) {
        // Skip if already processing this lead
        if (processingLeadsRef.current.has(lead.id)) {
          console.log(`⏭️ Skipping takeover for ${lead.first_name} - already processing`);
          continue;
        }

        // Add to processing set
        processingLeadsRef.current.add(lead.id);

        try {
          // Generate contextual takeover message
          const message = `Hi ${lead.first_name}! Thanks for your message. I'm here to help you with ${lead.vehicle_interest}. What questions can I answer for you?`;
          
          // Send takeover message
          await sendMessage(lead.id, message, profile, true);
          
          // Clear pending human response status
          await supabase
            .from('leads')
            .update({
              pending_human_response: false,
              human_response_deadline: null,
              ai_sequence_paused: false,
              ai_pause_reason: null
            })
            .eq('id', lead.id);

          // Schedule next AI message
          const { scheduleEnhancedAIMessages } = await import('@/services/enhancedAIMessageService');
          await scheduleEnhancedAIMessages(lead.id);
          
          console.log(`🤖 AI took over conversation for ${lead.first_name}: "${message.substring(0, 50)}..."`);
        } catch (error) {
          console.error(`Error in AI takeover for lead ${lead.id}:`, error);
        } finally {
          // Remove from processing set
          processingLeadsRef.current.delete(lead.id);
        }
      }
    } catch (error) {
      console.error('Error processing AI takeover messages:', error);
    }
  };

  // Run scheduler every 30 seconds globally
  useEffect(() => {
    if (!profile) return;

    console.log('🚀 Starting global AI scheduler');
    
    // Run immediately
    processScheduledMessages();
    
    // Then run every 30 seconds
    const interval = setInterval(processScheduledMessages, 30000);
    
    return () => {
      console.log('🛑 Stopping global AI scheduler');
      clearInterval(interval);
      // Clear processing sets on cleanup
      processingLeadsRef.current.clear();
    };
  }, [profile]);

  return { processScheduledMessages };
};
