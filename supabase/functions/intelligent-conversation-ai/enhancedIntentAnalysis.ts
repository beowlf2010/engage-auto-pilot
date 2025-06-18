
// Enhanced intent analysis to detect specific customer questions and requirements
export const analyzeCustomerIntent = (conversationHistory: string, lastCustomerMessage: string) => {
  const history = conversationHistory.toLowerCase();
  const lastMessage = lastCustomerMessage.toLowerCase();
  
  // Parse conversation into structured messages
  const conversationLines = conversationHistory.split('\n').filter(line => line.trim());
  const salesMessages = conversationLines.filter(line => line.startsWith('Sales:'));
  const customerMessages = conversationLines.filter(line => line.startsWith('Customer:'));
  
  // Detect question types in the last customer message
  const questionPatterns = {
    pricing: /\b(price|cost|how much|payment|monthly|finance|financing|afford)\b/,
    availability: /\b(have|available|in stock|do you|get|find|look for)\b/,
    features: /\b(features|options|specs|specifications|tell me about|what does|include)\b/,
    scheduling: /\b(schedule|appointment|visit|come in|see|test drive|when|time)\b/,
    comparison: /\b(compare|versus|vs|difference|better|which)\b/,
    trade: /\b(trade|trade-in|worth|value|owe|payoff)\b/,
    general_inquiry: /\?|what|how|when|where|why|can you|could you|would you/
  };

  // Detect specific question types
  const detectedQuestions = [];
  for (const [type, pattern] of Object.entries(questionPatterns)) {
    if (pattern.test(lastMessage)) {
      detectedQuestions.push(type);
    }
  }

  // Determine if this is a direct question requiring an answer
  const isDirectQuestion = detectedQuestions.length > 0 || 
    lastMessage.includes('?') ||
    /^(what|how|when|where|why|can|could|would|do|does|is|are)\b/.test(lastMessage);

  // Extract the specific topic they're asking about
  let questionTopic = null;
  if (isDirectQuestion) {
    // Try to extract vehicle mentions
    const vehicleMatch = lastMessage.match(/\b(tesla|model [sy3x]|chevy|chevrolet|bolt|equinox|honda|toyota|ford|bmw|mercedes|audi)\b/i);
    if (vehicleMatch) {
      questionTopic = vehicleMatch[0];
    }
    
    // Extract general topics
    if (!questionTopic) {
      const topicMatch = lastMessage.match(/\b(electric|ev|hybrid|suv|sedan|truck|car|vehicle)\b/i);
      if (topicMatch) {
        questionTopic = topicMatch[0];
      }
    }
  }

  // Check if customer is showing frustration or being ignored
  const frustrationIndicators = /\b(but|however|still|again|told you|said|asked|my question|answer)\b/;
  const showingFrustration = frustrationIndicators.test(lastMessage);

  // Analyze if previous sales messages were off-topic
  const lastSalesMessage = salesMessages[salesMessages.length - 1] || '';
  const lastSalesContent = lastSalesMessage.replace('Sales:', '').trim().toLowerCase();
  
  const salesWasOffTopic = isDirectQuestion && lastSalesContent && 
    !detectedQuestions.some(qType => {
      switch (qType) {
        case 'pricing': return /price|cost|payment|finance/.test(lastSalesContent);
        case 'availability': return /available|stock|have|inventory/.test(lastSalesContent);
        case 'features': return /features|specs|options/.test(lastSalesContent);
        case 'scheduling': return /schedule|visit|appointment/.test(lastSalesContent);
        default: return false;
      }
    });

  return {
    isDirectQuestion,
    questionTypes: detectedQuestions,
    questionTopic,
    showingFrustration,
    salesWasOffTopic,
    requiresDirectAnswer: isDirectQuestion || showingFrustration,
    primaryQuestionType: detectedQuestions[0] || 'general_inquiry',
    conversationContext: {
      lastSalesMessage: lastSalesContent,
      customerMessageCount: customerMessages.length,
      salesMessageCount: salesMessages.length,
      hasBeenIgnored: showingFrustration || salesWasOffTopic
    }
  };
};

// Generate specific answer guidance based on question type
export const generateAnswerGuidance = (intentAnalysis: any, inventoryStatus: any) => {
  const { questionTypes, questionTopic, primaryQuestionType, showingFrustration } = intentAnalysis;
  
  if (!intentAnalysis.requiresDirectAnswer) {
    return null;
  }

  const guidance = {
    mustAnswerFirst: true,
    answerType: primaryQuestionType,
    specificGuidance: '',
    inventoryContext: inventoryStatus,
    urgencyLevel: showingFrustration ? 'high' : 'normal'
  };

  switch (primaryQuestionType) {
    case 'pricing':
      guidance.specificGuidance = questionTopic ? 
        `Provide specific pricing information for ${questionTopic}. If not available, explain clearly and offer alternatives.` :
        'Answer their pricing question directly. Be transparent about costs and financing options.';
      break;
      
    case 'availability':
      guidance.specificGuidance = inventoryStatus.hasActualInventory ?
        `Confirm availability of ${questionTopic || 'requested vehicles'}. Reference actual inventory.` :
        `Be honest that ${questionTopic || 'the requested vehicle'} is not currently available. Offer similar alternatives.`;
      break;
      
    case 'features':
      guidance.specificGuidance = `Provide specific feature information about ${questionTopic || 'the vehicle'}. Be detailed and helpful.`;
      break;
      
    case 'scheduling':
      guidance.specificGuidance = 'Help them schedule a visit or appointment. Be specific about availability and next steps.';
      break;
      
    case 'trade':
      guidance.specificGuidance = 'Address their trade-in question directly. Offer valuation assistance or process information.';
      break;
      
    default:
      guidance.specificGuidance = 'Answer their question directly and completely before moving to sales topics.';
  }

  if (showingFrustration) {
    guidance.specificGuidance = `CUSTOMER IS FRUSTRATED - ${guidance.specificGuidance} Acknowledge their question was missed.`;
  }

  return guidance;
};

// Check for conversation repair needs
export const needsConversationRepair = (intentAnalysis: any) => {
  return intentAnalysis.showingFrustration || 
         intentAnalysis.salesWasOffTopic || 
         intentAnalysis.conversationContext.hasBeenIgnored;
};
