
import { processConversationForAI, ConversationAnalysis } from './conversationAnalysis';
import { generateEnhancedIntelligentResponse } from './intelligentConversationAI';
import { getInventoryForAIMessaging } from './inventory/inventoryQueries';

export interface EnhancedAIResponse {
  message: string;
  confidence: number;
  reasoning: string;
  analysis: ConversationAnalysis;
  suggestedActions: string[];
  followUpScheduled: boolean;
}

export const generateEnhancedAIResponse = async (
  leadId: string,
  conversationHistory: string,
  latestMessage: string,
  leadName: string,
  vehicleInterest: string
): Promise<EnhancedAIResponse | null> => {
  try {
    console.log('🤖 Generating enhanced AI response for lead:', leadId);

    // Process conversation for insights
    const analysis = processConversationForAI(conversationHistory, latestMessage, leadId);
    console.log('📊 Conversation analysis:', analysis);

    // Get relevant inventory
    const inventory = await getInventoryForAIMessaging(leadId);
    console.log('🚗 Available inventory:', inventory.length);

    // Generate base AI response
    const baseResponse = await generateEnhancedIntelligentResponse({
      leadId,
      leadName,
      vehicleInterest: analysis.vehicleInterest.primaryVehicle || vehicleInterest,
      messages: parseConversationHistory(conversationHistory),
      leadInfo: { phone: '', status: 'active' }
    });

    if (!baseResponse) {
      console.log('❌ Failed to generate base AI response');
      return null;
    }

    // Enhance the response based on analysis
    const enhancedMessage = enhanceMessageWithAnalysis(
      baseResponse.message,
      analysis,
      inventory
    );

    // Generate suggested actions
    const suggestedActions = generateActionRecommendations(analysis, inventory);

    // Determine if follow-up should be scheduled
    const followUpScheduled = shouldScheduleFollowUp(analysis);

    return {
      message: enhancedMessage,
      confidence: Math.min(baseResponse.confidence + (analysis.leadTemperature / 100 * 0.2), 0.95),
      reasoning: `Enhanced response: ${analysis.responseStrategy.primaryStrategy} - Lead temp: ${analysis.leadTemperature}`,
      analysis,
      suggestedActions,
      followUpScheduled
    };

  } catch (error) {
    console.error('❌ Error generating enhanced AI response:', error);
    return null;
  }
};

const parseConversationHistory = (history: string) => {
  // Simple parsing - in production, this would be more sophisticated
  const lines = history.split('\n').filter(line => line.trim());
  return lines.map((line, index) => ({
    id: `msg_${index}`,
    body: line,
    direction: line.toLowerCase().includes('customer:') ? 'in' as const : 'out' as const,
    sentAt: new Date().toISOString(),
    aiGenerated: line.toLowerCase().includes('finn')
  }));
};

const enhanceMessageWithAnalysis = (
  baseMessage: string,
  analysis: ConversationAnalysis,
  inventory: any[]
): string => {
  let enhancedMessage = baseMessage;

  // Add discovery questions if appropriate
  if (analysis.conversationStage === 'discovery' && analysis.discoveryQuestions.length > 0) {
    const topQuestion = analysis.discoveryQuestions[0];
    enhancedMessage += ` ${topQuestion.question}`;
  }

  // Add urgency if high-intent signals detected
  if (analysis.buyingSignals.some(s => s.urgencyLevel === 'immediate')) {
    enhancedMessage += " I'd love to help you move forward quickly - when would be a good time to take a look at this in person?";
  }

  // Add inventory-specific information
  if (inventory.length > 0 && analysis.vehicleInterest.confidence > 0.7) {
    const matchingVehicles = inventory.filter(v => 
      v.make?.toLowerCase().includes(analysis.vehicleInterest.primaryVehicle.toLowerCase()) ||
      v.model?.toLowerCase().includes(analysis.vehicleInterest.primaryVehicle.toLowerCase())
    );

    if (matchingVehicles.length > 0) {
      enhancedMessage += ` We actually have ${matchingVehicles.length} similar vehicle${matchingVehicles.length > 1 ? 's' : ''} in stock that might interest you.`;
    }
  }

  return enhancedMessage;
};

const generateActionRecommendations = (
  analysis: ConversationAnalysis,
  inventory: any[]
): string[] => {
  const actions: string[] = [...analysis.nextBestActions];

  // Add inventory-specific actions
  if (inventory.length === 0) {
    actions.push('Search for similar vehicles');
    actions.push('Set up vehicle alert');
  } else {
    actions.push('Send vehicle photos and details');
  }

  // Add stage-specific actions
  switch (analysis.conversationStage) {
    case 'closing':
      actions.push('Prepare purchase documentation');
      actions.push('Contact finance manager');
      break;
    case 'objection_handling':
      actions.push('Prepare objection responses');
      actions.push('Research competitor comparisons');
      break;
    case 'follow_up':
      actions.push('Schedule follow-up reminder');
      actions.push('Send additional information');
      break;
  }

  return [...new Set(actions)].slice(0, 5); // Remove duplicates and limit
};

const shouldScheduleFollowUp = (analysis: ConversationAnalysis): boolean => {
  // Schedule follow-up for high-temperature leads
  if (analysis.leadTemperature > 70) {
    return true;
  }

  // Schedule for ready-to-buy signals
  if (analysis.buyingSignals.some(s => s.type === 'ready_to_buy')) {
    return true;
  }

  // Schedule for objection handling
  if (analysis.buyingSignals.some(s => s.type === 'objection')) {
    return true;
  }

  return false;
};
