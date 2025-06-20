
import { useState } from 'react';
import { generateWarmInitialMessage } from '@/services/proactive/warmIntroductionService';
import { sendMessage } from '@/services/messagesService';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/components/auth/AuthProvider';
import { validatePersonalName, detectLeadSource } from '@/services/nameValidationService';

interface UseAIMessagePreviewProps {
  leadId: string;
  onMessageSent?: () => void;
}

export const useAIMessagePreview = ({ leadId, onMessageSent }: UseAIMessagePreviewProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedMessage, setGeneratedMessage] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);
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

      console.log('🔍 [AI PREVIEW] Lead data:', {
        firstName: lead.first_name,
        lastName: lead.last_name,
        vehicleInterest: lead.vehicle_interest
      });

      // Perform name validation for debugging
      const nameValidation = validatePersonalName(lead.first_name);
      const leadSource = detectLeadSource(lead);
      
      console.log('🧠 [AI PREVIEW] Smart validation results:', {
        nameValidation,
        leadSource
      });

      // Store debug info for UI display
      setDebugInfo({
        nameValidation,
        leadSource,
        originalFirstName: lead.first_name,
        originalLastName: lead.last_name
      });

      // Generate preview message with enhanced logic
      const message = await generateWarmInitialMessage(lead, profile);
      
      if (message) {
        setGeneratedMessage(message);
        setShowPreview(true);
        
        // Show success message with debug info
        toast({
          title: "Message Generated",
          description: `Name validation: ${nameValidation.detectedType} (${(nameValidation.confidence * 100).toFixed(0)}% confidence)`,
        });
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

      // Update lead with AI settings - Fixed date calculation using milliseconds
      const nextSendTime = new Date();
      nextSendTime.setTime(nextSendTime.getTime() + (24 * 60 * 60 * 1000));

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
      setDebugInfo(null);
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
    setDebugInfo(null);
  };

  return {
    isGenerating,
    generatedMessage,
    showPreview,
    isSending,
    debugInfo,
    generatePreview,
    sendNow,
    cancel
  };
};
