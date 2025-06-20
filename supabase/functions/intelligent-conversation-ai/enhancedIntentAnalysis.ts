
// Enhanced intent analysis to detect specific customer questions and objections
import { analyzeTowingRequest, validateTowingCapability, generateSafeTowingResponse } from './vehicleSpecifications.ts';

export const analyzeCustomerIntent = (conversationHistory: string, lastCustomerMessage: string) => {
  const history = conversationHistory.toLowerCase();
  const lastMessage = lastCustomerMessage.toLowerCase();
  
  // Parse conversation into structured messages
  const conversationLines = conversationHistory.split('\n').filter(line => line.trim());
  const salesMessages = conversationLines.filter(line => line.startsWith('Sales:') || line.startsWith('You:'));
  const customerMessages = conversationLines.filter(line => line.startsWith('Customer:'));
  
  // ENHANCED: Analyze towing requests
  const towingAnalysis = analyzeTowingRequest(lastCustomerMessage);
  
  // Detect question types in the last customer message
  const questionPatterns = {
    inventory_availability: /\b(do you have|available|in stock|have any|show me|can you find|looking for|interested in|want to see)\b/,
    pricing: /\b(price|cost|how much|payment|monthly|finance|financing|afford|payments)\b/,
    features: /\b(features|options|specs|specifications|tell me about|what does|include|comes with)\b/,
    scheduling: /\b(schedule|appointment|visit|come in|see|test drive|when|time|available)\b/,
    comparison: /\b(compare|versus|vs|difference|better|which)\b/,
    trade: /\b(trade|trade-in|worth|value|owe|payoff)\b/,
    towing: /\b(tow|pull|haul|drag|trailer|hitch|capacity)\b/,
    general_inquiry: /\?|what|how|when|where|why|can you|could you|would you/
  };

  // NEW: Detect objection and hesitation patterns
  const objectionPatterns = {
    hesitation: /\b(think about it|let me think|not sure|maybe|might|i'll get back|talk it over)\b/,
    price_objection: /\b(too expensive|can't afford|out of budget|too much|cheaper|better deal)\b/,
    timing_objection: /\b(not ready|waiting|next month|current car|few more months|decided to wait)\b/,
    feature_objection: /\b(don't like|not what i want|looking for something|wish it had|missing)\b/,
    competitor_mention: /\b(honda|toyota|ford|other dealer|elsewhere|comparing|looking elsewhere)\b/
  };

  // Detect specific question types
  const detectedQuestions = [];
  for (const [type, pattern] of Object.entries(questionPatterns)) {
    if (pattern.test(lastMessage)) {
      detectedQuestions.push(type);
    }
  }

  // NEW: Detect objections
  const detectedObjections = [];
  for (const [type, pattern] of Object.entries(objectionPatterns)) {
    if (pattern.test(lastMessage)) {
      detectedObjections.push(type);
    }
  }

  const isDirectQuestion = detectedQuestions.length > 0 || 
    lastMessage.includes('?') ||
    /^(what|how|when|where|why|can|could|would|do|does|is|are)\b/.test(lastMessage);

  // NEW: Detect if customer is being evasive or non-committal
  const isEvasive = /^(ok|okay|sure|maybe|i guess|we'll see|fine)\.?$/i.test(lastMessage.trim()) ||
    /\b(think about it|get back to you|let you know|talk it over)\b/.test(lastMessage);

  // Extract the specific topic they're asking about
  let questionTopic = null;
  if (isDirectQuestion) {
    // Try to extract vehicle mentions
    const vehicleMatch = lastMessage.match(/\b(tesla|model [sy3x]|chevy|chevrolet|bolt|equinox|honda|toyota|ford|bmw|mercedes|audi|2026|2025|2024|sedan|suv|truck|trailblazer|silverado|tahoe|equinox)\b/i);
    if (vehicleMatch) {
      questionTopic = vehicleMatch[0];
    }
    
    // Extract general topics
    if (!questionTopic) {
      const topicMatch = lastMessage.match(/\b(electric|ev|hybrid|tow|towing|package|class 5|leather|seats|white|red|color)\b/i);
      if (topicMatch) {
        questionTopic = topicMatch[0];
      }
    }
  }

  // REFINED: Only detect frustration with explicit indicators of being ignored
  const explicitFrustrationIndicators = /\b(but you didn't answer|i asked you|you never responded|i told you|you ignored|my question was|why didn't you|you missed my|still waiting|i'm still asking|hello\?|are you there)\b/;
  const repeatIndicators = /\b(again|i said|like i said|as i mentioned|i already|i repeat)\b/;
  
  // REFINED: Only flag as frustration if there are explicit indicators
  const showingFrustration = explicitFrustrationIndicators.test(lastMessage) || 
    (repeatIndicators.test(lastMessage) && isDirectQuestion);

  // IMPROVED: Check if previous sales message actually addressed their question
  const lastSalesMessage = salesMessages[salesMessages.length - 1] || '';
  const lastSalesContent = lastSalesMessage.replace(/^(Sales:|You:)/, '').trim().toLowerCase();
  
  // Only flag as off-topic if we have clear evidence the question was ignored
  const salesWasOffTopic = showingFrustration && lastSalesContent && isDirectQuestion && 
    !detectedQuestions.some(qType => {
      switch (qType) {
        case 'inventory_availability': return /available|stock|have|inventory|find|show|check/.test(lastSalesContent);
        case 'pricing': return /price|cost|payment|finance/.test(lastSalesContent);
        case 'features': return /features|specs|options|package|seats|color/.test(lastSalesContent);
        case 'scheduling': return /schedule|visit|appointment|come|see/.test(lastSalesContent);
        case 'towing': return /tow|capacity|pull|haul/.test(lastSalesContent);
        default: return false;
      }
    });

  // REFINED: Only require conversation repair if there's actual evidence of being ignored
  const actuallyIgnored = showingFrustration && salesWasOffTopic;

  return {
    isDirectQuestion,
    questionTypes: detectedQuestions,
    questionTopic,
    showingFrustration,
    salesWasOffTopic,
    requiresDirectAnswer: isDirectQuestion,
    primaryQuestionType: detectedQuestions[0] || 'general_inquiry',
    towingAnalysis, // Include towing analysis
    // NEW: Objection analysis
    hasObjections: detectedObjections.length > 0,
    detectedObjections,
    isEvasive,
    needsObjectionHandling: detectedObjections.length > 0 || isEvasive,
    conversationContext: {
      lastSalesMessage: lastSalesContent,
      customerMessageCount: customerMessages.length,
      salesMessageCount: salesMessages.length,
      hasBeenIgnored: actuallyIgnored,
      needsApology: actuallyIgnored // Only apologize when actually ignored
    }
  };
};

// Generate specific answer guidance based on question type and objections
export const generateAnswerGuidance = (intentAnalysis: any, inventoryStatus: any) => {
  const { questionTypes, questionTopic, primaryQuestionType, conversationContext, towingAnalysis, hasObjections, detectedObjections, needsObjectionHandling } = intentAnalysis;
  
  if (!intentAnalysis.requiresDirectAnswer && !needsObjectionHandling) {
    return null;
  }

  const guidance = {
    mustAnswerFirst: true,
    answerType: primaryQuestionType,
    specificGuidance: '',
    inventoryContext: inventoryStatus,
    urgencyLevel: conversationContext.needsApology ? 'high' : 'normal',
    needsApology: conversationContext.needsApology,
    towingValidation: null as any,
    // NEW: Objection handling guidance
    hasObjections,
    objectionsDetected: detectedObjections,
    needsObjectionHandling,
    salesProgression: 'address_objection'
  };

  // NEW: Handle objections first
  if (needsObjectionHandling) {
    const primaryObjection = detectedObjections[0];
    switch (primaryObjection) {
      case 'hesitation':
        guidance.specificGuidance = 'Customer is hesitating. Ask specific probing questions to uncover the real concern: "Is there something specific about the vehicle that\'s concerning you - price, timing, or features?"';
        break;
      case 'price_objection':
        guidance.specificGuidance = 'Customer has price concerns. Ask about their comfortable payment range and present financing options.';
        break;
      case 'timing_objection':
        guidance.specificGuidance = 'Customer wants to delay. Create appropriate urgency and ask what would need to change for them to move forward sooner.';
        break;
      case 'feature_objection':
        guidance.specificGuidance = 'Customer has feature concerns. Ask specifically what features are most important to them.';
        break;
      case 'competitor_mention':
        guidance.specificGuidance = 'Customer mentioned competitors. Ask what other vehicles they\'re considering and highlight unique advantages.';
        break;
      default:
        guidance.specificGuidance = 'Customer is being evasive. Ask direct questions to uncover their real concerns and move the conversation forward.';
    }
    return guidance;
  }

  // ENHANCED: Handle towing questions with validation
  if (primaryQuestionType === 'towing' && towingAnalysis?.hasTowingRequest) {
    if (towingAnalysis.equipmentMentioned && towingAnalysis.vehicleMentioned) {
      // Extract vehicle details for validation
      const vehicleParts = towingAnalysis.vehicleMentioned.split(' ');
      const make = vehicleParts[0];
      const model = vehicleParts.slice(1).join(' ');
      
      // Perform towing validation
      guidance.towingValidation = validateTowingCapability(
        make, 
        model, 
        2023, // Default to current model year
        towingAnalysis.equipmentMentioned
      );
      
      guidance.specificGuidance = `CRITICAL: Validate towing claim. ${guidance.towingValidation.reason}. Use this exact response: "${generateSafeTowingResponse(guidance.towingValidation, intentAnalysis)}"`;
    } else {
      guidance.specificGuidance = 'Customer asking about towing. Ask for specific vehicle and equipment details before making any towing capacity claims.';
    }
  } else {
    // Existing guidance logic
    switch (primaryQuestionType) {
      case 'inventory_availability':
        guidance.specificGuidance = inventoryStatus.hasActualInventory ?
          `Customer is asking about inventory availability. Show them the ${inventoryStatus.validatedCount} vehicles we have in stock that match their request.` :
          `Customer is asking about availability but we don't currently have what they're looking for. Be honest and offer alternatives.`;
        break;
        
      case 'pricing':
        guidance.specificGuidance = questionTopic ? 
          `Provide pricing information for ${questionTopic}. Be transparent about costs and ask about their payment comfort zone.` :
          'Answer their pricing question directly and ask about their budget and payment preferences.';
        break;
        
      case 'features':
        guidance.specificGuidance = `Provide specific feature information about ${questionTopic || 'the vehicle'}. Be detailed and helpful, then ask what features are most important to them.`;
        break;
        
      case 'scheduling':
        guidance.specificGuidance = 'Help them schedule a visit or appointment. Be specific about next steps and create appropriate urgency.';
        break;
        
      default:
        guidance.specificGuidance = 'Answer their question directly and completely, then ask a follow-up question to move the conversation forward.';
    }
  }

  // Only add apology guidance when there's actual evidence of being ignored
  if (conversationContext.needsApology && primaryQuestionType !== 'towing') {
    guidance.specificGuidance = `APOLOGIZE for missing their previous question, then ${guidance.specificGuidance}`;
  }

  return guidance;
};

// REFINED: Check for conversation repair needs - only when actually needed
export const needsConversationRepair = (intentAnalysis: any) => {
  return intentAnalysis.conversationContext.needsApology;
};
