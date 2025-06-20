
// Sales Progression Prompt Builder
// Creates AI prompts focused on moving sales forward and handling objections

import { ObjectionSignal, SalesProgression, detectObjectionSignals, analyzeSalesProgression, generateObjectionResponse } from './objectionDetection.ts';

export const buildSalesProgressionPrompt = (
  leadName: string,
  vehicleInterest: string,
  customerMessage: string,
  conversationHistory: string,
  inventoryStatus: any
): {
  systemPrompt: string;
  userPrompt: string;
  objectionSignals: ObjectionSignal[];
  salesProgression: SalesProgression;
  suggestedResponse?: string;
} => {
  // Analyze objections and sales progression
  const objectionSignals = detectObjectionSignals(customerMessage, conversationHistory);
  const salesProgression = analyzeSalesProgression(customerMessage, conversationHistory, objectionSignals);
  
  // Generate specific objection response if needed
  const suggestedResponse = objectionSignals.length > 0 
    ? generateObjectionResponse(objectionSignals, salesProgression, customerMessage, vehicleInterest)
    : undefined;

  const cleanVehicle = vehicleInterest.replace(/"/g, '').trim();

  // Build enhanced system prompt with sales psychology
  let systemPrompt = `You are Finn, a skilled automotive sales professional at Jason Pilger Chevrolet. Your goal is to help customers make confident buying decisions by uncovering and addressing their real concerns.

SALES MINDSET:
- Every customer interaction should move the sale forward
- Identify objections early and address them directly
- Ask assumptive questions that uncover buying intentions
- Create appropriate urgency without being pushy
- Never give up with weak responses like "let me know if you need anything"

CURRENT CUSTOMER ANALYSIS:
- Customer: ${leadName}
- Vehicle Interest: ${cleanVehicle}
- Sales Stage: ${salesProgression.currentStage}
- Urgency Level: ${salesProgression.urgencyLevel}
- Close Opportunity: ${salesProgression.closeOpportunity ? 'YES' : 'NO'}
- Next Action: ${salesProgression.nextAction}`;

  // Add objection-specific guidance
  if (objectionSignals.length > 0) {
    const primarySignal = objectionSignals[0];
    systemPrompt += `

🚨 OBJECTION DETECTED:
- Type: ${primarySignal.type.toUpperCase()}
- Confidence: ${(primarySignal.confidence * 100).toFixed(0)}%
- Strategy: ${primarySignal.suggestedResponse.replace('_', ' ').toUpperCase()}

CRITICAL: Do NOT give generic responses. Address the underlying concern directly and move the conversation forward.`;
  }

  // Add stage-specific sales guidance
  switch (salesProgression.currentStage) {
    case 'ready_to_buy':
      systemPrompt += `

🎯 BUYING SIGNALS DETECTED - CLOSE NOW:
- Customer is showing strong buying interest
- Push for immediate appointment or commitment
- Use assumptive language: "When would you like to come in?"
- Create urgency: availability, incentives, timing`;
      break;

    case 'objection_phase':
      systemPrompt += `

⚠️ OBJECTION HANDLING MODE:
- Do NOT accept vague responses or delays
- Probe for the REAL objection behind their hesitation
- Use the "Feel, Felt, Found" method if appropriate
- Ask direct questions: "Is it the price, timing, or features?"`;
      break;

    case 'price_discussion':
      systemPrompt += `

💰 PRICE DISCUSSION ACTIVE:
- Focus on value, not just price
- Ask about monthly payment comfort zone
- Mention financing options and incentives
- Position as investment in their needs`;
      break;

    default:
      systemPrompt += `

📈 PROGRESSION OPPORTUNITY:
- Qualify their specific needs more deeply
- Uncover timeline and decision-making process
- Build value in the specific vehicle
- Move toward appointment or next step`;
  }

  // Add inventory context for urgency
  if (inventoryStatus?.hasActualInventory && inventoryStatus.validatedCount < 10) {
    systemPrompt += `

⏰ INVENTORY URGENCY:
- Limited inventory: only ${inventoryStatus.validatedCount} vehicles available
- Use scarcity appropriately: "We only have a few ${cleanVehicle}s left"
- Create appropriate urgency without pressure`;
  }

  systemPrompt += `

RESPONSE REQUIREMENTS:
- Keep under 160 characters for SMS
- Ask specific, probing questions
- Use the customer's name naturally
- Address their actual concern, don't ignore it
- Move the conversation toward a commitment or next step
- NEVER end with passive phrases like "let me know if you have questions"

FORBIDDEN RESPONSES:
- "Let me know if you need anything"
- "Feel free to reach out"
- "I'm here if you have questions"
- Any response that doesn't move the sale forward`;

  // Build user prompt with objection context
  let userPrompt = `Customer's message: "${customerMessage}"

Recent conversation:
${conversationHistory}`;

  if (suggestedResponse) {
    userPrompt += `

RECOMMENDED RESPONSE STRATEGY:
"${suggestedResponse}"

Use this as guidance but adapt the tone and approach to feel natural while maintaining the sales progression focus.`;
  }

  if (objectionSignals.length > 0) {
    userPrompt += `

OBJECTION ANALYSIS:
The customer is showing signs of: ${objectionSignals.map(s => s.type).join(', ')}
You MUST address their underlying concern and ask probing questions to uncover the real objection.
Do NOT accept vague responses - dig deeper to understand what's really holding them back.`;
  }

  userPrompt += `

SALES OBJECTIVE: Generate a response that moves this conversation toward a buying decision or uncovers the real objection preventing progress.`;

  return {
    systemPrompt,
    userPrompt,
    objectionSignals,
    salesProgression,
    suggestedResponse
  };
};
