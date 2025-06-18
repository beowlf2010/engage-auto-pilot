
// Enhanced intent analysis to detect customer agreement and interest
export const analyzeCustomerIntent = (conversationHistory: string, lastCustomerMessage: string) => {
  const history = conversationHistory.toLowerCase();
  const lastMessage = lastCustomerMessage.toLowerCase();
  
  // Detect affirmative responses
  const affirmativePatterns = [
    /\b(yes|yeah|yep|sure|okay|ok|please|sounds good|i'd like|tell me more|that would be great|absolutely|definitely|interested)\b/,
    /^(yes|sure|ok|please)[\s\.,!]*$/,
    /\b(i want|i need|i'd love|i would like)\b/
  ];
  
  const isAffirmative = affirmativePatterns.some(pattern => pattern.test(lastMessage));
  
  // Extract what they're agreeing to from previous sales messages
  const previousOffers = extractPreviousOffers(history);
  const agreedToOffer = isAffirmative ? findMostRecentOffer(previousOffers, history) : null;
  
  // Detect specific interests expressed
  const interestPatterns = {
    chevyEVDetails: /\b(chevy|chevrolet).*\b(ev|electric|details|options)\b/,
    teslaWatchList: /\b(tesla|keep.*eye|watch|notify|trade.*in)\b/,
    visitScheduling: /\b(visit|schedule|appointment|saturday|weekend|come.*in)\b/,
    pricing: /\b(price|cost|payment|finance|monthly)\b/,
    testDrive: /\b(test.*drive|drive|try)\b/
  };
  
  const detectedInterests = Object.entries(interestPatterns)
    .filter(([_, pattern]) => pattern.test(history))
    .map(([interest, _]) => interest);
  
  return {
    isAffirmative,
    agreedToOffer,
    detectedInterests,
    shouldFollowUp: isAffirmative && agreedToOffer !== null
  };
};

const extractPreviousOffers = (history: string) => {
  const offers = [];
  
  // Look for sales messages with offers
  if (history.includes('chevy ev') || history.includes('chevrolet')) {
    offers.push({
      type: 'chevyEVDetails',
      description: 'details on Chevy EV options'
    });
  }
  
  if (history.includes('keep an eye out') || history.includes('watch for') || history.includes('notify')) {
    offers.push({
      type: 'teslaWatchList',
      description: 'watching for Tesla trade-ins'
    });
  }
  
  if (history.includes('schedule') || history.includes('visit') || history.includes('saturday')) {
    offers.push({
      type: 'visitScheduling',
      description: 'scheduling a visit'
    });
  }
  
  return offers;
};

const findMostRecentOffer = (offers: any[], history: string) => {
  if (offers.length === 0) return null;
  
  // Return the most recent offer (last in conversation)
  return offers[offers.length - 1];
};

// Generate follow-up content based on what customer agreed to
export const generateFollowUpContent = (agreedOffer: any, vehicleCategory: any) => {
  switch (agreedOffer?.type) {
    case 'chevyEVDetails':
      return {
        focus: 'provide_chevy_ev_details',
        context: 'Customer expressed interest in Chevy EV options',
        instruction: 'Provide specific details about available Chevy electric vehicles, their features, and pricing'
      };
    
    case 'teslaWatchList':
      return {
        focus: 'confirm_tesla_watchlist',
        context: 'Customer wants to be notified about Tesla trade-ins',
        instruction: 'Confirm we\'ll watch for Tesla trade-ins and ask for preferred contact method'
      };
    
    case 'visitScheduling':
      return {
        focus: 'schedule_visit',
        context: 'Customer interested in scheduling a visit',
        instruction: 'Help schedule a specific time for them to visit the dealership'
      };
    
    default:
      return null;
  }
};
