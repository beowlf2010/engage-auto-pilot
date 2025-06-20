
import { useState } from 'react';
import { generateWarmInitialMessage } from '@/services/proactive/warmIntroductionService';
import { sendMessage } from '@/services/messagesService';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/components/auth/AuthProvider';
import { assessLeadDataQuality } from '@/services/unifiedDataQualityService';
import { saveNameValidationDecision, saveVehicleValidationDecision } from '@/services/nameValidationLearningService';

interface UseAIMessagePreviewProps {
  leadId: string;
  onMessageSent?: () => void;
}

export const useAIMessagePreview = ({ leadId, onMessageSent }: UseAIMessagePreviewProps) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedMessage, setGeneratedMessage] = useState<string | null>(null);
  const [showDecisionStep, setShowDecisionStep] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [isSending, setIsSending] = useState(false);
  
  // Validation data
  const [originalDataQuality, setOriginalDataQuality] = useState<any>(null);
  const [leadData, setLeadData] = useState<any>(null);
  
  // User decisions
  const [nameDecision, setNameDecision] = useState<'approved' | 'denied' | null>(null);
  const [vehicleDecision, setVehicleDecision] = useState<'approved' | 'denied' | null>(null);
  
  const { profile } = useAuth();

  const startAnalysis = async () => {
    if (!profile) {
      toast({
        title: "Error",
        description: "User profile not loaded",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
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

      setLeadData(lead);

      // Get original data quality assessment
      const dataQuality = await assessLeadDataQuality(lead.first_name, lead.vehicle_interest);
      setOriginalDataQuality(dataQuality);

      console.log('🔍 [AI PREVIEW] Lead analysis complete:', {
        firstName: lead.first_name,
        vehicleInterest: lead.vehicle_interest,
        nameValid: dataQuality.nameValidation.isValidPersonalName,
        vehicleValid: dataQuality.vehicleValidation.isValidVehicleInterest
      });

      setShowDecisionStep(true);
      
      toast({
        title: "Analysis Complete",
        description: "Please review and approve the name and vehicle data",
      });
    } catch (error) {
      console.error('Error analyzing lead:', error);
      toast({
        title: "Error",
        description: "Failed to analyze lead data",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleNameDecision = (decision: 'approved' | 'denied') => {
    setNameDecision(decision);
    toast({
      title: decision === 'approved' ? "Name Approved" : "Name Denied",
      description: `"${leadData?.first_name}" will be ${decision === 'approved' ? 'treated as a personal name' : 'handled generically'}`,
    });
  };

  const handleVehicleDecision = (decision: 'approved' | 'denied') => {
    setVehicleDecision(decision);
    toast({
      title: decision === 'approved' ? "Vehicle Approved" : "Vehicle Denied",
      description: `Vehicle interest will be ${decision === 'approved' ? 'used specifically' : 'handled generically'}`,
    });
  };

  const generateWithDecisions = async () => {
    if (!nameDecision || !vehicleDecision || !originalDataQuality || !leadData || !profile) {
      return;
    }

    setIsGenerating(true);
    try {
      // Save decisions to database
      await saveNameValidationDecision(
        leadData.first_name,
        originalDataQuality.nameValidation,
        nameDecision,
        `User decision during AI message generation`,
        profile.id
      );

      await saveVehicleValidationDecision(
        leadData.vehicle_interest || 'Not specified',
        originalDataQuality.vehicleValidation,
        vehicleDecision,
        `User decision during AI message generation`,
        profile.id
      );

      // Create override data quality with user decisions
      const overrideDataQuality = {
        ...originalDataQuality,
        nameValidation: {
          ...originalDataQuality.nameValidation,
          isValidPersonalName: nameDecision === 'approved',
          confidence: nameDecision === 'approved' ? 1.0 : 0.0,
          userOverride: true
        },
        vehicleValidation: {
          ...originalDataQuality.vehicleValidation,
          isValidVehicleInterest: vehicleDecision === 'approved',
          confidence: vehicleDecision === 'approved' ? 1.0 : 0.0,
          userOverride: true
        }
      };

      // Recalculate strategy
      const usePersonalGreeting = nameDecision === 'approved';
      const useSpecificVehicle = vehicleDecision === 'approved';

      if (usePersonalGreeting && useSpecificVehicle) {
        overrideDataQuality.messageStrategy = 'personal_with_vehicle';
      } else if (usePersonalGreeting && !useSpecificVehicle) {
        overrideDataQuality.messageStrategy = 'personal_generic_vehicle';
      } else if (!usePersonalGreeting && useSpecificVehicle) {
        overrideDataQuality.messageStrategy = 'generic_with_vehicle';
      } else {
        overrideDataQuality.messageStrategy = 'fully_generic';
      }

      overrideDataQuality.recommendations = {
        usePersonalGreeting,
        useSpecificVehicle,
        fallbackGreeting: originalDataQuality.recommendations.fallbackGreeting,
        fallbackVehicleMessage: originalDataQuality.recommendations.fallbackVehicleMessage
      };

      // Generate message with override
      const message = await generateWarmInitialMessage(leadData, profile, overrideDataQuality);
      
      if (message) {
        setGeneratedMessage(message);
        setShowDecisionStep(false);
        setShowPreview(true);
        
        toast({
          title: "Message Generated",
          description: `Strategy: ${overrideDataQuality.messageStrategy}`,
        });
      } else {
        throw new Error('Failed to generate message');
      }
    } catch (error) {
      console.error('Error generating message with decisions:', error);
      toast({
        title: "Error",
        description: "Failed to generate message",
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
      await sendMessage(leadId, generatedMessage, profile, true);

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
        description: `Decisions saved to learning database. Next AI message scheduled for ${nextSendTime.toLocaleDateString()}`,
      });

      reset();
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

  const reset = () => {
    setShowDecisionStep(false);
    setShowPreview(false);
    setGeneratedMessage(null);
    setOriginalDataQuality(null);
    setLeadData(null);
    setNameDecision(null);
    setVehicleDecision(null);
  };

  return {
    isAnalyzing,
    isGenerating,
    generatedMessage,
    showDecisionStep,
    showPreview,
    isSending,
    originalDataQuality,
    leadData,
    nameDecision,
    vehicleDecision,
    startAnalysis,
    handleNameDecision,
    handleVehicleDecision,
    generateWithDecisions,
    sendNow,
    reset
  };
};
