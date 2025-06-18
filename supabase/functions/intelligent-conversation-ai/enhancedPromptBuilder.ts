
import { analyzeAppointmentIntent, generateAppointmentFollowUp } from './appointmentIntentAnalysis.ts';

// Enhanced prompt builder that includes appointment intent analysis
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
${appointmentIntent.timePreferences.timePreferences.length > 0 ? `- Time Preferences: ${appointmentIntent.timePreferences.timePreferences.join(', ')}` : ''}`;

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

  systemPrompt += `

RESPONSE GUIDELINES:
1. Keep responses under 150 characters for SMS
2. Be conversational and helpful, not pushy
3. ${appointmentIntent.hasAppointmentIntent ? 'PRIORITIZE appointment scheduling opportunities' : 'Focus on building rapport and understanding needs'}
4. ${businessHours.isOpen ? 'Offer immediate assistance and scheduling' : 'Acknowledge after-hours contact and offer next-day follow-up'}
5. Always provide value in every message

${appointmentIntent.hasAppointmentIntent ? `
🔥 APPOINTMENT OPPORTUNITY DETECTED!
- Proactively offer to schedule ${appointmentIntent.suggestedAppointmentType}
- Accommodate their timing preferences if mentioned
- Make scheduling feel easy and natural
- Suggest specific next steps
` : ''}

CONVERSATION STYLE: Professional yet friendly, focus on customer needs, natural flow.`;

  return {
    systemPrompt,
    appointmentIntent,
    appointmentFollowUp,
    requestedCategory: inventoryStatus.requestedCategory || { category: 'general' }
  };
};

// Enhanced user prompt that considers appointment context
export const buildEnhancedUserPrompt = (
  lastCustomerMessage: string,
  conversationHistory: string,
  requestedCategory: any,
  conversationContext: any,
  conversationMemory: any,
  conversationGuidance: any,
  appointmentIntent?: any
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

  userPrompt += `

Generate a helpful response that moves the conversation forward naturally.`;

  return userPrompt;
};
