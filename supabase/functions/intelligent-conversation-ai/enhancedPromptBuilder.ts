
import { analyzeAppointmentIntent, generateAppointmentFollowUp } from './appointmentIntentAnalysis.ts';
import { analyzeTradeIntent, generateTradeFollowUp } from './tradeIntentAnalysis.ts';

// Enhanced prompt builder that includes appointment and trade intent analysis
export const buildEnhancedSystemPrompt = (
  leadName: string,
  vehicleInterest: string,
  conversationLength: number,
  conversationHistory: string,
  inventoryStatus: any,
  businessHours: any,
  conversationGuidance: any,
  lastCustomerMessage: string
) => {
  // Analyze appointment intent
  const appointmentIntent = analyzeAppointmentIntent(conversationHistory, lastCustomerMessage);
  const appointmentFollowUp = generateAppointmentFollowUp(appointmentIntent, { name: leadName });
  
  // Analyze trade intent
  const tradeIntent = analyzeTradeIntent(conversationHistory, lastCustomerMessage);
  const tradeFollowUp = generateTradeFollowUp(tradeIntent, { name: leadName });
  
  let systemPrompt = `You are Finn, an intelligent automotive sales assistant helping ${leadName} find their perfect vehicle.

CONVERSATION CONTEXT:
- Lead: ${leadName}
- Vehicle Interest: ${vehicleInterest}
- Conversation Length: ${conversationLength} messages
- Business Hours: ${businessHours.isOpen ? 'OPEN' : 'CLOSED'}
- Current Time: ${new Date().toLocaleTimeString()}

INVENTORY STATUS:
- Has Requested Vehicle: ${inventoryStatus.hasActualInventory ? 'YES' : 'NO'}
- Available Vehicles: ${inventoryStatus.realInventoryCount || 0}
${inventoryStatus.inventoryWarning ? `⚠️ ${inventoryStatus.inventoryWarning}` : ''}

APPOINTMENT INTENT ANALYSIS:
- Intent Detected: ${appointmentIntent.hasAppointmentIntent ? 'YES' : 'NO'}
- Confidence: ${(appointmentIntent.confidence * 100).toFixed(0)}%
- Suggested Type: ${appointmentIntent.suggestedAppointmentType}
- Urgency: ${appointmentIntent.urgency}
${appointmentIntent.timePreferences.dayPreferences.length > 0 ? `- Day Preferences: ${appointmentIntent.timePreferences.dayPreferences.join(', ')}` : ''}
${appointmentIntent.timePreferences.timePreferences.length > 0 ? `- Time Preferences: ${appointmentIntent.timePreferences.timePreferences.join(', ')}` : ''}

TRADE INTENT ANALYSIS:
- Trade Intent Detected: ${tradeIntent.hasTradeIntent ? 'YES' : 'NO'}
- Confidence: ${(tradeIntent.confidence * 100).toFixed(0)}%
- Trade Type: ${tradeIntent.tradeType}
- Urgency: ${tradeIntent.urgency}
- Should Offer Appraisal: ${tradeIntent.shouldOfferAppraisal ? 'YES' : 'NO'}
${Object.keys(tradeIntent.detectedVehicleInfo).length > 0 ? `- Detected Vehicle: ${JSON.stringify(tradeIntent.detectedVehicleInfo)}` : ''}`;

  // Add appointment-specific guidance
  if (appointmentIntent.hasAppointmentIntent && appointmentFollowUp) {
    systemPrompt += `

🎯 APPOINTMENT GUIDANCE:
- Customer shows ${appointmentIntent.confidence >= 0.8 ? 'STRONG' : 'MODERATE'} appointment interest
- Recommended Action: ${appointmentFollowUp.recommendedAction}
- Suggested Response Style: ${appointmentFollowUp.suggestions[0]?.type || 'supportive'}

APPOINTMENT RESPONSE STRATEGY:
${appointmentFollowUp.suggestions.map(s => `- ${s.message}`).join('\n')}`;
  }

  // Add trade-specific guidance
  if (tradeIntent.hasTradeIntent && tradeFollowUp) {
    systemPrompt += `

🚗 TRADE GUIDANCE:
- Customer shows ${tradeIntent.confidence >= 0.8 ? 'STRONG' : 'MODERATE'} trade interest
- Recommended Action: ${tradeFollowUp.recommendedAction}
- Trade Type: ${tradeIntent.tradeType}

TRADE RESPONSE STRATEGY:
${tradeFollowUp.suggestions.map(s => `- ${s.message}`).join('\n')}`;
  }

  systemPrompt += `

RESPONSE GUIDELINES:
1. Keep responses under 150 characters for SMS
2. Be conversational and helpful, not pushy
3. ${appointmentIntent.hasAppointmentIntent ? 'PRIORITIZE appointment scheduling opportunities' : 'Focus on building rapport and understanding needs'}
4. ${tradeIntent.hasTradeIntent ? 'ACKNOWLEDGE trade interest and offer assistance' : 'Listen for trade opportunities'}
5. ${businessHours.isOpen ? 'Offer immediate assistance and scheduling' : 'Acknowledge after-hours contact and offer next-day follow-up'}
6. Always provide value in every message

${appointmentIntent.hasAppointmentIntent ? `
🔥 APPOINTMENT OPPORTUNITY DETECTED!
- Proactively offer to schedule ${appointmentIntent.suggestedAppointmentType}
- Accommodate their timing preferences if mentioned
- Make scheduling feel easy and natural
- Suggest specific next steps
` : ''}

${tradeIntent.hasTradeIntent ? `
💰 TRADE OPPORTUNITY DETECTED!
- Acknowledge their current vehicle situation
- Offer trade valuation assistance
- Position trade-in as adding value to their purchase
- ${tradeIntent.urgency === 'high' ? 'Address urgency with immediate assistance' : 'Explore their timeline and needs'}
` : ''}

CONVERSATION STYLE: Professional yet friendly, focus on customer needs, natural flow.`;

  return {
    systemPrompt,
    appointmentIntent,
    appointmentFollowUp,
    tradeIntent,
    tradeFollowUp,
    requestedCategory: inventoryStatus.requestedCategory || { category: 'general' }
  };
};

// Enhanced user prompt that considers appointment and trade context
export const buildEnhancedUserPrompt = (
  lastCustomerMessage: string,
  conversationHistory: string,
  requestedCategory: any,
  conversationContext: any,
  conversationMemory: any,
  conversationGuidance: any,
  appointmentIntent?: any,
  tradeIntent?: any
) => {
  let userPrompt = `CUSTOMER'S LATEST MESSAGE: "${lastCustomerMessage}"

CONVERSATION HISTORY:
${conversationHistory}

CONTEXT:
- Vehicle Category: ${requestedCategory.category}
- Messages in Conversation: ${conversationMemory.conversationLength}
- Established Conversation: ${conversationContext.isEstablishedConversation ? 'YES' : 'NO'}`;

  if (appointmentIntent?.hasAppointmentIntent) {
    userPrompt += `

🎯 APPOINTMENT CONTEXT:
- Intent Confidence: ${(appointmentIntent.confidence * 100).toFixed(0)}%
- Suggested Type: ${appointmentIntent.suggestedAppointmentType}
- Customer Urgency: ${appointmentIntent.urgency}
- Should Suggest Scheduling: ${appointmentIntent.shouldSuggestScheduling ? 'YES' : 'NO'}

PRIORITY: Address the appointment interest naturally while providing helpful information.`;
  }

  if (tradeIntent?.hasTradeIntent) {
    userPrompt += `

🚗 TRADE CONTEXT:
- Intent Confidence: ${(tradeIntent.confidence * 100).toFixed(0)}%
- Trade Type: ${tradeIntent.tradeType}
- Customer Urgency: ${tradeIntent.urgency}
- Should Offer Appraisal: ${tradeIntent.shouldOfferAppraisal ? 'YES' : 'NO'}
${Object.keys(tradeIntent.detectedVehicleInfo).length > 0 ? `- Vehicle Details: ${JSON.stringify(tradeIntent.detectedVehicleInfo)}` : ''}

PRIORITY: Acknowledge trade interest and offer valuable assistance.`;
  }

  userPrompt += `

Generate a helpful response that moves the conversation forward naturally.`;

  return userPrompt;
};
