
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { sendMessage as fixedSendMessage } from '@/services/fixedMessagesService';
import { useAuth } from '@/components/auth/AuthProvider';
import { toast } from '@/hooks/use-toast';

export const useAIMessagePreview = ({ leadId, onMessageSent }: { leadId?: string; onMessageSent?: () => void } = {}) => {
  const { profile } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [previewMessage, setPreviewMessage] = useState('');
  const [generatedMessage, setGeneratedMessage] = useState('');
  const [leadData, setLeadData] = useState<any>(null);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Multi-step workflow states
  const [showDecisionStep, setShowDecisionStep] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [originalDataQuality, setOriginalDataQuality] = useState<any>(null);
  const [nameDecision, setNameDecision] = useState<'approved' | 'denied' | ''>('');
  const [vehicleDecision, setVehicleDecision] = useState<'approved' | 'denied' | ''>('');

  // Timeout refs for cleanup
  const analysisTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const generationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Generate AI message preview
  const generatePreview = async (targetLeadId?: string) => {
    const useLeadId = targetLeadId || leadId;
    if (!useLeadId || !profile) {
      console.error('No lead ID or profile available for AI message generation');
      setError('Missing lead ID or profile');
      return;
    }

    setIsGenerating(true);
    setError(null);
    
    // Set timeout for generation
    generationTimeoutRef.current = setTimeout(() => {
      console.log('🚨 Message generation timeout');
      setIsGenerating(false);
      setError('Message generation timed out. Please try again.');
      toast({
        title: "Timeout",
        description: "Message generation took too long. Please try again.",
        variant: "destructive"
      });
    }, 15000);

    try {
      console.log(`🤖 [AI PREVIEW] Generating message for lead: ${useLeadId}`);
      
      // Get lead data
      const { data: lead, error: leadError } = await supabase
        .from('leads')
        .select('*')
        .eq('id', useLeadId)
        .single();

      if (leadError || !lead) {
        throw new Error('Lead not found');
      }

      setLeadData(lead);

      // Check if lead has had conversation
      const { data: conversations, error: conversationError } = await supabase
        .from('conversations')
        .select('id')
        .eq('lead_id', useLeadId)
        .limit(1);

      if (conversationError) {
        console.error('Error checking conversations:', conversationError);
      }

      const hasConversation = conversations && conversations.length > 0;

      // Generate AI message based on lead data and conversation history
      const { data: aiResult, error: aiError } = await supabase.functions.invoke('ai-automation', {
        body: {
          action: 'generate_message_preview',
          leadId: useLeadId,
          leadData: lead,
          hasConversation: hasConversation,
          salespersonProfile: profile
        }
      });

      if (aiError || !aiResult?.success) {
        throw new Error(aiResult?.error || 'Failed to generate AI message');
      }

      const message = aiResult.message || 'Hi! I wanted to follow up on your interest in our vehicles. How can I help you today?';
      setPreviewMessage(message);
      setGeneratedMessage(message);
      setShowPreview(true);
      
      console.log(`✅ [AI PREVIEW] Generated message for lead: ${useLeadId}`);
      
    } catch (error) {
      console.error('❌ [AI PREVIEW] Error generating message:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate message');
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate AI message",
        variant: "destructive"
      });
      
      // Set fallback message
      const fallbackMessage = 'Hi! I wanted to follow up on your interest in our vehicles. How can I help you today?';
      setPreviewMessage(fallbackMessage);
      setGeneratedMessage(fallbackMessage);
      setShowPreview(true);
    } finally {
      setIsGenerating(false);
      if (generationTimeoutRef.current) {
        clearTimeout(generationTimeoutRef.current);
        generationTimeoutRef.current = null;
      }
    }
  };

  // Send the AI generated message
  const sendNow = async (targetLeadId?: string, messageOverride?: string) => {
    const useLeadId = targetLeadId || leadId;
    const messageToSend = messageOverride || generatedMessage || previewMessage;
    
    if (!useLeadId) {
      toast({
        title: "Error",
        description: "No lead ID provided",
        variant: "destructive"
      });
      return;
    }
    
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
    setError(null);
    
    try {
      console.log(`📤 [AI PREVIEW] Sending AI message to lead: ${useLeadId}`);
      
      // Use the working fixed message service
      await fixedSendMessage(useLeadId, messageToSend.trim(), profile, true);
      
      toast({
        title: "Message Sent",
        description: "AI message sent successfully",
      });
      
      // Clear the preview after sending
      reset();
      
      // Call the callback if provided
      if (onMessageSent) {
        onMessageSent();
      }
      
      console.log(`✅ [AI PREVIEW] Message sent successfully to lead: ${useLeadId}`);
      
    } catch (error) {
      console.error('❌ [AI PREVIEW] Error sending message:', error);
      setError(error instanceof Error ? error.message : 'Failed to send message');
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send message",
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
    }
  };

  // Multi-step workflow methods
  const startAnalysis = async () => {
    if (!leadId) {
      setError('No lead ID provided');
      return;
    }
    
    setIsAnalyzing(true);
    setError(null);
    
    // Set timeout for analysis
    analysisTimeoutRef.current = setTimeout(() => {
      console.log('🚨 Analysis timeout');
      setIsAnalyzing(false);
      setError('Analysis timed out. Please try again.');
      toast({
        title: "Timeout",
        description: "Analysis took too long. Please try again.",
        variant: "destructive"
      });
    }, 10000);
    
    try {
      console.log(`🔍 [AI PREVIEW] Starting analysis for lead: ${leadId}`);
      
      // Fetch real lead data
      const { data: lead, error: leadError } = await supabase
        .from('leads')
        .select('*')
        .eq('id', leadId)
        .single();

      if (leadError || !lead) {
        throw new Error('Lead not found');
      }

      setLeadData(lead);

      // Simulate analysis with actual data
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Create validation results based on actual data
      const nameValidation = {
        isValid: Boolean(lead.first_name && lead.first_name.length > 1),
        confidence: 0.9,
        detectedType: lead.first_name ? 'Personal Name' : 'Unknown',
        isValidPersonalName: Boolean(lead.first_name && lead.first_name.length > 1)
      };

      const vehicleValidation = {
        isValid: Boolean(lead.vehicle_interest && lead.vehicle_interest.length > 2),
        confidence: 0.8,
        detectedIssue: lead.vehicle_interest ? 'None' : 'No vehicle interest specified',
        isValidVehicleInterest: Boolean(lead.vehicle_interest && lead.vehicle_interest.length > 2)
      };
      
      setOriginalDataQuality({
        nameValidation,
        vehicleValidation
      });
      
      setShowDecisionStep(true);
      console.log(`✅ [AI PREVIEW] Analysis completed for lead: ${leadId}`);
      
    } catch (error) {
      console.error('❌ [AI PREVIEW] Analysis error:', error);
      setError(error instanceof Error ? error.message : 'Analysis failed. Please try again.');
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Analysis failed",
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
      if (analysisTimeoutRef.current) {
        clearTimeout(analysisTimeoutRef.current);
        analysisTimeoutRef.current = null;
      }
    }
  };

  const handleNameDecision = (decision: 'approved' | 'denied') => {
    console.log(`👤 [AI PREVIEW] Name decision: ${decision}`);
    setNameDecision(decision);
  };

  const handleVehicleDecision = (decision: 'approved' | 'denied') => {
    console.log(`🚗 [AI PREVIEW] Vehicle decision: ${decision}`);
    setVehicleDecision(decision);
  };

  const generateWithDecisions = async () => {
    console.log(`🎯 [AI PREVIEW] Generating with decisions - Name: ${nameDecision}, Vehicle: ${vehicleDecision}`);
    setShowDecisionStep(false);
    await generatePreview();
  };

  // Update message preview
  const updatePreview = (newMessage: string) => {
    setPreviewMessage(newMessage);
    setGeneratedMessage(newMessage);
  };

  // Clear preview and reset state
  const reset = () => {
    console.log('🔄 [AI PREVIEW] Resetting all state');
    
    // Clear timeouts
    if (analysisTimeoutRef.current) {
      clearTimeout(analysisTimeoutRef.current);
      analysisTimeoutRef.current = null;
    }
    if (generationTimeoutRef.current) {
      clearTimeout(generationTimeoutRef.current);
      generationTimeoutRef.current = null;
    }
    
    // Reset all state
    setPreviewMessage('');
    setGeneratedMessage('');
    setLeadData(null);
    setShowDecisionStep(false);
    setShowPreview(false);
    setOriginalDataQuality(null);
    setNameDecision('');
    setVehicleDecision('');
    setError(null);
    setIsAnalyzing(false);
    setIsGenerating(false);
    setIsSending(false);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (analysisTimeoutRef.current) {
        clearTimeout(analysisTimeoutRef.current);
      }
      if (generationTimeoutRef.current) {
        clearTimeout(generationTimeoutRef.current);
      }
    };
  }, []);

  // Alias for backward compatibility
  const clearPreview = reset;
  const cancel = reset;

  return {
    // Basic states
    isGenerating,
    isAnalyzing,
    previewMessage,
    generatedMessage,
    leadData,
    isSending,
    error,
    
    // Multi-step workflow states
    showDecisionStep,
    showPreview,
    originalDataQuality,
    nameDecision,
    vehicleDecision,
    
    // Methods
    generatePreview,
    sendNow,
    updatePreview,
    clearPreview,
    reset,
    cancel,
    
    // Multi-step workflow methods
    startAnalysis,
    handleNameDecision,
    handleVehicleDecision,
    generateWithDecisions
  };
};
