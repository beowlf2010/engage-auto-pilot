
// Enhanced intent analysis with pricing discrepancy detection
import { analyzeTowingRequest, validateTowingCapability, generateSafeTowingResponse } from './vehicleSpecifications.ts';
import { detectEnhancedObjectionSignals, detectVehicleNicknames } from './enhancedObjectionDetection.ts';

export const analyzeCustomerIntent = (conversationHistory: string, lastCustomerMessage: string) => {
  const history = conversationHistory.toLowerCase();
  const lastMessage = lastCustomerMessage.toLowerCase();
  
  // Parse conversation into structured messages
  const conversationLines = conversationHistory.split('\n').filter(line => line.trim());
  const salesMessages = conversationLines.filter(line => line.startsWith('Sales:') || line.startsWith('You:'));
  const customerMessages = conversationLines.filter(line => line.startsWith('Customer:'));
  
  // ENHANCED: Use new objection detection system
  const enhancedObjections = detectEnhancedObjectionSignals(lastCustomerMessage, conversationHistory);
  
  // ENHANCED: Detect vehicle nicknames
  const vehicleNicknames = detectVehicleNicknames(lastCustomerMessage);
  
  // ENHANCED: Analyze towing requests
  const towingAnalysis = analyzeTowingRequest(lastCustomerMessage);
  
  // Detect question types in the last customer message
  const questionPatterns = {
    inventory_availability: /\b(do you have|available|in stock|have any|show me|can you find|looking for|interested in|want to see)\b/,
    pricing: /\b(price|cost|how much|payment|monthly|finance|financing|afford|payments)\b/,
    pricing_discrepancy: /\b(different price|price.*different|online.*price|website.*price).*\b(called|phone)\b/,
    features: /\b(features|options|specs|specifications|tell me about|what does|include|comes with)\b/,
    scheduling: /\b(schedule|appointment|visit|come in|see|test drive|when|time|available)\b/,
    comparison: /\b(compare|versus|vs|difference|better|which)\b/,
    trade: /\b(trade|trade-in|worth|value|owe|payoff)\b/,
    towing: /\b(tow|pull|haul|drag|trailer|hitch|capacity)\b/,
    general_inquiry: /\?|what|how|when|where|why|can you|could you|would you/
  };

  // Detect specific question types
  const detectedQuestions = [];
  for (const [type, pattern] of Object.entries(questionPatterns)) {
    if (pattern.test(lastMessage)) {
      detectedQuestions.push(type);
    }
  }

  const isDirectQuestion = detectedQuestions.length > 0 || 
    lastMessage.includes('?') ||
    /^(what|how|when|where|why|can|could|would|do|does|is|are)\b/.test(lastMessage);

  // ENHANCED: Detect if customer is frustrated about pricing
  const isPricingFrustration = enhancedObjections.some(obj => 
    ['pricing_discrepancy', 'pricing_shock', 'online_vs_call_price', 'upgrade_costs'].includes(obj.type)
  );

  // ENHANCED: Check for explicit frustration indicators
  const explicitFrustrationIndicators = /\b(but you didn't answer|i asked you|you never responded|i told you|you ignored|my question was|why didn't you|you missed my|still waiting|i'm still asking|hello\?|are you there)\b/;
  const repeatIndicators = /\b(again|i said|like i said|as i mentioned|i already|i repeat)\b/;
  
  const showingFrustration = explicitFrustrationIndicators.test(lastMessage) || 
    (repeatIndicators.test(lastMessage) && isDirectQuestion) ||
    isPricingFrustration;

  // Extract topic with nickname detection
  let questionTopic = null;
  if (isDirectQuestion || isPricingFrustration) {
    // First check for vehicle nicknames
    if (vehicleNicknames.length > 0) {
      questionTopic = vehicleNicknames[0].actualVehicle;
    } else {
      // Try to extract vehicle mentions
      const vehicleMatch = lastMessage.match(/\b(tesla|model [sy3x]|chevy|chevrolet|bolt|equinox|honda|toyota|ford|bmw|mercedes|audi|2026|2025|2024|sedan|suv|truck|trailblazer|silverado|tahoe|equinox)\b/i);
      if (vehicleMatch) {
        questionTopic = vehicleMatch[0];
      }
    }
    
    // Extract general topics
    if (!questionTopic) {
      const topicMatch = lastMessage.match(/\b(electric|ev|hybrid|tow|towing|package|class 5|leather|seats|white|red|color)\b/i);
      if (topicMatch) {
        questionTopic = topicMatch[0];
      }
    }
  }

  // ENHANCED: Pricing concerns require immediate response
  const requiresUrgentResponse = isPricingFrustration || showingFrustration;

  return {
    isDirectQuestion,
    questionTypes: detectedQuestions,
    questionTopic,
    showingFrustration,
    requiresDirectAnswer: isDirectQuestion || isPricingFrustration,
    primaryQuestionType: detectedQuestions[0] || (isPricingFrustration ? 'pricing_discrepancy' : 'general_inquiry'),
    towingAnalysis,
    // ENHANCED: Objection analysis with pricing focus
    hasObjections: enhancedObjections.length > 0,
    detectedObjections: enhancedObjections,
    hasPricingConcerns: isPricingFrustration,
    requiresUrgentResponse,
    vehicleNicknames,
    conversationContext: {
      lastSalesMessage: salesMessages[salesMessages.length - 1]?.replace(/^(Sales:|You:)/, '').trim().toLowerCase() || '',
      customerMessageCount: customerMessages.length,
      salesMessageCount: salesMessages.length,
      hasBeenIgnored: showingFrustration,
      needsApology: showingFrustration,
      needsImmediateResponse: requiresUrgentResponse
    }
  };
};

// Enhanced answer guidance with pricing focus
export const generateAnswerGuidance = (intentAnalysis: any, inventoryStatus: any) => {
  const { 
    questionTypes, 
    questionTopic, 
    primaryQuestionType, 
    conversationContext, 
    towingAnalysis, 
    detectedObjections,
    hasPricingConcerns,
    requiresUrgentResponse,
    vehicleNicknames
  } = intentAnalysis;
  
  if (!intentAnalysis.requiresDirectAnswer && detectedObjections.length === 0) {
    return null;
  }

  const guidance = {
    mustAnswerFirst: true,
    answerType: primaryQuestionType,
    specificGuidance: '',
    inventoryContext: inventoryStatus,
    urgencyLevel: requiresUrgentResponse ? 'critical' : conversationContext.needsApology ? 'high' : 'normal',
    needsApology: conversationContext.needsApology && !hasPricingConcerns, // Don't apologize for pricing concerns, just address them
    towingValidation: null as any,
    // ENHANCED: Pricing and objection handling
    hasPricingConcerns,
    objectionsDetected: detectedObjections,
    vehicleNicknames,
    requiresImmediateResponse: requiresUrgentResponse
  };

  // PRIORITY 1: Handle pricing concerns first
  if (hasPricingConcerns) {
    const pricingObjection = detectedObjections.find(obj => 
      ['pricing_discrepancy', 'pricing_shock', 'online_vs_call_price', 'upgrade_costs'].includes(obj.type)
    );
    
    if (pricingObjection) {
      switch (pricingObjection.type) {
        case 'pricing_discrepancy':
        case 'online_vs_call_price':
          guidance.specificGuidance = 'CRITICAL: Customer experienced pricing discrepancy between online and phone quotes. Acknowledge confusion immediately, explain online pricing limitations, and offer transparent breakdown. Use empathetic tone and take responsibility for clarity.';
          break;
        case 'upgrade_costs':
          guidance.specificGuidance = 'CRITICAL: Customer concerned about upgrade costs. Explain value of packages, offer alternatives, and ask about their budget priorities. Be transparent about what\'s included.';
          break;
        case 'pricing_shock':
          guidance.specificGuidance = 'CRITICAL: Customer experiencing price shock. Show empathy, acknowledge their surprise, and work collaboratively on budget solutions. Focus on finding alternatives within their comfort zone.';
          break;
      }
      return guidance;
    }
  }

  // PRIORITY 2: Handle other objections
  if (detectedObjections.length > 0) {
    const primaryObjection = detectedObjections[0];
    guidance.specificGuidance = `Address customer's ${primaryObjection.type} concern directly and empathetically.`;
    return guidance;
  }

  // PRIORITY 3: Handle direct questions
  if (primaryQuestionType === 'towing' && towingAnalysis?.hasTowingRequest) {
    guidance.specificGuidance = 'CRITICAL: Validate towing claim carefully. Ask for specific vehicle and equipment details before making capacity claims.';
  } else {
    switch (primaryQuestionType) {
      case 'pricing_discrepancy':
        guidance.specificGuidance = 'CRITICAL: Address pricing discrepancy immediately with empathy and transparency.';
        break;
      case 'pricing':
        guidance.specificGuidance = `Provide clear pricing information for ${questionTopic || 'the vehicle'}. Be transparent and ask about budget comfort zone.`;
        break;
      case 'inventory_availability':
        guidance.specificGuidance = inventoryStatus.hasActualInventory ?
          `Show them the available vehicles that match their request.` :
          `Be honest about availability and offer alternatives.`;
        break;
      default:
        guidance.specificGuidance = 'Answer their question directly and completely, then ask a follow-up question.';
    }
  }

  return guidance;
};
