
import { useState, useCallback } from 'react';
import { generateIntelligentAIMessage } from '@/services/intelligentAIMessageService';
import { sendMessage } from '@/services/messagesService';
import { useAuth } from '@/components/auth/AuthProvider';
import { toast } from '@/hooks/use-toast';

interface UseAIMessagePreviewProps {
  leadId: string;
  onMessageSent?: () => void;
}

export const useAIMessagePreview = ({ leadId, onMessageSent }: UseAIMessagePreviewProps) => {
  const { user } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedMessage, setGeneratedMessage] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const generatePreview = useCallback(async () => {
    if (!user || isGenerating) return;

    setIsGenerating(true);
    setShowPreview(true);
    
    try {
      const message = await generateIntelligentAIMessage({
        leadId,
        stage: 'follow_up',
        context: {}
      });

      if (message) {
        setGeneratedMessage(message);
      } else {
        throw new Error('Failed to generate message');
      }
    } catch (error) {
      console.error('Error generating AI message preview:', error);
      toast({
        title: "Error",
        description: "Failed to generate AI message preview",
        variant: "destructive"
      });
      setShowPreview(false);
    } finally {
      setIsGenerating(false);
    }
  }, [leadId, user, isGenerating]);

  const sendNow = useCallback(async () => {
    if (!user || !generatedMessage || isSending) return;

    setIsSending(true);
    try {
      await sendMessage(leadId, generatedMessage, user, true);
      
      toast({
        title: "Message Sent",
        description: "AI message sent successfully",
        variant: "default"
      });

      setShowPreview(false);
      setGeneratedMessage('');
      onMessageSent?.();
    } catch (error) {
      console.error('Error sending AI message:', error);
      toast({
        title: "Error",
        description: "Failed to send AI message",
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
    }
  }, [leadId, generatedMessage, user, isSending, onMessageSent]);

  const cancel = useCallback(() => {
    setShowPreview(false);
    setGeneratedMessage('');
    setIsGenerating(false);
  }, []);

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
