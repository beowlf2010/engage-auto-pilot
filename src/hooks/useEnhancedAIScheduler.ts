
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
    console.log('Processing enhanced AI scheduled messages...');

    try {
      // First, resume any paused sequences that should resume
      await resumePausedSequences();

      // Get all leads with AI enabled and messages due
      const { data: leads, error } = await supabase
        .from('leads')
        .select('id, first_name, last_name, vehicle_interest, ai_stage, ai_messages_sent')
        .eq('ai_opt_in', true)
        .eq('ai_sequence_paused', false)
        .not('next_ai_send_at', 'is', null)
        .lte('next_ai_send_at', new Date().toISOString())
        .limit(10); // Process in batches to avoid overwhelming the system

      if (error) throw error;

      console.log(`Found ${leads?.length || 0} leads with enhanced messages due`);

      for (const lead of leads || []) {
        try {
          const message = await generateEnhancedAIMessage(lead.id);
          
          if (message) {
            // Send the AI-generated message
            await sendMessage(lead.id, message, profile, true);
            
            // Schedule the next message using the enhanced system
            const { scheduleEnhancedAIMessages } = await import('@/services/enhancedAIMessageService');
            await scheduleEnhancedAIMessages(lead.id);
            
            console.log(`Sent enhanced AI message ${lead.ai_messages_sent + 1} to ${lead.first_name} ${lead.last_name} (Stage: ${lead.ai_stage})`);
          } else {
            // No more messages to send, clear the schedule
            await supabase
              .from('leads')
              .update({ 
                next_ai_send_at: null,
                ai_sequence_paused: true,
                ai_pause_reason: 'sequence_completed'
              })
              .eq('id', lead.id);
            
            console.log(`Completed AI sequence for ${lead.first_name} ${lead.last_name}`);
          }
        } catch (error) {
          console.error(`Error processing enhanced message for lead ${lead.id}:`, error);
        }
      }
    } catch (error) {
      console.error('Error processing enhanced scheduled messages:', error);
    } finally {
      setProcessing(false);
    }
  };

  // Check for scheduled messages every 30 seconds (more frequent for aggressive scheduling)
  useEffect(() => {
    const interval = setInterval(processScheduledMessages, 30000);
    
    // Run immediately on mount
    processScheduledMessages();
    
    return () => clearInterval(interval);
  }, [profile, processing]);

  return { processing, processScheduledMessages };
};
