import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { aiIntelligenceHub } from '@/services/aiIntelligenceHub';
import { toast } from '@/hooks/use-toast';

interface UseAutoAIResponsesProps {
  profileId: string;
  onResponseGenerated?: (leadId: string, response: string, context: any) => void;
  onResponsePreview?: (leadId: string, preview: any) => void;
}

export const useAutoAIResponses = ({ profileId, onResponseGenerated, onResponsePreview }: UseAutoAIResponsesProps) => {
  const processedMessages = useRef(new Set<string>());
  const isProcessing = useRef(false);
  const channelRef = useRef<any>(null);

  const shouldGenerateResponse = (context: any): boolean => {
    const lastCustomerMessage = context.messages.filter((msg: any) => msg.direction === 'in').slice(-1)[0];
    if (!lastCustomerMessage) return false;
    
    const responseAfter = context.messages.find((msg: any) => 
      msg.direction === 'out' && 
      new Date(msg.sentAt) > new Date(lastCustomerMessage.sentAt)
    );
    
    return !responseAfter;
  };

  const processIncomingMessage = useCallback(async (messageId: string, leadId: string) => {
    if (processedMessages.current.has(messageId) || isProcessing.current) {
      console.log('🤖 [AUTO AI] Skipping already processed message:', messageId);
      return;
    }

    processedMessages.current.add(messageId);
    isProcessing.current = true;

    try {
      console.log('🤖 [AUTO AI] Processing incoming message for AI preview:', leadId);

      const { data: lead } = await supabase
        .from('leads')
        .select('first_name, last_name, vehicle_interest, ai_opt_in')
        .eq('id', leadId)
        .single();

      if (!lead || !lead.ai_opt_in) {
        console.log('🤖 [AUTO AI] Lead not found or AI not enabled for:', leadId);
        return;
      }

      const { data: conversations } = await supabase
        .from('conversations')
        .select('*')
        .eq('lead_id', leadId)
        .order('sent_at', { ascending: true })
        .limit(20);

      if (!conversations) {
        console.log('🤖 [AUTO AI] No conversations found for lead:', leadId);
        return;
      }

      const context = {
        leadId,
        leadName: `${lead.first_name} ${lead.last_name}`,
        vehicleInterest: lead.vehicle_interest || '',
        messages: conversations.map(msg => ({
          id: msg.id,
          body: msg.body,
          direction: msg.direction as 'in' | 'out',
          sentAt: msg.sent_at,
          aiGenerated: msg.ai_generated
        })),
        leadInfo: {
          phone: '',
          status: 'active'
        }
      };

      if (!shouldGenerateResponse(context)) {
        console.log('🤖 [AUTO AI] No response needed for:', leadId);
        return;
      }

      console.log('🎯 [INTELLIGENCE HUB] Generating intelligent AI response preview for:', leadId);

      const intelligentResponse = await aiIntelligenceHub.generateIntelligentResponse({
        leadId,
        leadName: context.leadName,
        vehicleInterest: context.vehicleInterest,
        conversationHistory: conversations.map(msg => msg.body)
      });
      
      if (!intelligentResponse) {
        console.log('🤖 [INTELLIGENCE HUB] No intelligent response generated for:', leadId);
        return;
      }

      console.log('✅ [INTELLIGENCE HUB] Generated intelligent response:', intelligentResponse.substring(0, 100) + '...');

      if (onResponsePreview) {
        onResponsePreview(leadId, {
          message: intelligentResponse,
          confidence: 0.8,
          reasoning: 'AI-generated response based on conversation context',
          intelligenceFactors: ['context_awareness', 'vehicle_interest'],
          personalizationApplied: true,
          inventoryRecommendations: [],
          optimizationApplied: true,
          leadName: lead.first_name,
          context: context
        });
      }

    } catch (error) {
      console.error('❌ [AUTO AI] Error processing message for AI preview:', error);
    } finally {
      isProcessing.current = false;
    }
  }, [profileId, onResponseGenerated, onResponsePreview]);

  useEffect(() => {
    if (channelRef.current) {
      console.log('🤖 [AUTO AI] Cleaning up existing channel');
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    console.log('🤖 [AUTO AI] Setting up real-time subscription for AI previews');

    const channel = supabase
      .channel(`ai-auto-previews-${profileId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'conversations',
          filter: 'direction=eq.in'
        },
        (payload) => {
          console.log('🤖 [AUTO AI] New incoming message detected:', payload.new);
          const newMessage = payload.new as any;
          
          setTimeout(() => {
            processIncomingMessage(newMessage.id, newMessage.lead_id);
          }, 1000);
        }
      )
      .subscribe((status) => {
        console.log('🤖 [AUTO AI] Subscription status:', status);
      });

    channelRef.current = channel;

    return () => {
      console.log('🤖 [AUTO AI] Cleaning up AI preview subscription');
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [processIncomingMessage, profileId]);

  const manualTrigger = useCallback(async (leadId: string) => {
    console.log('🤖 [AUTO AI] Manual trigger requested for lead:', leadId);
    
    const { data: latestMessage } = await supabase
      .from('conversations')
      .select('id')
      .eq('lead_id', leadId)
      .eq('direction', 'in')
      .order('sent_at', { ascending: false })
      .limit(1)
      .single();

    if (latestMessage) {
      console.log('🤖 [AUTO AI] Processing latest message:', latestMessage.id);
      await processIncomingMessage(latestMessage.id, leadId);
    } else {
      console.log('🤖 [AUTO AI] No inbound messages found for lead:', leadId);
      toast({
        title: "No Recent Messages",
        description: "No recent inbound messages to respond to",
        variant: "destructive"
      });
    }
  }, [processIncomingMessage]);

  return {
    manualTrigger,
    isProcessing: isProcessing.current
  };
};
