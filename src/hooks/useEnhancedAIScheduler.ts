
import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { centralizedAI } from '@/services/centralizedAIService';
import { processProactiveMessages } from '@/services/proactiveAIService';
import { sendMessage } from '@/services/messagesService';
import { useAuth } from '@/components/auth/AuthProvider';

export const useEnhancedAIScheduler = () => {
  const [processing, setProcessing] = useState(false);
  const [lastProcessedAt, setLastProcessedAt] = useState<Date | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const { profile } = useAuth();

  // Enhanced AI processing that includes both reactive and proactive messaging
  const processAIResponses = async () => {
    if (processing || !profile) return;

    setProcessing(true);
    console.log('🤖 Processing enhanced AI responses (reactive + proactive)...');

    try {
      // 1. Process proactive messages first (new leads needing first contact)
      console.log('📬 Processing proactive messages...');
      const proactiveResults = await processProactiveMessages(profile);
      
      if (proactiveResults.length > 0) {
        const successCount = proactiveResults.filter(r => r.success).length;
        console.log(`✅ Sent ${successCount} proactive messages out of ${proactiveResults.length} attempts`);
      }

      // 2. Process reactive messages (responses to incoming messages)
      console.log('💬 Processing reactive responses...');
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

      if (leadsWithUnresponded && leadsWithUnresponded.length > 0) {
        const uniqueLeadIds = [...new Set(leadsWithUnresponded.map(item => item.lead_id))];
        console.log(`🤖 Found ${uniqueLeadIds.length} leads that might need reactive responses`);

        for (const leadId of uniqueLeadIds) {
          try {
            const shouldRespond = await centralizedAI.shouldGenerateResponse(leadId);
            if (!shouldRespond) {
              console.log(`⏭️ Skipping lead ${leadId} - no response needed`);
              continue;
            }

            const aiMessage = await centralizedAI.generateResponse(leadId);
            if (!aiMessage) {
              console.log(`❌ No AI message generated for lead ${leadId}`);
              continue;
            }

            console.log(`📤 Sending AI response to lead ${leadId}: ${aiMessage}`);
            await sendMessage(leadId, aiMessage, profile, true);

            centralizedAI.markResponseProcessed(leadId, aiMessage);
            await new Promise(resolve => setTimeout(resolve, 1000));

          } catch (error) {
            console.error(`❌ Error processing AI response for lead ${leadId}:`, error);
          }
        }
      } else {
        console.log('🤖 No leads need reactive responses');
      }

      setLastProcessedAt(new Date());
      console.log('✅ Enhanced AI processing complete');

    } catch (error) {
      console.error('❌ Error in enhanced AI processing:', error);
    } finally {
      setProcessing(false);
    }
  };

  // Start the enhanced scheduler
  useEffect(() => {
    if (!profile) return;

    console.log('🤖 Starting enhanced AI scheduler (proactive + reactive)');
    
    // Process immediately
    processAIResponses();

    // Set up interval (every 2 minutes for more responsive proactive messaging)
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
