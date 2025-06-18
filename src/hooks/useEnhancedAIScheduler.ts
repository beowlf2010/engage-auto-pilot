
import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { centralizedAI } from '@/services/centralizedAIService';
import { sendMessage } from '@/services/messagesService';
import { useAuth } from '@/components/auth/AuthProvider';

export const useEnhancedAIScheduler = () => {
  const [processing, setProcessing] = useState(false);
  const [lastProcessedAt, setLastProcessedAt] = useState<Date | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const { profile } = useAuth();

  // Process AI responses for conversations that need them
  const processAIResponses = async () => {
    if (processing || !profile) return;

    setProcessing(true);
    console.log('🤖 Processing AI responses...');

    try {
      // Get leads that have unresponded messages and AI enabled
      const { data: leadsWithUnresponded } = await supabase
        .from('conversations')
        .select(`
          lead_id,
          leads!inner(
            first_name,
            last_name,
            ai_opt_in,
            ai_sequence_paused
          )
        `)
        .eq('direction', 'in')
        .is('read_at', null)
        .eq('leads.ai_opt_in', true)
        .eq('leads.ai_sequence_paused', false)
        .order('sent_at', { ascending: false })
        .limit(10);

      if (!leadsWithUnresponded || leadsWithUnresponded.length === 0) {
        console.log('🤖 No leads need AI responses');
        setLastProcessedAt(new Date());
        return;
      }

      // Get unique lead IDs
      const uniqueLeadIds = [...new Set(leadsWithUnresponded.map(item => item.lead_id))];
      console.log(`🤖 Found ${uniqueLeadIds.length} leads that might need responses`);

      for (const leadId of uniqueLeadIds) {
        try {
          // Check if this lead should get a response
          const shouldRespond = await centralizedAI.shouldGenerateResponse(leadId);
          if (!shouldRespond) {
            console.log(`⏭️ Skipping lead ${leadId} - no response needed`);
            continue;
          }

          // Generate intelligent response
          const aiMessage = await centralizedAI.generateResponse(leadId);
          if (!aiMessage) {
            console.log(`❌ No AI message generated for lead ${leadId}`);
            continue;
          }

          // Send the message
          console.log(`📤 Sending AI response to lead ${leadId}: ${aiMessage}`);
          await sendMessage(leadId, aiMessage, profile, true);

          // Mark as processed
          centralizedAI.markResponseProcessed(leadId, aiMessage);

          // Add small delay between messages to avoid overwhelming
          await new Promise(resolve => setTimeout(resolve, 1000));

        } catch (error) {
          console.error(`❌ Error processing AI response for lead ${leadId}:`, error);
        }
      }

      setLastProcessedAt(new Date());
      console.log('✅ AI response processing complete');

    } catch (error) {
      console.error('❌ Error in AI response processing:', error);
    } finally {
      setProcessing(false);
    }
  };

  // Start the scheduler
  useEffect(() => {
    if (!profile) return;

    console.log('🤖 Starting enhanced AI scheduler');
    
    // Process immediately
    processAIResponses();

    // Set up interval (every 2 minutes)
    intervalRef.current = setInterval(processAIResponses, 2 * 60 * 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      console.log('🤖 Enhanced AI scheduler stopped');
    };
  }, [profile]);

  return {
    processing,
    lastProcessedAt,
    processNow: processAIResponses
  };
};
