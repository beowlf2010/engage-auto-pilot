
// Enhanced conversation memory to prevent redundancy and track introductions
export const analyzeConversationMemory = (conversationHistory: string) => {
  const lines = conversationHistory.split('\n').filter(line => line.trim());
  const salesMessages = lines.filter(line => line.startsWith('Sales:') || line.startsWith('You:'));
  const customerMessages = lines.filter(line => line.startsWith('Customer:'));
  
  // Track what has been offered/discussed
  const offeredItems = new Set<string>();
  const discussedTopics = new Set<string>();
  const customerRequests = new Set<string>();
  const customerAgreements = new Set<string>();
  
  // IMPROVED: Track conversation state and introductions
  let hasIntroduced = false;
  let hasEstablishedRapport = false;
  let lastSalesMessageType = 'unknown';
  
  // Analyze sales messages for offers and introductions
  salesMessages.forEach((msg, index) => {
    const content = msg.replace(/^(Sales:|You:)/, '').trim().toLowerCase();
    
    // Check for introductions
    if (content.includes("i'm finn") || content.includes("finn from") || content.includes("finn with")) {
      hasIntroduced = true;
    }
    
    // Check for established rapport
    if (index > 0 && (content.includes('thanks for') || content.includes('great to hear') || content.includes('sounds like'))) {
      hasEstablishedRapport = true;
    }
    
    // Track the type of last sales message
    if (index === salesMessages.length - 1) {
      if (content.includes('schedule') || content.includes('come in') || content.includes('visit')) {
        lastSalesMessageType = 'scheduling';
      } else if (content.includes('have') && content.includes('stock')) {
        lastSalesMessageType = 'inventory';
      } else if (content.includes("i'm finn") || content.includes('from jason pilger')) {
        lastSalesMessageType = 'introduction';
      } else {
        lastSalesMessageType = 'follow_up';
      }
    }
    
    // Track vehicle offers
    if (content.includes('chevy') && (content.includes('bolt') || content.includes('equinox'))) {
      offeredItems.add('chevy_evs');
    }
    if (content.includes('tesla') && content.includes('watch') || content.includes('eye out')) {
      offeredItems.add('tesla_watchlist');
    }
    if (content.includes('visit') || content.includes('saturday') || content.includes('schedule')) {
      offeredItems.add('visit_scheduling');
    }
  });
  
  // FIXED: Analyze customer messages for ACTUAL topics mentioned - be more precise
  customerMessages.forEach(msg => {
    const content = msg.replace('Customer:', '').trim().toLowerCase();
    
    // Track direct requests - only add topics explicitly mentioned by customer
    if (content.includes('details on') || content.includes('tell me about') || content.includes('information about')) {
      if (content.includes('chevy') || content.includes('chevrolet')) customerRequests.add('chevy_details');
      if (content.includes('tesla')) customerRequests.add('tesla_details');
    }
    
    // FIXED: Only add topics that are explicitly mentioned by the customer
    if (content.includes('electric') || content.includes(' ev ') || content.includes('hybrid')) {
      discussedTopics.add('electric_vehicles');
    }
    if (content.includes('tesla')) {
      discussedTopics.add('tesla');
    }
    if (content.includes('chevy') || content.includes('chevrolet') || content.includes('trailblazer')) {
      discussedTopics.add('chevrolet');
    }
    
    // Track agreements
    if (/^(yes|yeah|sure|okay|please)[\s\.,!]*$/i.test(content) || 
        content.includes('sounds good') || content.includes('that works')) {
      customerAgreements.add('general_agreement');
    }
    
    // Track time confirmations
    if (content.includes('pm') || content.includes('am') || /\d+:\d+/.test(content)) {
      customerAgreements.add('time_confirmed');
    }
  });
  
  return {
    offeredItems: Array.from(offeredItems),
    discussedTopics: Array.from(discussedTopics),
    customerRequests: Array.from(customerRequests),
    customerAgreements: Array.from(customerAgreements),
    conversationLength: lines.length,
    salesMessageCount: salesMessages.length,
    customerMessageCount: customerMessages.length,
    lastSalesMessage: salesMessages[salesMessages.length - 1] || '',
    lastCustomerMessage: customerMessages[customerMessages.length - 1] || '',
    // NEW: Conversation state tracking
    hasIntroduced,
    hasEstablishedRapport,
    lastSalesMessageType,
    isEstablishedConversation: hasIntroduced && salesMessages.length > 1,
    needsIntroduction: !hasIntroduced && salesMessages.length === 0
  };
};

// ENHANCED: Generate context-aware guidance that prevents redundant introductions and topic hallucinations
export const generateConversationGuidance = (memory: any, inventoryValidation: any, businessHours: any) => {
  const guidance = [];
  
  // CRITICAL: Prevent redundant introductions
  if (memory.hasIntroduced && memory.isEstablishedConversation) {
    guidance.push('ESTABLISHED CONVERSATION - Do NOT introduce yourself again. Continue naturally from previous conversation.');
  }
  
  if (memory.lastSalesMessageType === 'introduction') {
    guidance.push('PREVIOUS MESSAGE WAS INTRODUCTION - Follow up naturally, do not re-introduce.');
  }
  
  // CRITICAL: Prevent topic hallucinations
  if (memory.discussedTopics.length === 0) {
    guidance.push('NO SPECIFIC VEHICLE TOPICS DISCUSSED - Do not suggest vehicle types not mentioned by customer. Focus on their actual request.');
  }
  
  if (memory.discussedTopics.includes('chevrolet') && !memory.discussedTopics.includes('electric_vehicles')) {
    guidance.push('CUSTOMER INTERESTED IN CHEVROLET - Do NOT mention electric vehicles unless customer specifically asked about them.');
  }
  
  // Prevent redundant offers
  if (memory.offeredItems.includes('chevy_evs') && memory.customerRequests.includes('chevy_details')) {
    guidance.push('CUSTOMER ALREADY REQUESTED CHEVY DETAILS - Provide specific details, do not ask if they want them');
  }
  
  if (memory.offeredItems.includes('tesla_watchlist') && memory.customerAgreements.includes('general_agreement')) {
    guidance.push('CUSTOMER ALREADY AGREED TO TESLA WATCHLIST - Confirm process, do not re-offer');
  }
  
  // Business hours guidance
  if (!businessHours.isOpen) {
    guidance.push(`DEALERSHIP IS CLOSED - Current hours: ${businessHours.hours.start}-${businessHours.hours.end}. Do not schedule appointments outside business hours.`);
  }
  
  // Inventory accuracy guidance
  if (inventoryValidation.warning === 'no_validated_inventory') {
    guidance.push('LIMITED INVENTORY - Be honest about current availability and offer alternatives.');
  }
  
  if (inventoryValidation.hasRealInventory && inventoryValidation.actualVehicles.length > 0) {
    const actualVehicles = inventoryValidation.actualVehicles.slice(0, 3).map(v => `${v.year} ${v.make} ${v.model}`).join(', ');
    guidance.push(`ACTUAL INVENTORY AVAILABLE: ${actualVehicles} and ${inventoryValidation.validatedCount - 3} more vehicles - Reference specific vehicles when relevant.`);
  }
  
  return guidance;
};
