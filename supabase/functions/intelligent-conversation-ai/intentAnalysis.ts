
// Enhanced intent analysis with proper conversation parsing and request detection
export const analyzeCustomerIntent = (conversationHistory: string, lastCustomerMessage: string) => {
  const history = conversationHistory.toLowerCase();
  const lastMessage = lastCustomerMessage.toLowerCase();
  
  // Parse conversation into structured messages
  const conversationLines = conversationHistory.split('\n').filter(line => line.trim());
  const salesMessages = conversationLines.filter(line => line.startsWith('Sales:'));
  const customerMessages = conversationLines.filter(line => line.startsWith('Customer:'));
  
  // Get the last sales message to understand what was offered
  const lastSalesMessage = salesMessages[salesMessages.length - 1] || '';
  const lastSalesContent = lastSalesMessage.replace('Sales:', '').trim().toLowerCase();
  
  // Detect direct customer requests (not responses to questions)
  const directRequestPatterns = [
    /\b(details on|tell me about|information about|more about)\s+(.+)/,
    /\b(i want|i need|i'd like)\s+(details|information|to know)\s+(about|on)\s+(.+)/,
    /\b(what|how|when|where)\s+(.+)/,
    /^(details on|tell me about|information about|more about)\s+(.+)/,
  ];
  
  const isDirectRequest = directRequestPatterns.some(pattern => pattern.test(lastMessage));
  let requestedTopic = null;
  
  if (isDirectRequest) {
    // Extract what they're requesting details about
    for (const pattern of directRequestPatterns) {
      const match = lastMessage.match(pattern);
      if (match) {
        requestedTopic = match[2] || match[4] || match[1];
        break;
      }
    }
  }
  
  // Detect affirmative responses to specific questions/offers
  const affirmativePatterns = [
    /^(yes|yeah|yep|sure|okay|ok|please|absolutely|definitely)[\s\.,!]*$/,
    /\b(sounds good|that would be great|i'd like that|tell me more)\b/,
    /^(yes|sure|ok|please)\s+(please|thanks|that works)/,
  ];
  
  // Only consider it an agreement if:
  // 1. It's clearly affirmative AND
  // 2. There was a recent sales question/offer AND  
  // 3. It's not a direct request
  const isAffirmativeResponse = !isDirectRequest && 
    affirmativePatterns.some(pattern => pattern.test(lastMessage)) &&
    lastSalesContent.includes('?'); // Last sales message was a question
  
  // Extract what they're agreeing to from the last sales message
  let agreedToOffer = null;
  if (isAffirmativeResponse) {
    agreedToOffer = extractOfferFromSalesMessage(lastSalesContent);
  }
  
  // Determine the primary intent
  let primaryIntent = 'unknown';
  if (isDirectRequest) {
    primaryIntent = 'direct_request';
  } else if (isAffirmativeResponse) {
    primaryIntent = 'agreement';
  } else if (lastMessage.includes('no') || lastMessage.includes('not interested')) {
    primaryIntent = 'declined';
  }
  
  return {
    primaryIntent,
    isDirectRequest,
    requestedTopic,
    isAffirmativeResponse,
    agreedToOffer,
    shouldProvideInformation: isDirectRequest || isAffirmativeResponse,
    conversationContext: {
      lastSalesMessage: lastSalesContent,
      customerMessageCount: customerMessages.length,
      salesMessageCount: salesMessages.length
    }
  };
};

// Extract specific offers from sales messages
const extractOfferFromSalesMessage = (salesMessage: string) => {
  const offers = [];
  
  // Look for specific offers in the sales message
  if (salesMessage.includes('chevy') && (salesMessage.includes('details') || salesMessage.includes('options'))) {
    offers.push({
      type: 'chevyEVDetails',
      description: 'Chevy EV details and options'
    });
  }
  
  if (salesMessage.includes('keep an eye out') || salesMessage.includes('watch for') || salesMessage.includes('tesla')) {
    offers.push({
      type: 'teslaWatchList',
      description: 'watching for Tesla trade-ins'
    });
  }
  
  if (salesMessage.includes('schedule') || salesMessage.includes('visit') || salesMessage.includes('saturday')) {
    offers.push({
      type: 'visitScheduling',
      description: 'scheduling a visit'
    });
  }
  
  // Return the most relevant offer
  return offers.length > 0 ? offers[0] : null;
};

// Generate appropriate follow-up content based on intent analysis
export const generateFollowUpContent = (intentAnalysis: any, vehicleCategory: any) => {
  const { primaryIntent, requestedTopic, agreedToOffer } = intentAnalysis;
  
  // Handle direct requests
  if (primaryIntent === 'direct_request' && requestedTopic) {
    if (requestedTopic.includes('chevy') && requestedTopic.includes('ev')) {
      return {
        focus: 'provide_chevy_ev_details',
        context: 'Customer directly requested Chevy EV details',
        instruction: 'Provide specific details about available Chevy electric vehicles, their features, pricing, and benefits. Do not ask if they want details - they already requested them.'
      };
    }
  }
  
  // Handle agreements to specific offers
  if (primaryIntent === 'agreement' && agreedToOffer) {
    switch (agreedToOffer.type) {
      case 'chevyEVDetails':
        return {
          focus: 'provide_chevy_ev_details',
          context: 'Customer agreed to receive Chevy EV details',
          instruction: 'Provide specific details about available Chevy electric vehicles, their features, and pricing. Do not ask again.'
        };
      
      case 'teslaWatchList':
        return {
          focus: 'confirm_tesla_watchlist',
          context: 'Customer wants to be notified about Tesla trade-ins',
          instruction: 'Confirm we will watch for Tesla trade-ins and ask for preferred contact method'
        };
      
      case 'visitScheduling':
        return {
          focus: 'schedule_visit',
          context: 'Customer interested in scheduling a visit',
          instruction: 'Help schedule a specific time for them to visit the dealership'
        };
    }
  }
  
  return null;
};

// Check if the conversation has redundant patterns
export const detectRedundantPatterns = (conversationHistory: string) => {
  const salesMessages = conversationHistory
    .split('\n')
    .filter(line => line.startsWith('Sales:'))
    .map(line => line.replace('Sales:', '').trim().toLowerCase());
  
  const lastThreeMessages = salesMessages.slice(-3);
  
  // Check for repeated offers or questions
  const hasRepeatedOffers = lastThreeMessages.some((msg, index) => {
    if (index === 0) return false;
    const previousMsg = lastThreeMessages[index - 1];
    return (
      (msg.includes('chevy') && previousMsg.includes('chevy')) ||
      (msg.includes('want to know more') && previousMsg.includes('want to know more')) ||
      (msg.includes('details') && previousMsg.includes('details'))
    );
  });
  
  return {
    hasRepeatedOffers,
    shouldAvoidRedundancy: hasRepeatedOffers
  };
};
