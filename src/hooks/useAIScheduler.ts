
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { generateAIMessage, scheduleNextAIMessage } from '@/services/aiMessageService';
import { sendMessage } from '@/services/messagesService';
import { useAuth } from '@/components/auth/AuthProvider';

export const useAIScheduler = () => {
  const [processing, setProcessing] = useState(false);
  const { profile } = useAuth();

  const processScheduledMessages = async () => {
    if (!profile || processing) return;

    setProcessing(true);
    console.log('Processing scheduled AI messages...');

    try {
      // Get all leads with AI enabled and messages due
      const { data: leads, error } = await supabase
        .from('leads')
        .select('id, first_name, last_name, vehicle_interest, ai_stage')
        .eq('ai_opt_in', true)
        .not('next_ai_send_at', 'is', null)
        .lte('next_ai_send_at', new Date().toISOString());

      if (error) throw error;

      console.log(`Found ${leads?.length || 0} leads with messages due`);

      for (const lead of leads || []) {
        try {
          const message = await generateAIMessage(lead.id);
          
          if (message) {
            // Send the AI-generated message
            await sendMessage(lead.id, message, profile, true);
            
            // Schedule the next message
            await scheduleNextAIMessage(lead.id);
            
            console.log(`Sent AI message to ${lead.first_name} ${lead.last_name}`);
          } else {
            // No more messages to send, clear the schedule
            await supabase
              .from('leads')
              .update({ next_ai_send_at: null })
              .eq('id', lead.id);
          }
        } catch (error) {
          console.error(`Error processing message for lead ${lead.id}:`, error);
        }
      }
    } catch (error) {
      console.error('Error processing scheduled messages:', error);
    } finally {
      setProcessing(false);
    }
  };

  // Check for scheduled messages every minute
  useEffect(() => {
    const interval = setInterval(processScheduledMessages, 60000);
    
    // Run immediately on mount
    processScheduledMessages();
    
    return () => clearInterval(interval);
  }, [profile, processing]);

  return { processing, processScheduledMessages };
};
