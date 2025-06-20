
import { useState } from 'react';
import { generateWarmInitialMessage } from '@/services/proactive/warmIntroductionService';
import { sendMessage } from '@/services/messagesService';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/components/auth/AuthProvider';
import { assessLeadDataQuality } from '@/services/unifiedDataQualityService';

interface UseAIMessagePreviewProps {
  leadId: string;
  onMessageSent?: () => void;
}

interface DataQualityOverrides {
  nameApproved?: boolean;
  vehicleApproved?: boolean;
}

export const useAIMessagePreview = ({ leadId, onMessageSent }: UseAIMessagePreviewProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedMessage, setGeneratedMessage] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [overrides, setOverrides] = useState<DataQualityOverrides>({});
  const { profile } = useAuth();

  const applyOverridesToDataQuality = (originalDataQuality: any, overrides: DataQualityOverrides) => {
    if (!overrides.nameApproved && !overrides.vehicleApproved) {
      return originalDataQuality;
    }

    const updatedDataQuality = { ...originalDataQuality };

    // Apply name override
    if (overrides.nameApproved) {
      updatedDataQuality.nameValidation = {
        ...updatedDataQuality.nameValidation,
        isValidPersonalName: true,
        confidence: 1.0,
        detectedType: 'personal',
        userOverride: true
      };
      updatedDataQuality.recommendations.usePersonalGreeting = true;
    }

    // Apply vehicle override
    if (overrides.vehicleApproved) {
      updatedDataQuality.vehicleValidation = {
        ...updatedDataQuality.vehicleValidation,
        isValidVehicleInterest: true,
        confidence: 1.0,
        detectedIssue: 'valid',
        userOverride: true
      };
      updatedDataQuality.recommendations.useSpecificVehicle = true;
    }

    // Recalculate overall strategy
    const usePersonalGreeting = updatedDataQuality.recommendations.usePersonalGreeting;
    const useSpecificVehicle = updatedDataQuality.recommendations.useSpecificVehicle;

    if (usePersonalGreeting && useSpecificVehicle) {
      updatedDataQuality.messageStrategy = 'personal_with_vehicle';
    } else if (usePersonalGreeting && !useSpecificVehicle) {
      updatedDataQuality.messageStrategy = 'personal_generic_vehicle';
    } else if (!usePersonalGreeting && useSpecificVehicle) {
      updatedDataQuality.messageStrategy = 'generic_with_vehicle';
    } else {
      updatedDataQuality.messageStrategy = 'fully_generic';
    }

    // Recalculate overall quality score
    const nameWeight = 0.6;
    const vehicleWeight = 0.4;
    updatedDataQuality.overallQualityScore = 
      (updatedDataQuality.nameValidation.confidence * nameWeight) + 
      (updatedDataQuality.vehicleValidation.confidence * vehicleWeight);

    return updatedDataQuality;
  };

  const generatePreview = async (useOverrides = false) => {
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

      // Get original data quality assessment
      const originalDataQuality = assessLeadDataQuality(lead.first_name, lead.vehicle_interest);
      
      // Apply user overrides if requested
      const finalDataQuality = useOverrides 
        ? applyOverridesToDataQuality(originalDataQuality, overrides)
        : originalDataQuality;

      console.log('🧠 [AI PREVIEW] Data quality results (with overrides):', {
        overallScore: finalDataQuality.overallQualityScore,
        messageStrategy: finalDataQuality.messageStrategy,
        nameValid: finalDataQuality.nameValidation.isValidPersonalName,
        vehicleValid: finalDataQuality.vehicleValidation.isValidVehicleInterest,
        overrides: overrides,
        useOverrides: useOverrides
      });

      // Store comprehensive debug info for UI display
      setDebugInfo({
        originalDataQuality,
        finalDataQuality,
        overrides,
        originalFirstName: lead.first_name,
        originalLastName: lead.last_name,
        originalVehicleInterest: lead.vehicle_interest
      });

      // Generate preview message with data quality override if overrides are applied
      const dataQualityParam = useOverrides ? finalDataQuality : undefined;
      const message = await generateWarmInitialMessage(lead, profile, dataQualityParam);
      
      if (message) {
        setGeneratedMessage(message);
        setShowPreview(true);
        
        // Show success message with comprehensive debug info
        toast({
          title: "Message Generated",
          description: `Data Quality: ${Math.round(finalDataQuality.overallQualityScore * 100)}% | Strategy: ${finalDataQuality.messageStrategy}`,
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

  const handleNameOverride = () => {
    const newOverrides = { ...overrides, nameApproved: !overrides.nameApproved };
    setOverrides(newOverrides);
    
    toast({
      title: overrides.nameApproved ? "Name Override Removed" : "Name Approved",
      description: overrides.nameApproved 
        ? "Name will be analyzed automatically again" 
        : "Name will be treated as a personal name",
    });
  };

  const handleVehicleOverride = () => {
    const newOverrides = { ...overrides, vehicleApproved: !overrides.vehicleApproved };
    setOverrides(newOverrides);
    
    toast({
      title: overrides.vehicleApproved ? "Vehicle Override Removed" : "Vehicle Approved",
      description: overrides.vehicleApproved 
        ? "Vehicle interest will be analyzed automatically again" 
        : "Vehicle interest will be treated as valid",
    });
  };

  const regenerateWithOverrides = () => {
    generatePreview(true);
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
      setOverrides({});
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
    setOverrides({});
  };

  return {
    isGenerating,
    generatedMessage,
    showPreview,
    isSending,
    debugInfo,
    overrides,
    generatePreview,
    sendNow,
    cancel,
    handleNameOverride,
    handleVehicleOverride,
    regenerateWithOverrides
  };
};
