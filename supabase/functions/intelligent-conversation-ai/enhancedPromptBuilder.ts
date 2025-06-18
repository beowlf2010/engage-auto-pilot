
import { analyzeAppointmentIntent, generateAppointmentFollowUp } from './appointmentIntentAnalysis.ts';
import { analyzeTradeIntent, generateTradeFollowUp } from './tradeIntentAnalysis.ts';
import { analyzeCustomerIntent, generateAnswerGuidance, needsConversationRepair } from './enhancedIntentAnalysis.ts';

// Enhanced prompt builder that ENFORCES answering customer questions FIRST
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
  // Analyze customer intent and questions - CRITICAL FOR RESPONSE QUALITY
  const customerIntent = analyzeCustomerIntent(conversationHistory, lastCustomerMessage);
  const answerGuidance = generateAnswerGuidance(customerIntent, inventoryStatus);
  const needsRepair = needsConversationRepair(customerIntent);
  
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
- Inventory Validated: ${inventoryStatus.strictMode ? 'STRICT MODE' : 'NORMAL'}
${inventoryStatus.inventoryWarning ? `⚠️ ${inventoryStatus.inventoryWarning}` : ''}
${!inventoryStatus.hasActualInventory ? '🚨 NO MATCHING INVENTORY - BE COMPLETELY HONEST' : ''}`;

  // Add CRITICAL customer question analysis with enforcement
  if (customerIntent.requiresDirectAnswer) {
    systemPrompt += `

🚨🚨🚨 CRITICAL CUSTOMER QUESTION ANALYSIS 🚨🚨🚨:
- Direct Question Detected: ${customerIntent.isDirectQuestion ? 'YES' : 'NO'}
- Inventory Question: ${customerIntent.isInventoryQuestion ? 'YES - MUST ADDRESS AVAILABILITY' : 'NO'}
- Question Types: ${customerIntent.questionTypes.join(', ')}
- Question Topic: ${customerIntent.questionTopic || 'general'}
- Customer Frustrated: ${customerIntent.showingFrustration ? 'YES - URGENT' : 'NO'}
- Previous Response Off-Topic: ${customerIntent.salesWasOffTopic ? 'YES - REPAIR NEEDED' : 'NO'}

🎯🎯🎯 MANDATORY RESPONSE REQUIREMENTS 🎯🎯🎯:
${answerGuidance ? `- MUST ANSWER FIRST: ${answerGuidance.specificGuidance}` : ''}
${needsRepair ? '- CONVERSATION REPAIR NEEDED: Acknowledge their question was missed' : ''}
- Response Structure: DIRECT ANSWER → Context → Call to Action
- DO NOT mention other vehicles until their question is FULLY answered
- DO NOT pivot to sales until you've completely addressed their concern
- BE COMPLETELY HONEST about inventory - NO FALSE CLAIMS`;
  }

  // Add inventory honesty enforcement
  if (!inventoryStatus.hasActualInventory) {
    systemPrompt += `

🚫🚫🚫 INVENTORY HONESTY ENFORCEMENT 🚫🚫🚫:
- YOU HAVE NO MATCHING INVENTORY
- DO NOT claim to have vehicles you don't have
- DO NOT mention "arriving soon" unless specifically confirmed
- BE HONEST: "We don't currently have that model in stock"
- OFFER: "Let me help you with similar options" or "I can notify you when one arrives"
- NEVER MAKE FALSE CLAIMS ABOUT AVAILABILITY`;
  }

  systemPrompt += `

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

  // Add answer-specific guidance with STRICT enforcement
  if (answerGuidance) {
    systemPrompt += `

🔥🔥🔥 ANSWER GUIDANCE (${answerGuidance.urgencyLevel.toUpperCase()} PRIORITY) 🔥🔥🔥:
${answerGuidance.specificGuidance}

MANDATORY RESPONSE STRUCTURE:
1. FIRST: Directly answer their ${answerGuidance.answerType} question
2. SECOND: Provide helpful additional context 
3. THIRD: Natural transition to sales opportunity (only if appropriate)
4. FOURTH: Clear call to action

${answerGuidance.urgencyLevel === 'high' ? '⚠️ HIGH PRIORITY: Customer is frustrated - acknowledge and fix immediately' : ''}
${customerIntent.isInventoryQuestion ? '🔍 INVENTORY QUESTION: Be completely honest about availability' : ''}`;
  }

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

CORE RESPONSE GUIDELINES:
1. Keep responses under 150 characters for SMS
2. ${customerIntent.requiresDirectAnswer ? '🚨 ANSWER THEIR QUESTION FIRST - MANDATORY' : 'Be conversational and helpful, not pushy'}
3. ${appointmentIntent.hasAppointmentIntent ? 'PRIORITIZE appointment scheduling opportunities' : 'Focus on building rapport and understanding needs'}
4. ${tradeIntent.hasTradeIntent ? 'ACKNOWLEDGE trade interest and offer assistance' : 'Listen for trade opportunities'}
5. ${businessHours.isOpen ? 'Offer immediate assistance and scheduling' : 'Acknowledge after-hours contact and offer next-day follow-up'}
6. Always provide value in every message
7. ${inventoryStatus.hasActualInventory ? 'Reference ONLY actual available inventory' : 'BE COMPLETELY HONEST about inventory limitations - NO FALSE CLAIMS'}

${customerIntent.requiresDirectAnswer ? `
🔥🔥🔥 QUESTION ANSWERING IS MANDATORY! 🔥🔥🔥
The customer asked a ${customerIntent.primaryQuestionType} question about ${customerIntent.questionTopic || 'vehicles'}.
- You MUST answer this specific question FIRST and COMPLETELY
- DO NOT mention other vehicles until their question is answered
- DO NOT pivot to sales topics until you've addressed their concern
- Structure: Direct Answer → Context → Sales Transition → Action
${needsRepair ? '- Acknowledge that their previous question may have been missed' : ''}
${customerIntent.isInventoryQuestion ? '- BE COMPLETELY HONEST about what inventory is actually available' : ''}
` : ''}

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

CONVERSATION STYLE: Professional yet friendly, ANSWER QUESTIONS DIRECTLY, natural flow, honest about inventory.`;

  return {
    systemPrompt,
    customerIntent,
    answerGuidance,
    appointmentIntent,
    appointmentFollowUp,
    tradeIntent,
    tradeFollowUp,
    requestedCategory: inventoryStatus.requestedCategory || { category: 'general' }
  };
};

// Enhanced user prompt that emphasizes answering customer questions
export const buildEnhancedUserPrompt = (
  lastCustomerMessage: string,
  conversationHistory: string,
  requestedCategory: any,
  conversationContext: any,
  conversationMemory: any,
  conversationGuidance: any,
  customerIntent?: any,
  answerGuidance?: any,
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

  // Add CRITICAL question answering context with strict requirements
  if (customerIntent?.requiresDirectAnswer && answerGuidance) {
    userPrompt += `

🚨🚨🚨 QUESTION ANSWERING PRIORITY (MANDATORY) 🚨🚨🚨:
- Question Type: ${customerIntent.primaryQuestionType}
- Question Topic: ${customerIntent.questionTopic || 'general'}
- Must Answer First: ${answerGuidance.specificGuidance}
- Customer Frustrated: ${customerIntent.showingFrustration ? 'YES' : 'NO'}
- Inventory Question: ${customerIntent.isInventoryQuestion ? 'YES - BE HONEST' : 'NO'}
- Conversation Repair Needed: ${customerIntent.conversationContext?.hasBeenIgnored ? 'YES' : 'NO'}

CRITICAL: You MUST address their specific ${customerIntent.primaryQuestionType} question about ${customerIntent.questionTopic || 'vehicles'} before ANY sales content.
${customerIntent.isInventoryQuestion ? 'INVENTORY HONESTY: Be completely truthful about what is actually available.' : ''}`;
  }

  if (appointmentIntent?.hasAppointmentIntent) {
    userPrompt += `

🎯 APPOINTMENT CONTEXT:
- Intent Confidence: ${(appointmentIntent.confidence * 100).toFixed(0)}%
- Suggested Type: ${appointmentIntent.suggestedAppointmentType}
- Customer Urgency: ${appointmentIntent.urgency}
- Should Suggest Scheduling: ${appointmentIntent.shouldSuggestScheduling ? 'YES' : 'NO'}

${customerIntent?.requiresDirectAnswer ? 'PRIORITY: Answer their question first, then address appointment interest.' : 'PRIORITY: Address the appointment interest naturally while providing helpful information.'}`;
  }

  if (tradeIntent?.hasTradeIntent) {
    userPrompt += `

🚗 TRADE CONTEXT:
- Intent Confidence: ${(tradeIntent.confidence * 100).toFixed(0)}%
- Trade Type: ${tradeIntent.tradeType}
- Customer Urgency: ${tradeIntent.urgency}
- Should Offer Appraisal: ${tradeIntent.shouldOfferAppraisal ? 'YES' : 'NO'}
${Object.keys(tradeIntent.detectedVehicleInfo).length > 0 ? `- Vehicle Details: ${JSON.stringify(tradeIntent.detectedVehicleInfo)}` : ''}

${customerIntent?.requiresDirectAnswer ? 'PRIORITY: Answer their question first, then acknowledge trade interest.' : 'PRIORITY: Acknowledge trade interest and offer valuable assistance.'}`;
  }

  userPrompt += `

Generate a helpful response that ${customerIntent?.requiresDirectAnswer ? 'FIRST answers their specific question completely, then' : ''} moves the conversation forward naturally.
${customerIntent?.isInventoryQuestion ? 'BE COMPLETELY HONEST about inventory availability.' : ''}
${customerIntent?.requiresDirectAnswer ? 'MANDATORY: Address their question before any sales content.' : ''}`;

  return userPrompt;
};
