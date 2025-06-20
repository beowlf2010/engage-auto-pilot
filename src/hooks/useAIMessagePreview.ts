
import { useState } from 'react';
import { generateWarmInitialMessage } from '@/services/proactive/warmIntroductionService';
import { sendMessage } from '@/services/messagesService';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/components/auth/AuthProvider';

interface UseAIMessagePreviewProps {
  leadId: string;
  onMessageSent?: () => void;
}

export const useAIMessagePreview = ({ leadId, onMessageSent }: UseAIMessagePreviewProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedMessage, setGeneratedMessage] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const { profile } = useAuth();

  const generatePreview = async () => {
    if (!profile) {
      toast({
        title: "Error",
        description: "User profile not loaded",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      // Get lead details
      const { data: lead, error: leadError } = await supabase
        .from('leads')
        .select('*')
        .eq('id', leadId)
        .single();

      if (leadError || !lead) {
        throw new Error('Failed to fetch lead details');
      }

      // Generate preview message
      const message = await generateWarmInitialMessage(lead, profile);
      
      if (message) {
        setGeneratedMessage(message);
        setShowPreview(true);
      } else {
        throw new Error('Failed to generate message');
      }
    } catch (error) {
      console.error('Error generating preview:', error);
      toast({
        title: "Error",
        description: "Failed to generate message preview",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const sendNow = async () => {
    if (!generatedMessage || !profile) return;

    setIsSending(true);
    try {
      // Send the message
      await sendMessage(leadId, generatedMessage, profile, true);

      // Update lead with AI settings
      const nextSendTime = new Date();
      nextSendTime.setHours(nextSendTime.getHours() + 24);

      await supabase
        .from('leads')
        .update({
          ai_opt_in: true,
          ai_stage: 'initial_contact_sent',
          ai_messages_sent: 1,
          next_ai_send_at: nextSendTime.toISOString(),
        })
        .eq('id', leadId);

      toast({
        title: "Message sent successfully!",
        description: `Next AI message scheduled for ${nextSendTime.toLocaleDateString()} at ${nextSendTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      });

      setShowPreview(false);
      setGeneratedMessage(null);
      onMessageSent?.();
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const cancel = () => {
    setShowPreview(false);
    setGeneratedMessage(null);
  };

  return {
    isGenerating,
    generatedMessage,
    showPreview,
    isSending,
    generatePreview,
    sendNow,
    cancel
  };
};
