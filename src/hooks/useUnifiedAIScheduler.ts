
import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { sendMessage } from '@/services/messagesService';
import { useAuth } from '@/components/auth/AuthProvider';

export const useUnifiedAIScheduler = () => {
  const [processing, setProcessing] = useState(false);
  const [lastProcessedAt, setLastProcessedAt] = useState<Date | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const { profile } = useAuth();

  // Unified AI processing that handles both aggressive and gentle messaging
  const processAIMessages = async () => {
    if (processing || !profile) return;

    setProcessing(true);
    console.log('🤖 [UNIFIED AI] Processing unified AI messages...');

    try {
      // 1. Auto-pause sequences when leads reply
      await pauseSequencesForRepliedLeads();

      // 2. Auto-set uncontacted leads to aggressive mode
      await setUncontactedLeadsToAggressive();

      // 3. Process due messages (both aggressive and gentle)
      await processDueMessages();

      // 4. Handle new leads that need initial contact
      await processNewLeads();

      setLastProcessedAt(new Date());
      console.log('✅ [UNIFIED AI] Processing complete');

    } catch (error) {
      console.error('❌ [UNIFIED AI] Error processing messages:', error);
    } finally {
      setProcessing(false);
    }
  };

  // Auto-pause AI sequences when leads reply
  const pauseSequencesForRepliedLeads = async () => {
    const { data: recentReplies } = await supabase
      .from('conversations')
      .select('lead_id, sent_at')
      .eq('direction', 'in')
      .gte('sent_at', new Date(Date.now() - 5 * 60 * 1000).toISOString()) // Last 5 minutes
      .order('sent_at', { ascending: false });

    if (recentReplies && recentReplies.length > 0) {
      const leadIds = [...new Set(recentReplies.map(r => r.lead_id))];
      
      await supabase
        .from('leads')
        .update({
          ai_sequence_paused: true,
          ai_pause_reason: 'Customer replied - human review needed',
          pending_human_response: true
        })
        .in('id', leadIds)
        .eq('ai_opt_in', true)
        .eq('ai_sequence_paused', false);

      console.log(`⏸️ [UNIFIED AI] Auto-paused ${leadIds.length} sequences due to replies`);
    }
  };

  // Auto-set uncontacted leads to aggressive mode
  const setUncontactedLeadsToAggressive = async () => {
    await supabase
      .from('leads')
      .update({ message_intensity: 'aggressive' })
      .eq('ai_opt_in', true)
      .eq('ai_sequence_paused', false)
      .or('ai_messages_sent.is.null,ai_messages_sent.eq.0')
      .neq('message_intensity', 'aggressive');
  };

  // Process leads that need messages sent
  const processDueMessages = async () => {
    const now = new Date().toISOString();
    
    const { data: dueLeads } = await supabase
      .from('leads')
      .select(`
        id,
        first_name,
        last_name,
        vehicle_interest,
        message_intensity,
        ai_messages_sent,
        ai_stage
      `)
      .eq('ai_opt_in', true)
      .eq('ai_sequence_paused', false)
      .not('next_ai_send_at', 'is', null)
      .lt('next_ai_send_at', now)
      .limit(20);

    if (!dueLeads || dueLeads.length === 0) {
      console.log('📭 [UNIFIED AI] No messages due');
      return;
    }

    console.log(`📤 [UNIFIED AI] Processing ${dueLeads.length} due messages`);

    for (const lead of dueLeads) {
      try {
        const message = generateMessage(lead);
        if (!message) continue;

        console.log(`📤 [UNIFIED AI] Sending ${lead.message_intensity} message to ${lead.first_name}: ${message}`);
        await sendMessage(lead.id, message, profile, true);

        // Update lead tracking
        await updateLeadAfterMessage(lead);

        // Add delay between messages
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error) {
        console.error(`❌ [UNIFIED AI] Error sending message to lead ${lead.id}:`, error);
      }
    }
  };

  // Process new leads that need initial contact
  const processNewLeads = async () => {
    const { data: newLeads } = await supabase
      .from('leads')
      .select(`
        id,
        first_name,
        last_name,
        vehicle_interest,
        message_intensity
      `)
      .eq('ai_opt_in', true)
      .eq('ai_sequence_paused', false)
      .or('ai_messages_sent.is.null,ai_messages_sent.eq.0')
      .is('next_ai_send_at', null)
      .limit(10);

    if (!newLeads || newLeads.length === 0) return;

    console.log(`📬 [UNIFIED AI] Processing ${newLeads.length} new leads`);

    for (const lead of newLeads) {
      try {
        const message = generateMessage(lead);
        if (!message) continue;

        console.log(`📤 [UNIFIED AI] Sending initial ${lead.message_intensity} message to ${lead.first_name}: ${message}`);
        await sendMessage(lead.id, message, profile, true);

        // Initialize lead tracking
        await updateLeadAfterMessage(lead);

        // Add delay between messages
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error) {
        console.error(`❌ [UNIFIED AI] Error sending initial message to lead ${lead.id}:`, error);
      }
    }
  };

  // Generate appropriate message based on intensity and stage
  const generateMessage = (lead: any): string | null => {
    const messagesSent = lead.ai_messages_sent || 0;
    const isAggressive = lead.message_intensity === 'aggressive';
    
    if (isAggressive) {
      return generateAggressiveMessage(lead, messagesSent);
    } else {
      return generateGentleMessage(lead, messagesSent);
    }
  };

  // Generate aggressive messages for uncontacted leads
  const generateAggressiveMessage = (lead: any, messagesSent: number): string => {
    const templates = [
      `Hi ${lead.first_name}! I see you're interested in ${lead.vehicle_interest}. We have some great options available right now. When can you come take a look?`,
      `${lead.first_name}, that ${lead.vehicle_interest} won't last long! We've had several people ask about it today. Want to secure it with a quick visit?`,
      `Hey ${lead.first_name}! Great news - we have special financing available on ${lead.vehicle_interest} this week. Interested in learning more?`,
      `${lead.first_name}, this might be your final opportunity on the ${lead.vehicle_interest}. Don't miss out! Available for a quick call today?`,
      `Hi ${lead.first_name}! Last chance - the ${lead.vehicle_interest} you inquired about is being considered by another customer. Still interested?`
    ];
    
    const templateIndex = messagesSent % templates.length;
    return templates[templateIndex];
  };

  // Generate gentle messages for engaged leads
  const generateGentleMessage = (lead: any, messagesSent: number): string => {
    const templates = [
      `Hi ${lead.first_name}, hope you're doing well! Still thinking about ${lead.vehicle_interest}? Happy to answer any questions.`,
      `${lead.first_name}, just wanted to follow up on ${lead.vehicle_interest}. Any questions I can help with?`,
      `Hi ${lead.first_name}, hope you found what you were looking for! If you're still interested in ${lead.vehicle_interest}, we're here to help.`
    ];
    
    const templateIndex = messagesSent % templates.length;
    return templates[templateIndex];
  };

  // Update lead after sending message
  const updateLeadAfterMessage = async (lead: any) => {
    const messagesSent = (lead.ai_messages_sent || 0) + 1;
    const isAggressive = lead.message_intensity === 'aggressive';
    
    // Calculate next send time based on intensity
    const nextSendAt = new Date();
    if (isAggressive) {
      // Aggressive: 2-4 hours between messages
      nextSendAt.setHours(nextSendAt.getHours() + (2 + Math.random() * 2));
    } else {
      // Gentle: 24-48 hours between messages
      nextSendAt.setHours(nextSendAt.getHours() + (24 + Math.random() * 24));
    }

    await supabase
      .from('leads')
      .update({
        ai_messages_sent: messagesSent,
        next_ai_send_at: nextSendAt.toISOString(),
        ai_stage: getNextStage(lead.ai_stage, messagesSent, isAggressive)
      })
      .eq('id', lead.id);
  };

  // Determine next AI stage
  const getNextStage = (currentStage: string, messagesSent: number, isAggressive: boolean): string => {
    if (isAggressive) {
      if (messagesSent <= 2) return 'aggressive_initial';
      if (messagesSent <= 5) return 'aggressive_urgency';
      return 'aggressive_final';
    } else {
      if (messagesSent <= 2) return 'gentle_follow_up';
      if (messagesSent <= 4) return 'gentle_nurture';
      return 'gentle_maintenance';
    }
  };

  // Start the unified scheduler
  useEffect(() => {
    if (!profile) return;

    console.log('🤖 [UNIFIED AI] Starting unified AI scheduler');
    
    // Process immediately
    processAIMessages();

    // Set up interval (every 2 minutes for responsiveness)
    intervalRef.current = setInterval(processAIMessages, 2 * 60 * 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      console.log('🤖 [UNIFIED AI] Scheduler stopped');
    };
  }, [profile]);

  return {
    processing,
    lastProcessedAt,
    processNow: processAIMessages
  };
};
