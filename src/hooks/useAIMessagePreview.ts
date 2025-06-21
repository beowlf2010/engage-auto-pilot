
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { sendMessage as fixedSendMessage } from '@/services/fixedMessagesService';
import { useAuth } from '@/components/auth/AuthProvider';
import { toast } from '@/hooks/use-toast';

export const useAIMessagePreview = () => {
  const { profile } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewMessage, setPreviewMessage] = useState('');
  const [leadData, setLeadData] = useState<any>(null);
  const [isSending, setIsSending] = useState(false);

  // Generate AI message preview
  const generatePreview = async (leadId: string) => {
    if (!profile) {
      console.error('No profile available for AI message generation');
      return;
    }

    setIsGenerating(true);
    try {
      console.log(`🤖 [AI PREVIEW] Generating message for lead: ${leadId}`);
      
      // Get lead data
      const { data: lead, error: leadError } = await supabase
        .from('leads')
        .select('*')
        .eq('id', leadId)
        .single();

      if (leadError || !lead) {
        throw new Error('Lead not found');
      }

      setLeadData(lead);

      // Check if lead has had conversation
      const { data: conversations, error: conversationError } = await supabase
        .from('conversations')
        .select('id')
        .eq('lead_id', leadId)
        .limit(1);

      if (conversationError) {
        console.error('Error checking conversations:', conversationError);
      }

      const hasConversation = conversations && conversations.length > 0;

      // Generate AI message based on lead data and conversation history
      const { data: aiResult, error: aiError } = await supabase.functions.invoke('ai-automation', {
        body: {
          action: 'generate_message_preview',
          leadId: leadId,
          leadData: lead,
          hasConversation: hasConversation,
          salespersonProfile: profile
        }
      });

      if (aiError || !aiResult?.success) {
        throw new Error(aiResult?.error || 'Failed to generate AI message');
      }

      setPreviewMessage(aiResult.message || 'Hi! I wanted to follow up on your interest in our vehicles. How can I help you today?');
      
      console.log(`✅ [AI PREVIEW] Generated message for lead: ${leadId}`);
      
    } catch (error) {
      console.error('❌ [AI PREVIEW] Error generating message:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate AI message",
        variant: "destructive"
      });
      
      // Set fallback message
      setPreviewMessage('Hi! I wanted to follow up on your interest in our vehicles. How can I help you today?');
    } finally {
      setIsGenerating(false);
    }
  };

  // Send the AI generated message
  const sendNow = async (leadId: string, messageOverride?: string) => {
    const messageToSend = messageOverride || previewMessage;
    
    if (!messageToSend.trim()) {
      toast({
        title: "Error",
        description: "No message to send",
        variant: "destructive"
      });
      return;
    }

    if (!profile) {
      toast({
        title: "Error", 
        description: "User profile not available",
        variant: "destructive"
      });
      return;
    }

    setIsSending(true);
    try {
      console.log(`📤 [AI PREVIEW] Sending AI message to lead: ${leadId}`);
      
      // Use the working fixed message service
      await fixedSendMessage(leadId, messageToSend.trim(), profile, true);
      
      toast({
        title: "Message Sent",
        description: "AI message sent successfully",
      });
      
      // Clear the preview after sending
      setPreviewMessage('');
      
      console.log(`✅ [AI PREVIEW] Message sent successfully to lead: ${leadId}`);
      
    } catch (error) {
      console.error('❌ [AI PREVIEW] Error sending message:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send message",
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
    }
  };

  // Update message preview
  const updatePreview = (newMessage: string) => {
    setPreviewMessage(newMessage);
  };

  // Clear preview
  const clearPreview = () => {
    setPreviewMessage('');
    setLeadData(null);
  };

  return {
    isGenerating,
    previewMessage,
    leadData,
    isSending,
    generatePreview,
    sendNow,
    updatePreview,
    clearPreview
  };
};
