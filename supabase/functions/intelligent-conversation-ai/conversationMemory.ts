
// Enhanced conversation memory to prevent redundancy
export const analyzeConversationMemory = (conversationHistory: string) => {
  const lines = conversationHistory.split('\n').filter(line => line.trim());
  const salesMessages = lines.filter(line => line.startsWith('Sales:'));
  const customerMessages = lines.filter(line => line.startsWith('Customer:'));
  
  // Track what has been offered/discussed
  const offeredItems = new Set<string>();
  const discussedTopics = new Set<string>();
  const customerRequests = new Set<string>();
  const customerAgreements = new Set<string>();
  
  // Analyze sales messages for offers
  salesMessages.forEach(msg => {
    const content = msg.replace('Sales:', '').trim().toLowerCase();
    
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
    
    // Track discussed topics
    if (content.includes('electric') || content.includes('ev')) {
      discussedTopics.add('electric_vehicles');
    }
    if (content.includes('tesla')) {
      discussedTopics.add('tesla');
    }
    if (content.includes('chevy') || content.includes('chevrolet')) {
      discussedTopics.add('chevrolet');
    }
  });
  
  // Analyze customer messages for requests and agreements
  customerMessages.forEach(msg => {
    const content = msg.replace('Customer:', '').trim().toLowerCase();
    
    // Track direct requests
    if (content.includes('details on') || content.includes('tell me about') || content.includes('information about')) {
      if (content.includes('chevy')) customerRequests.add('chevy_details');
      if (content.includes('tesla')) customerRequests.add('tesla_details');
      if (content.includes('electric') || content.includes('ev')) customerRequests.add('ev_details');
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
    lastCustomerMessage: customerMessages[customerMessages.length - 1] || ''
  };
};

// Generate context-aware guidance
export const generateConversationGuidance = (memory: any, inventoryValidation: any, businessHours: any) => {
  const guidance = [];
  
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
  if (inventoryValidation.warning === 'no_evs_available') {
    guidance.push('NO ELECTRIC VEHICLES IN INVENTORY - Do not claim to have Bolt, Equinox EV, or other electric vehicles. Be honest about availability.');
  }
  
  if (inventoryValidation.isEVRequest && inventoryValidation.actualVehicles.length > 0) {
    const actualEVs = inventoryValidation.actualVehicles.map(v => `${v.year} ${v.make} ${v.model}`).join(', ');
    guidance.push(`ACTUAL EV INVENTORY: ${actualEVs} - Only mention vehicles that actually exist.`);
  }
  
  return guidance;
};
