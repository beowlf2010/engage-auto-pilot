
// Enhanced contextual prompt building with better awareness and specificity

import { EnhancedIntentAnalysis } from './enhancedIntentAnalysis.ts';

interface LeadGeographicData {
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
}

export const buildContextualPrompt = (
  leadName: string,
  vehicleInterest: string,
  customerMessage: string,
  conversationHistory: string,
  intentAnalysis: EnhancedIntentAnalysis,
  conversationMemory?: any,
  geoData?: LeadGeographicData
): {
  systemPrompt: string;
  userPrompt: string;
} => {
  const cleanVehicle = vehicleInterest.replace(/"/g, '').trim();
  const mentionedVehicle = intentAnalysis.customerContext.mentionedVehicle || cleanVehicle;

  // Check if we've already introduced ourselves
  const hasIntroduced = conversationMemory?.hasIntroduced || 
    conversationHistory.toLowerCase().includes('finn') ||
    conversationHistory.toLowerCase().includes('jason pilger');

  // Analyze geographic context for smart recommendations
  const isLocalCustomer = analyzeGeographicProximity(geoData);
  const locationContext = buildLocationContext(geoData, isLocalCustomer);

  // Build context-aware system prompt
  let systemPrompt = `You are Finn, a knowledgeable and friendly automotive sales professional at Jason Pilger Chevrolet. Your goal is to be genuinely helpful and build rapport with customers through natural, engaging conversation.

CUSTOMER CONTEXT:
- Customer: ${leadName}
- Vehicle Interest: ${mentionedVehicle}
- Intent: ${intentAnalysis.primaryIntent.toUpperCase()}
- Emotional Tone: ${intentAnalysis.customerContext.emotionalTone.toUpperCase()}
- Response Strategy: ${intentAnalysis.responseStrategy.toUpperCase()}
- Is Follow-up: ${intentAnalysis.customerContext.isFollowUp ? 'YES' : 'NO'}
- Already Introduced: ${hasIntroduced ? 'YES - Continue conversation naturally' : 'NO - Introduce yourself'}
${locationContext}

CONVERSATION PRINCIPLES:
- Always acknowledge what the customer specifically mentioned
- Be vehicle-specific in your responses
- Show genuine interest in their needs
- Ask thoughtful, relevant questions
- Never give generic "what can I help you with" responses when context is clear
- Build on the conversation naturally`;

  // Add intent-specific guidance
  switch (intentAnalysis.primaryIntent) {
    case 'vehicle_inquiry':
      systemPrompt += `

🚗 VEHICLE INQUIRY MODE:
- Acknowledge their specific interest in the ${mentionedVehicle}
- Highlight key benefits of this vehicle
- Ask about their specific needs or priorities
- Show enthusiasm for the vehicle they mentioned`;
      break;

    case 'expressing_interest':
      systemPrompt += `

💡 INTEREST EXPRESSION MODE:
- Validate their excellent choice
- Ask what drew them to this vehicle
- Uncover their specific needs and timeline
- Build excitement about the vehicle`;
      break;

    case 'asking_question':
      systemPrompt += `

❓ QUESTION RESPONSE MODE:
- Answer their question directly and thoroughly
- Provide specific, helpful information
- Ask follow-up questions to understand their needs better
- Offer additional relevant information`;
      break;

    case 'ready_to_buy':
      systemPrompt += `

🎯 BUYING INTENT MODE:
- Acknowledge their readiness to move forward
- Ask about their timeline and decision process
${isLocalCustomer.canVisit ? 
  '- Offer to schedule an appointment or test drive visit' : 
  '- Offer virtual consultation, detailed information, and delivery options'}
- Create natural urgency about next steps`;
      break;

    case 'test_drive_request':
      systemPrompt += `

🚗 TEST DRIVE REQUEST MODE:
${isLocalCustomer.canVisit ? 
  '- Great! Schedule a test drive appointment - they can visit the dealership' : 
  '- Explain that test drives require visiting the dealership, offer virtual tour and detailed specs instead'}
${isLocalCustomer.canVisit ? 
  '- Ask about their preferred time and availability' : 
  '- Suggest delivery options or regional dealer referrals if appropriate'}
- Focus on the driving experience and features of the ${mentionedVehicle}`;
      break;

    case 'objection':
      systemPrompt += `

⚠️ CONCERN ADDRESSING MODE:
- Acknowledge their concerns with empathy
- Ask clarifying questions to understand the real issue
- Provide helpful solutions or alternatives
- Focus on value and benefits`;
      break;
  }

  // Add tone-specific guidance
  if (intentAnalysis.customerContext.emotionalTone === 'excited') {
    systemPrompt += `

🎉 EXCITED CUSTOMER:
- Match their enthusiasm appropriately
- Build on their excitement
- Ask about what excites them most`;
  }

  systemPrompt += `

RESPONSE REQUIREMENTS:
- Keep under 160 characters for SMS
- Be specific about the ${mentionedVehicle}
- ${hasIntroduced ? 'NEVER re-introduce yourself' : 'Introduce yourself as Finn from Jason Pilger Chevrolet'}
- Ask engaging, specific questions
- Show you understand what they mentioned
- Be helpful and knowledgeable
${!isLocalCustomer.canVisit ? '- NEVER suggest test drives for distant customers - offer virtual tours, detailed specs, delivery options instead' : ''}
${isLocalCustomer.canVisit ? '- Test drives and dealership visits are appropriate for local customers' : ''}

FORBIDDEN RESPONSES:
- "Could you let me know what specific questions you have"
- "What would be most helpful for me to cover"
- "Let me know if you need anything"
- Any generic response that ignores what they specifically said
- Re-introducing yourself if already done`;

  // Build contextual user prompt
  let userPrompt = `Customer's message: "${customerMessage}"

INTENT ANALYSIS:
- Primary Intent: ${intentAnalysis.primaryIntent}
- Mentioned Vehicle: ${mentionedVehicle}
- Emotional Tone: ${intentAnalysis.customerContext.emotionalTone}
- Confidence: ${(intentAnalysis.confidence * 100).toFixed(0)}%

CONVERSATION CONTEXT:
${conversationHistory}`;

  if (intentAnalysis.suggestedResponse) {
    userPrompt += `

SUGGESTED RESPONSE APPROACH:
"${intentAnalysis.suggestedResponse}"

Use this as inspiration but ensure your response feels natural and matches the conversational tone.`;
  }

  userPrompt += `

OBJECTIVE: Generate a specific, contextually relevant response that acknowledges what ${leadName} specifically mentioned about the ${mentionedVehicle} and moves the conversation forward helpfully.`;

  return { systemPrompt, userPrompt };
};

// Geographic analysis helper functions
const analyzeGeographicProximity = (geoData?: LeadGeographicData) => {
const dealershipLocation = {
    city: 'Atmore',
    state: 'AL',
    zipCode: '36502'
  };

  if (!geoData?.state || !geoData?.city) {
    return {
      canVisit: false,
      distance: 'unknown',
      reason: 'location_unknown'
    };
  }

  // Check if customer is in Alabama (likely within driving distance)
  const isInAlabama = geoData.state?.toLowerCase().includes('al') || 
                      geoData.state?.toLowerCase().includes('alabama');

  // Check if customer is in neighboring states (could be reasonable)
  const neighboringStates = ['fl', 'florida', 'ga', 'georgia', 'tn', 'tennessee', 'ms', 'mississippi'];
  const isNeighboringState = neighboringStates.some(state => 
    geoData.state?.toLowerCase().includes(state)
  );

  // Check if customer is in Atmore area specifically
  const isLocalArea = isInAlabama && (
    geoData.city?.toLowerCase().includes('atmore') ||
    geoData.city?.toLowerCase().includes('mobile') ||
    geoData.city?.toLowerCase().includes('bay minette') ||
    geoData.city?.toLowerCase().includes('brewton')
  );

  if (isLocalArea) {
    return {
      canVisit: true,
      distance: 'local',
      reason: 'same_city_area'
    };
    } else if (isInAlabama) {
    return {
      canVisit: true,
      distance: 'regional',
      reason: 'same_state'
    };
  } else if (isNeighboringState) {
    return {
      canVisit: false,
      distance: 'distant',
      reason: 'neighboring_state'
    };
  } else {
    return {
      canVisit: false,
      distance: 'very_distant',
      reason: 'out_of_region'
    };
  }
};

const buildLocationContext = (geoData?: LeadGeographicData, proximityInfo?: any) => {
  if (!geoData?.city || !geoData?.state) {
    return `
- Customer Location: Unknown
- Visit Feasibility: Offer virtual consultation and delivery options`;
  }

  const location = `${geoData.city}, ${geoData.state}`;
  
  switch (proximityInfo?.reason) {
    case 'same_city_area':
      return `
- Customer Location: ${location} (LOCAL - Perfect for dealership visits!)
- Visit Feasibility: Test drives and in-person appointments highly recommended`;
    
    case 'same_state':
      return `
- Customer Location: ${location} (REGIONAL - Alabama customer)
- Visit Feasibility: Can offer test drives and appointments with reasonable travel`;
    
    case 'neighboring_state':
      return `
- Customer Location: ${location} (DISTANT - Neighboring state)
- Visit Feasibility: Focus on virtual consultation, detailed specs, delivery options`;
    
    case 'out_of_region':
      return `
- Customer Location: ${location} (REMOTE - Long distance customer)
- Visit Feasibility: Virtual consultation only, shipping/delivery options, regional dealer referrals`;
    
    default:
      return `
- Customer Location: ${location}
- Visit Feasibility: Assess based on customer's travel preferences`;
  }
};
