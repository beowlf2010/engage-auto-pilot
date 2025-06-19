import { analyzeCustomerIntent, generateAnswerGuidance, needsConversationRepair } from './enhancedIntentAnalysis.ts';

// Enhanced prompt builder to create context-rich prompts for the OpenAI API
// This function takes lead information, conversation history, and inventory status as input
// and generates a system prompt and user prompt to guide the AI's response

export const buildEnhancedUserPrompt = (
  lastCustomerMessage: string,
  conversationHistory: string,
  requestedCategory: any,
  conversationContext: { isEstablishedConversation: boolean },
  conversationMemory: any,
  conversationGuidance: any,
  customerIntent: any,
  answerGuidance: any,
  appointmentIntent: any,
  tradeIntent: any
) => {
  let userPrompt = `The customer sent this message: "${lastCustomerMessage}"`;

  // Add conversation context
  if (conversationContext.isEstablishedConversation) {
    userPrompt += `

This is an ongoing conversation. Use the conversation history to provide relevant and helpful responses.`;
  } else {
    userPrompt += `

This is a new conversation. Introduce yourself and offer assistance.`;
  }

  // Add customer intent analysis
  if (customerIntent?.requiresDirectAnswer) {
    userPrompt += `

The customer is asking a direct question. Provide a clear and concise answer.`;
  }

  // Add appointment intent analysis
  if (appointmentIntent?.hasAppointmentIntent) {
    userPrompt += `

The customer is interested in scheduling an appointment. Offer available times and dates.`;
  }

  // Add trade intent analysis
  if (tradeIntent?.hasTradeIntent) {
    userPrompt += `

The customer is interested in trading in their current vehicle. Ask for details about their vehicle.`;
  }

  // Add conversation memory analysis
  if (conversationMemory?.topics?.length > 0) {
    userPrompt += `

The customer has shown interest in these topics: ${conversationMemory.topics.join(', ')}.`;
  }

  // Add conversation guidance
  if (conversationGuidance?.mustAnswerFirst) {
    userPrompt += `

You MUST answer the customer's question before moving on to other topics.`;
  }

  return userPrompt;
};

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
  const customerIntent = analyzeCustomerIntent(conversationHistory, lastCustomerMessage);
  const answerGuidance = generateAnswerGuidance(customerIntent, inventoryStatus);
  const needsRepair = needsConversationRepair(customerIntent);

  // Enhanced system prompt with refined conversation repair logic
  let systemPrompt = `You are Finn, a professional automotive sales assistant at Jason Pilger Chevrolet. You help customers find the right vehicle through genuine, helpful conversations.

CORE GUIDELINES:
- Be professional, friendly, and helpful
- Always be honest about inventory and availability
- Focus on understanding customer needs
- Provide accurate information about vehicles and services

CURRENT CONTEXT:
- Customer: ${leadName}
- Business Hours: ${businessHours.isOpen ? 'OPEN' : 'CLOSED'}
- Inventory Available: ${inventoryStatus.hasActualInventory ? 'YES' : 'LIMITED'}

CONVERSATION STAGE: ${conversationLength > 0 ? 'Ongoing conversation' : 'Initial contact'}`;

  // Only add conversation repair guidance when there's actual evidence of being ignored
  if (needsRepair && answerGuidance?.needsApology) {
    systemPrompt += `

⚠️ CONVERSATION REPAIR NEEDED:
- Customer has indicated their previous question was not addressed
- Acknowledge this oversight with a brief apology
- Then directly answer their current question
- Keep the apology short and focus on providing the answer they need`;
  }

  // Add answer guidance for direct questions
  if (answerGuidance && customerIntent.requiresDirectAnswer) {
    systemPrompt += `

CUSTOMER QUESTION GUIDANCE:
- Question Type: ${answerGuidance.answerType}
- Topic: ${customerIntent.questionTopic || 'general inquiry'}
- Required Response: ${answerGuidance.specificGuidance}
- Priority: Answer their question first, then engage naturally`;
  }

  // Add inventory context
  if (inventoryStatus.hasActualInventory) {
    systemPrompt += `

INVENTORY CONTEXT:
- Available vehicles: ${inventoryStatus.validatedCount}
- Can show specific matches for their request`;
  } else {
    systemPrompt += `

INVENTORY CONTEXT:
- Limited inventory for their specific request
- Focus on alternatives and future availability`;
  }

  systemPrompt += `

RESPONSE REQUIREMENTS:
- Keep responses under 160 characters for SMS
- Be conversational and natural
- Ask follow-up questions to understand their needs
- Suggest next steps when appropriate`;

  return {
    systemPrompt,
    customerIntent,
    answerGuidance,
    needsRepair,
  };
};
