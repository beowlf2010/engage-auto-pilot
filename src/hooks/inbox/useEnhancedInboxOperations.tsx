
import { useCallback } from 'react';
import { useSearchParams } from "react-router-dom";
import { assignCurrentUserToLead } from "@/services/conversationsService";
import { findMatchingInventory } from "@/services/inventory/inventoryMatching";
import { processConversationForAI } from "@/services/conversationAnalysis";
import { toast } from "@/hooks/use-toast";
import type { ConversationListItem } from '@/hooks/conversation/conversationTypes';

interface UseEnhancedInboxOperationsProps {
  user: {
    role: string;
    id: string;
  };
  loadMessages: (leadId: string) => Promise<void>;
  sendMessage: (leadId: string, message: string) => Promise<void>;
  sendingMessage: boolean;
  setError: (error: string | null) => void;
}

export const useEnhancedInboxOperations = ({
  user,
  loadMessages,
  sendMessage,
  sendingMessage,
  setError
}: UseEnhancedInboxOperationsProps) => {
  const [searchParams] = useSearchParams();

  const canReply = useCallback((conv: any) => {
    // Managers and admins can reply to any conversation
    if (user.role === "manager" || user.role === "admin") return true;
    
    // Sales users can reply to their own leads or unassigned leads
    return conv.salespersonId === user.id || !conv.salespersonId;
  }, [user.role, user.id]);

  const analyzeConversationForInventory = useCallback(async (
    leadId: string,
    conversationHistory: string,
    latestMessage: string
  ) => {
    try {
      console.log('🔍 Analyzing conversation for inventory needs...');
      
      // Process conversation with AI analysis
      const analysis = processConversationForAI(conversationHistory, latestMessage, leadId);
      
      // Check for matching inventory
      const inventory = await findMatchingInventory(leadId);
      
      console.log('📊 Conversation analysis results:', {
        vehicleInterest: analysis.vehicleInterest.primaryVehicle,
        leadTemperature: analysis.leadTemperature,
        inventoryMatches: inventory.length
      });

      // Generate smart recommendations based on analysis
      const recommendations = generateInventoryRecommendations(analysis, inventory);
      
      return {
        analysis,
        inventory,
        recommendations
      };
    } catch (error) {
      console.error('❌ Error analyzing conversation for inventory:', error);
      return null;
    }
  }, []);

  const handleEnhancedSelectConversation = useCallback(async (leadId: string) => {
    try {
      console.log('📱 [ENHANCED INBOX] Selecting conversation with AI analysis for lead:', leadId);
      setError(null);
      
      // Load messages first
      await loadMessages(leadId);
      
      console.log('✅ [ENHANCED INBOX] Conversation selected and messages loaded');
    } catch (err) {
      console.error('Error selecting conversation:', err);
      toast({
        title: "Error",
        description: "Failed to load messages for this conversation.",
        variant: "destructive"
      });
    }
  }, [loadMessages, setError]);

  const handleSmartSendMessage = useCallback(async (
    selectedLead: string | null,
    selectedConversation: ConversationListItem | undefined,
    message: string,
    isTemplate?: boolean
  ) => {
    if (selectedLead && selectedConversation) {
      try {
        console.log('📤 [ENHANCED INBOX] Sending smart message:', message);
        
        // Prevent multiple sends
        if (sendingMessage) {
          console.log('⏳ [ENHANCED INBOX] Already sending, ignoring request');
          return;
        }
        
        // Auto-assign lead if needed
        if (!selectedConversation.salespersonId && canReply(selectedConversation)) {
          console.log(`🎯 [ENHANCED INBOX] Auto-assigning lead ${selectedLead} to user ${user.id}`);
          
          const assigned = await assignCurrentUserToLead(selectedLead, user.id);
          if (assigned) {
            toast({
              title: "Lead Assigned",
              description: "This lead has been assigned to you",
            });
            selectedConversation.salespersonId = user.id;
          }
        }
        
        // Send message
        await sendMessage(selectedLead, message);
        
        // Show success message with AI enhancement note
        toast({
          title: "Smart message sent",
          description: "Your message has been sent and conversation analyzed for insights.",
        });
        
        console.log('✅ [ENHANCED INBOX] Smart message sent successfully');
        
      } catch (err) {
        console.error('❌ [ENHANCED INBOX] Error sending smart message:', err);
        toast({
          title: "Error",
          description: err instanceof Error ? err.message : "Failed to send message. Please try again.",
          variant: "destructive"
        });
      }
    }
  }, [canReply, sendMessage, sendingMessage, user.id]);

  const getLeadIdFromUrl = useCallback(() => {
    return searchParams.get('leadId');
  }, [searchParams]);

  return {
    canReply,
    handleSelectConversation: handleEnhancedSelectConversation,
    handleSendMessage: handleSmartSendMessage,
    analyzeConversationForInventory,
    getLeadIdFromUrl
  };
};

// Helper function to generate inventory recommendations
const generateInventoryRecommendations = (analysis: any, inventory: any[]) => {
  const recommendations = [];
  
  // Check if mentioned vehicle is in inventory
  if (analysis.vehicleInterest.primaryVehicle && analysis.vehicleInterest.primaryVehicle !== 'unknown') {
    const vehicleName = analysis.vehicleInterest.primaryVehicle.toLowerCase();
    const exactMatches = inventory.filter(item => 
      item.make?.toLowerCase().includes(vehicleName.split(' ')[0]) ||
      item.model?.toLowerCase().includes(vehicleName.split(' ').slice(1).join(' '))
    );

    if (exactMatches.length > 0) {
      recommendations.push({
        type: 'exact_match',
        message: `Great news! We have ${exactMatches.length} ${analysis.vehicleInterest.primaryVehicle}(s) in stock.`,
        vehicles: exactMatches.slice(0, 3)
      });
    } else {
      recommendations.push({
        type: 'no_exact_match',
        message: `I don't see that exact ${analysis.vehicleInterest.primaryVehicle} in our current inventory, but I can show you similar options.`,
        vehicles: []
      });
    }
  }

  // High temperature leads get priority treatment
  if (analysis.leadTemperature > 70) {
    recommendations.push({
      type: 'high_priority',
      message: 'This customer is showing strong buying signals. Consider immediate follow-up.',
      vehicles: []
    });
  }

  return recommendations;
};
