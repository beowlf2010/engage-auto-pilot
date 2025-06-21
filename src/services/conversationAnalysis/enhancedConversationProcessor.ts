
import { analyzeVehicleInterest, EnhancedVehicleInterest } from './vehicleInterestDetector';
import { generateDiscoveryQuestions, DiscoveryQuestion } from './discoveryQuestionEngine';
import { detectBuyingSignals, generateResponseStrategy, BuyingSignal } from './buyingSignalDetector';

export interface ConversationAnalysis {
  vehicleInterest: EnhancedVehicleInterest;
  buyingSignals: BuyingSignal[];
  discoveryQuestions: DiscoveryQuestion[];
  responseStrategy: {
    primaryStrategy: string;
    talkingPoints: string[];
    callToAction: string;
    urgencyLevel: 'immediate' | 'high' | 'medium' | 'low';
  };
  nextBestActions: string[];
  leadTemperature: number; // 0-100 scale
  conversationStage: 'discovery' | 'presentation' | 'objection_handling' | 'closing' | 'follow_up';
}

export const processConversationForAI = (
  conversationHistory: string,
  latestMessage: string,
  leadId: string
): ConversationAnalysis => {
  console.log('🔍 Processing conversation for AI insights:', { leadId, messageLength: latestMessage.length });

  // Analyze vehicle interest
  const vehicleInterest = analyzeVehicleInterest(conversationHistory, latestMessage);
  console.log('🚗 Vehicle interest analysis:', vehicleInterest);

  // Detect buying signals
  const buyingSignals = detectBuyingSignals(conversationHistory, latestMessage);
  console.log('💡 Buying signals detected:', buyingSignals.length);

  // Generate discovery questions
  const discoveryQuestions = generateDiscoveryQuestions(vehicleInterest, conversationHistory);
  console.log('❓ Discovery questions generated:', discoveryQuestions.length);

  // Generate response strategy
  const responseStrategy = generateResponseStrategy(buyingSignals);
  console.log('📋 Response strategy:', responseStrategy.primaryStrategy);

  // Calculate lead temperature
  const leadTemperature = calculateLeadTemperature(buyingSignals, vehicleInterest, conversationHistory);

  // Determine conversation stage
  const conversationStage = determineConversationStage(buyingSignals, conversationHistory);

  // Generate next best actions
  const nextBestActions = generateNextBestActions(buyingSignals, vehicleInterest, responseStrategy);

  return {
    vehicleInterest,
    buyingSignals,
    discoveryQuestions,
    responseStrategy,
    nextBestActions,
    leadTemperature,
    conversationStage
  };
};

const calculateLeadTemperature = (
  buyingSignals: BuyingSignal[],
  vehicleInterest: EnhancedVehicleInterest,
  conversationHistory: string
): number => {
  let temperature = 50; // Base temperature

  // Boost for buying signals
  buyingSignals.forEach(signal => {
    temperature += signal.strength * 30;
  });

  // Boost for specific vehicle interest
  temperature += vehicleInterest.confidence * 20;

  // Boost for feature specificity
  temperature += vehicleInterest.specificFeatures.length * 5;

  // Boost for timeline urgency
  const urgentTerms = ['asap', 'soon', 'today', 'urgent'];
  if (urgentTerms.some(term => conversationHistory.toLowerCase().includes(term))) {
    temperature += 15;
  }

  // Boost for budget discussion
  if (vehicleInterest.budgetSignals.length > 0) {
    temperature += 10;
  }

  return Math.min(Math.max(temperature, 0), 100);
};

const determineConversationStage = (
  buyingSignals: BuyingSignal[],
  conversationHistory: string
): 'discovery' | 'presentation' | 'objection_handling' | 'closing' | 'follow_up' => {
  const historyLower = conversationHistory.toLowerCase();

  // Check for closing stage indicators
  if (buyingSignals.some(s => s.type === 'ready_to_buy' && s.strength > 0.8)) {
    return 'closing';
  }

  // Check for objection handling
  if (buyingSignals.some(s => s.type === 'objection')) {
    return 'objection_handling';
  }

  // Check for presentation stage
  if (historyLower.includes('features') || historyLower.includes('specs') || historyLower.includes('tell me about')) {
    return 'presentation';
  }

  // Check for follow-up stage
  if (historyLower.includes('think about') || historyLower.includes('get back to you')) {
    return 'follow_up';
  }

  // Default to discovery
  return 'discovery';
};

const generateNextBestActions = (
  buyingSignals: BuyingSignal[],
  vehicleInterest: EnhancedVehicleInterest,
  responseStrategy: any
): string[] => {
  const actions: string[] = [];

  // High priority actions based on buying signals
  if (buyingSignals.some(s => s.type === 'ready_to_buy')) {
    actions.push('Schedule immediate appointment');
    actions.push('Prepare financing pre-approval');
    actions.push('Check vehicle availability');
  } else if (buyingSignals.some(s => s.type === 'high_intent')) {
    actions.push('Schedule test drive');
    actions.push('Send vehicle details and photos');
  }

  // Actions based on vehicle interest
  if (vehicleInterest.useCase === 'work') {
    actions.push('Highlight work-specific features');
    actions.push('Discuss commercial financing options');
  }

  // Timeline-based actions
  if (vehicleInterest.timelineSignals.some(s => s.includes('soon') || s.includes('asap'))) {
    actions.push('Offer priority scheduling');
    actions.push('Check inventory urgency');
  }

  // Default actions if none specific
  if (actions.length === 0) {
    actions.push('Ask discovery question');
    actions.push('Build rapport and trust');
  }

  return actions.slice(0, 3); // Limit to top 3 actions
};
