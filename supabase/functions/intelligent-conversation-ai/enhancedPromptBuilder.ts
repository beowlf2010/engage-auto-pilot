
import { analyzeCustomerIntent, generateAnswerGuidance } from './enhancedIntentAnalysis.ts';
import { buildSalesProgressionPrompt } from './salesProgressionPrompts.ts';
import { analyzeConversationMemory } from './conversationMemory.ts';

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

  // ENHANCED: Add conversation continuity context with anti-introduction logic
  if (conversationContext.isEstablishedConversation && conversationMemory?.hasIntroduced) {
    userPrompt += `

CRITICAL CONVERSATION CONTINUITY: This is an ongoing conversation where you have ALREADY introduced yourself as Finn from Jason Pilger Chevrolet. 
DO NOT introduce yourself again. Continue naturally from the existing conversation flow. The customer knows who you are.`;
  } else if (conversationContext.isEstablishedConversation) {
    userPrompt += `

This is an ongoing conversation. Use the conversation history to provide relevant and helpful responses without redundant introductions.`;
  } else {
    userPrompt += `

This is a new conversation. Introduce yourself and offer assistance.`;
  }

  // ENHANCED: Detect customer confusion and provide repair guidance
  const confusionSignals = /\b(who is this|who are you|i don't know you|do i know you|have we talked)\b/i;
  if (confusionSignals.test(lastCustomerMessage) && conversationMemory?.hasIntroduced) {
    userPrompt += `

CONVERSATION REPAIR NEEDED: Customer seems confused about who you are despite previous introduction. 
Politely remind them: "This is Finn from Jason Pilger Chevrolet - we were discussing [topic from conversation history]."
Do NOT provide a full re-introduction, just a brief reminder and continue the conversation.`;
  }

  // NEW: Add objection handling guidance
  if (customerIntent?.needsObjectionHandling) {
    userPrompt += `

🚨 OBJECTION DETECTED: The customer is showing signs of ${customerIntent.detectedObjections.join(', ')}. 
You MUST address their underlying concern and ask probing questions to uncover the real objection.
Do NOT give weak responses like "let me know if you need anything" - this is a sales opportunity!`;
  }

  // Add customer intent analysis
  if (customerIntent?.requiresDirectAnswer) {
    userPrompt += `

The customer is asking a direct question. Provide a clear and concise answer, then move the conversation forward.`;
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

  // ENHANCED: Only add discussed topics if they were actually mentioned by the customer
  if (conversationMemory?.discussedTopics?.length > 0) {
    userPrompt += `

The customer has shown interest in these topics: ${conversationMemory.discussedTopics.join(', ')}.`;
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
  // CRITICAL: Analyze conversation memory to prevent re-introductions
  const conversationMemory = analyzeConversationMemory(conversationHistory);
  
  console.log('🧠 Conversation memory in prompt builder:', {
    hasIntroduced: conversationMemory.hasIntroduced,
    isEstablishedConversation: conversationMemory.isEstablishedConversation,
    lastSalesMessageType: conversationMemory.lastSalesMessageType
  });

  // NEW: Check if we should use sales progression system
  const shouldUseSalesProgression = conversationLength > 0 && lastCustomerMessage;
  
  if (shouldUseSalesProgression) {
    console.log('🎯 Using SALES PROGRESSION system for objection handling and forward movement');
    
    const salesPromptData = buildSalesProgressionPrompt(
      leadName,
      vehicleInterest,
      lastCustomerMessage,
      conversationHistory,
      inventoryStatus,
      conversationMemory
    );
    
    return {
      systemPrompt: salesPromptData.systemPrompt,
      customerIntent: { 
        requiresDirectAnswer: salesPromptData.objectionSignals.length > 0,
        objectionSignals: salesPromptData.objectionSignals,
        salesProgression: salesPromptData.salesProgression
      },
      answerGuidance: salesPromptData.suggestedResponse ? {
        specificGuidance: salesPromptData.suggestedResponse,
        salesProgression: true
      } : null,
      needsRepair: false,
      appointmentIntent: null,
      tradeIntent: null,
      requestedCategory: null
    };
  }

  // Fallback to original logic for initial contacts
  const customerIntent = analyzeCustomerIntent(conversationHistory, lastCustomerMessage);
  const answerGuidance = generateAnswerGuidance(customerIntent, inventoryStatus);

  // ENHANCED: Build conversation-aware system prompt
  let systemPrompt = `You are Finn, a professional automotive sales assistant at Jason Pilger Chevrolet. You help customers find the right vehicle through genuine, helpful conversations.

CORE GUIDELINES:
- Be professional, friendly, and helpful
- Always be honest about inventory and availability
- Focus on understanding customer needs
- Provide accurate information about vehicles and services
- Maintain natural conversation flow without redundant introductions
- NEVER mention vehicle types or categories not specifically mentioned by the customer

CURRENT CONTEXT:
- Customer: ${leadName}
- Business Hours: ${businessHours.isOpen ? 'OPEN' : 'CLOSED'}
- Inventory Available: ${inventoryStatus.hasActualInventory ? 'YES' : 'LIMITED'}
- Conversation Stage: ${conversationLength > 0 ? 'Ongoing conversation' : 'Initial contact'}`;

  // CRITICAL: Add conversation state awareness to prevent re-introductions
  if (conversationMemory.hasIntroduced && conversationMemory.isEstablishedConversation) {
    systemPrompt += `

🚨 CRITICAL CONVERSATION STATE:
- You have ALREADY introduced yourself to ${leadName} as Finn from Jason Pilger Chevrolet
- This is an ESTABLISHED conversation (${conversationMemory.salesMessageCount} previous exchanges)
- DO NOT introduce yourself again under any circumstances
- Continue the conversation naturally as if you know each other
- Reference previous conversation context when appropriate
- If customer seems confused, provide brief reminder, not full re-introduction`;
  } else if (conversationLength > 0) {
    systemPrompt += `

CONVERSATION CONTINUITY RULES:
- This is NOT the first message in this conversation
- Build on what has already been discussed
- Avoid starting with "Hi [Name]! I'm Finn..." if already introduced
- Continue the conversation flow naturally
- Reference previous exchanges when relevant`;
  }

  // CRITICAL: Add anti-hallucination guidance
  systemPrompt += `

CRITICAL - PREVENT TOPIC HALLUCINATION:
- ONLY mention vehicle types or categories that the customer has specifically mentioned
- Do NOT suggest electric vehicles, hybrids, or any vehicle type unless the customer asked about them
- Do NOT expand the conversation to topics not brought up by the customer
- Focus ONLY on what the customer actually said and requested
- If customer mentions a specific vehicle (like Trailblazer), stick to that vehicle type`;

  // ENHANCED: Add conversation guidance enforcement
  if (conversationGuidance && conversationGuidance.length > 0) {
    systemPrompt += `

CONVERSATION GUIDANCE (MUST FOLLOW):
${conversationGuidance.map(guidance => `- ${guidance}`).join('\n')}`;
  }

  // ENHANCED: Add conversation repair detection
  const confusionSignals = /\b(who is this|who are you|i don't know you|do i know you|have we talked)\b/i;
  if (confusionSignals.test(lastCustomerMessage) && conversationMemory.hasIntroduced) {
    systemPrompt += `

🔧 CONVERSATION REPAIR MODE:
- Customer seems confused about your identity despite previous introduction
- Provide BRIEF reminder: "This is Finn from Jason Pilger Chevrolet - we were discussing [relevant topic]"
- Do NOT provide full re-introduction
- Immediately continue with helpful response to their needs
- Keep the reminder short and transition quickly to assistance`;
  }

  // ENHANCED: Add towing safety guidelines
  systemPrompt += `

CRITICAL TOWING SAFETY RULES:
- NEVER make claims about towing capacity without verification
- NEVER suggest a vehicle can tow something unless you have confirmed specifications
- If customer asks about towing heavy equipment (like excavators, bulldozers), explain these require commercial transportation
- Always ask for specific weight and trailer requirements before making towing recommendations
- When in doubt about towing, say "I'd need to verify the specific towing requirements and vehicle capabilities"
- Heavy construction equipment requires specialized commercial transport, not passenger vehicles`;

  // Only add conversation repair guidance when there's actual evidence of being ignored
  if (answerGuidance?.needsApology && !conversationMemory.hasIntroduced) {
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
- Suggest next steps when appropriate
- Maintain conversation continuity and avoid redundant information
- NEVER mention vehicle types not specifically requested by the customer
- NEVER make unverified claims about towing capacity or vehicle capabilities
- RESPECT established conversation state and avoid re-introductions`;

  return {
    systemPrompt,
    customerIntent,
    answerGuidance,
    needsRepair: false,
    appointmentIntent: null,
    tradeIntent: null,
    requestedCategory: null
  };
};
