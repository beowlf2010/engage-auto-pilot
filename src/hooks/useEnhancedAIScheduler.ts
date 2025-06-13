
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

      // Get all leads with AI enabled and messages due
      const { data: leads, error } = await supabase
        .from('leads')
        .select('id, first_name, last_name, vehicle_interest, ai_messages_sent')
        .eq('ai_opt_in', true)
        .eq('ai_sequence_paused', false)
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

  // Check for scheduled messages every 60 seconds for intelligent processing
  useEffect(() => {
    const interval = setInterval(processScheduledMessages, 60000);
    
    // Run immediately on mount
    processScheduledMessages();
    
    return () => clearInterval(interval);
  }, [profile, processing]);

  return { processing, processScheduledMessages };
};
