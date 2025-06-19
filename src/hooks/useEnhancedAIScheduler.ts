
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

  // Enhanced AI processing that includes reactive, proactive, and aggressive messaging
  const processAIResponses = async () => {
    if (processing || !profile) return;

    setProcessing(true);
    console.log('🤖 Processing enhanced AI responses (reactive + proactive + scheduled + aggressive)...');

    try {
      // 1. Process aggressive messages first (highest priority)
      console.log('🔥 Processing aggressive messages...');
      const { processAggressiveMessages } = await import('@/services/aggressiveMessagingService');
      await processAggressiveMessages(profile);

      // 2. Process scheduled follow-up messages
      console.log('⏰ Processing scheduled follow-up messages...');
      await processScheduledFollowUps();

      // 3. Process proactive messages (new leads needing first contact)
      console.log('📬 Processing proactive messages...');
      const proactiveResults = await processProactiveMessages(profile);
      
      if (proactiveResults.length > 0) {
        const successCount = proactiveResults.filter(r => r.success).length;
        console.log(`✅ Sent ${successCount} proactive messages out of ${proactiveResults.length} attempts`);
      }

      // 4. Process reactive messages (responses to incoming messages)
      console.log('💬 Processing reactive responses...');
      const { data: leadsWithUnresponded } = await supabase
        .from('conversations')
        .select(`
          lead_id,
          leads!inner(
            first_name,
            last_name,
            ai_opt_in,
            ai_sequence_paused,
            ai_stage
          )
        `)
        .eq('direction', 'in')
        .is('read_at', null)
        .eq('leads.ai_opt_in', true)
        .eq('leads.ai_sequence_paused', false)
        .neq('leads.ai_stage', 'aggressive_unresponsive') // Don't process reactive for aggressive leads
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

  // Process scheduled follow-up messages for leads with past-due next_ai_send_at
  const processScheduledFollowUps = async () => {
    try {
      const now = new Date().toISOString();
      
      // Get leads with past-due scheduled messages
      const { data: scheduledLeads, error } = await supabase
        .from('leads')
        .select(`
          id,
          first_name,
          last_name,
          ai_stage,
          ai_messages_sent,
          next_ai_send_at,
          vehicle_interest
        `)
        .eq('ai_opt_in', true)
        .eq('ai_sequence_paused', false)
        .not('next_ai_send_at', 'is', null)
        .lt('next_ai_send_at', now)
        .limit(20);

      if (error) {
        console.error('Error fetching scheduled leads:', error);
        return;
      }

      if (!scheduledLeads || scheduledLeads.length === 0) {
        console.log('⏰ No scheduled follow-up messages due');
        return;
      }

      console.log(`⏰ Found ${scheduledLeads.length} leads with past-due scheduled messages`);

      for (const lead of scheduledLeads) {
        try {
          console.log(`⏰ Processing scheduled follow-up for ${lead.first_name} ${lead.last_name} (${lead.vehicle_interest})`);
          
          // Generate follow-up message using the current AI stage
          const currentStage = lead.ai_stage || 'follow_up';
          const aiMessage = await centralizedAI.generateResponse(lead.id);
          
          if (!aiMessage) {
            console.log(`❌ No AI message generated for scheduled follow-up: ${lead.id}`);
            continue;
          }

          // Send the message
          console.log(`📤 Sending scheduled follow-up to ${lead.first_name}: ${aiMessage}`);
          await sendMessage(lead.id, aiMessage, profile, true);

          // Update the lead's AI tracking and schedule next message
          await updateLeadAfterScheduledMessage(lead.id, currentStage, lead.ai_messages_sent || 0);

          // Mark as processed
          centralizedAI.markResponseProcessed(lead.id, aiMessage);

          // Add delay between messages
          await new Promise(resolve => setTimeout(resolve, 2000));

        } catch (error) {
          console.error(`❌ Error processing scheduled follow-up for lead ${lead.id}:`, error);
        }
      }

    } catch (error) {
      console.error('❌ Error in processScheduledFollowUps:', error);
    }
  };

  // Update lead tracking after sending a scheduled message
  const updateLeadAfterScheduledMessage = async (
    leadId: string, 
    currentStage: string, 
    currentMessagesSent: number
  ) => {
    try {
      const messagesSent = currentMessagesSent + 1;
      const nextStage = getNextAIStage(currentStage, messagesSent);
      
      // Calculate next send time (24-48 hours based on stage)
      const nextSendAt = new Date();
      const hoursToAdd = nextStage === 'follow_up' ? 24 : 
                        nextStage === 'engagement' ? 36 : 48;
      nextSendAt.setHours(nextSendAt.getHours() + hoursToAdd);

      const { error } = await supabase
        .from('leads')
        .update({
          ai_messages_sent: messagesSent,
          ai_stage: nextStage,
          next_ai_send_at: nextSendAt.toISOString(),
          ai_last_message_stage: currentStage
        })
        .eq('id', leadId);

      if (error) {
        console.error(`Error updating lead ${leadId} after scheduled message:`, error);
      } else {
        console.log(`✅ Updated lead ${leadId}: stage=${nextStage}, next_send=${nextSendAt.toISOString()}`);
      }

    } catch (error) {
      console.error(`Error in updateLeadAfterScheduledMessage for lead ${leadId}:`, error);
    }
  };

  // Determine next AI stage based on current stage and message count
  const getNextAIStage = (currentStage: string, messageCount: number): string => {
    switch (currentStage) {
      case 'initial':
        return messageCount < 3 ? 'follow_up' : 'engagement';
      case 'follow_up':
        return messageCount < 5 ? 'engagement' : 'nurture';
      case 'engagement':
        return messageCount < 8 ? 'nurture' : 'closing';
      case 'nurture':
        return messageCount < 12 ? 'closing' : 'long_term_follow_up';
      case 'closing':
        return 'long_term_follow_up';
      default:
        return 'follow_up';
    }
  };

  // Start the enhanced scheduler
  useEffect(() => {
    if (!profile) return;

    console.log('🤖 Starting enhanced AI scheduler (proactive + reactive + scheduled + aggressive)');
    
    // Process immediately
    processAIResponses();

    // Set up interval (every 1 minute for aggressive messaging responsiveness)
    intervalRef.current = setInterval(processAIResponses, 1 * 60 * 1000);

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
