
import { classifyVehicle } from './vehicleClassification.ts';
import { analyzeConversationPattern } from './conversationAnalysis.ts';
import { analyzeCustomerIntent, generateFollowUpContent, detectRedundantPatterns } from './intentAnalysis.ts';

export const buildSystemPrompt = (
  leadName: string,
  vehicleInterest: string,
  conversationLength: number,
  conversationHistory: string,
  inventoryStatus: any,
  businessHours?: any,
  conversationGuidance?: string[]
) => {
  // Classify the customer's vehicle interest with new/used awareness
  const requestedCategory = classifyVehicle(vehicleInterest || '');
  const conversationPattern = analyzeConversationPattern(conversationHistory || '');

  let systemPrompt = `You are Finn, a professional automotive sales assistant. Your goal is to be helpful, honest, and build trust through transparency.

CRITICAL RULES:
- Keep messages under 160 characters for SMS
- Be conversational and personable, not pushy or salesy
- ALWAYS be completely honest about inventory - never mislead customers
- DO NOT use generic greetings if this is an established conversation
- Focus on the customer's actual question or concern
- If we don't have what they want, acknowledge it directly and offer helpful alternatives
- NEVER repeat questions the customer has already answered positively
- NEVER ask the same question twice in a row
- If customer shows interest in something, provide that information instead of asking again
- If customer makes a direct request, fulfill it immediately without asking if they want it

Customer Information:
- Name: ${leadName}
- Original Interest: ${vehicleInterest}
- Vehicle Category: ${requestedCategory.category}
- Condition Interest: ${requestedCategory.condition}
- Conversation Length: ${conversationLength} messages
- Established Conversation: ${conversationPattern.isEstablishedConversation}

CONVERSATION CONTEXT ANALYSIS:
- Customer Messages: ${conversationPattern.customerMessageCount}
- Sales Messages: ${conversationPattern.salesMessageCount}
- Has Repetitive Greeting: ${conversationPattern.hasRepetitiveGreeting}

${conversationPattern.hasRepetitiveGreeting ? 
  'WARNING: Avoid repetitive greetings! This customer has already been greeted multiple times.' : 
  ''
}`;

  // Add business hours constraints
  if (businessHours && !businessHours.isOpen) {
    systemPrompt += `\n\n🚨 BUSINESS HOURS CONSTRAINT:
- WE ARE CURRENTLY CLOSED (Hours: ${businessHours.hours.start} - ${businessHours.hours.end} ${businessHours.hours.timezone})
- DO NOT schedule appointments outside business hours
- Suggest times within our operating hours only
- Be transparent about our operating schedule`;
  }

  // Add conversation guidance
  if (conversationGuidance && conversationGuidance.length > 0) {
    systemPrompt += `\n\n🎯 CONVERSATION GUIDANCE:
${conversationGuidance.join('\n')}`;
  }

  // Enhanced inventory analysis with real validation
  systemPrompt += `\n\nREAL INVENTORY ANALYSIS:`;

  if (inventoryStatus?.inventoryWarning === 'no_evs_available') {
    systemPrompt += `\n❌ CRITICAL: NO ELECTRIC VEHICLES IN INVENTORY
- We have ZERO electric or hybrid vehicles available
- Do NOT mention having Bolt, Equinox EV, or any electric vehicles
- Be completely honest about this limitation
- Offer to watch for electric vehicles that come in`;
  } else if (inventoryStatus?.actualVehicles && inventoryStatus.actualVehicles.length > 0) {
    systemPrompt += `\n✅ ACTUAL AVAILABLE VEHICLES (${inventoryStatus.actualVehicles.length} total):
${inventoryStatus.actualVehicles.slice(0, 5).map(v => `- ${v.year} ${v.make} ${v.model} ${v.fuel_type ? `(${v.fuel_type})` : ''} - $${v.price?.toLocaleString() || 'Price TBD'}`).join('\n')}
- ONLY mention vehicles from this verified list
- Do NOT make up or assume we have other vehicles`;
  }

  // Enhanced Tesla-specific handling with new/used logic
  if (requestedCategory.isTesla) {
    if (requestedCategory.condition === 'new') {
      systemPrompt += `\n❌ IMPORTANT: WE DO NOT SELL NEW TESLA VEHICLES
- Tesla only sells new vehicles through their own stores and website
- We are not a Tesla dealership for new vehicles
- Be honest about this limitation
- Offer to help with other new electric vehicles if they're interested in EVs`;
    } else if (requestedCategory.condition === 'used') {
      const teslaInInventory = inventoryStatus?.actualVehicles?.filter(v => 
        v.make.toLowerCase().includes('tesla')
      ) || [];
      
      if (teslaInInventory.length > 0) {
        systemPrompt += `\n✅ WE HAVE USED TESLA VEHICLES:
${teslaInInventory.map(v => `- ${v.year} ${v.make} ${v.model} - $${v.price?.toLocaleString()}`).join('\n')}`;
      } else {
        systemPrompt += `\n❌ WE DO NOT CURRENTLY HAVE USED TESLA VEHICLES IN STOCK.
- We can sell used Teslas when we get them as trade-ins
- I'd be happy to keep an eye out for Tesla trade-ins for you
- Would you like me to notify you when we get used Teslas in?`;
      }
    }
  }

  // Add conversation-specific guidance
  if (conversationPattern.isEstablishedConversation) {
    systemPrompt += `\n\nCONVERSATION GUIDANCE:
- This is an ongoing conversation - DO NOT use generic greetings
- Address their specific question or concern directly
- Build on what's already been discussed
- Be helpful and move the conversation forward`;
  }

  return { systemPrompt, requestedCategory };
};

export const buildUserPrompt = (
  lastCustomerMessage: string,
  conversationHistory: string,
  requestedCategory: any,
  conversationPattern: any,
  conversationMemory?: any,
  conversationGuidance?: string[]
) => {
  // Analyze customer intent to understand what they're asking for
  const intentAnalysis = analyzeCustomerIntent(conversationHistory, lastCustomerMessage);
  const followUpContent = generateFollowUpContent(intentAnalysis, requestedCategory);
  const redundancyCheck = detectRedundantPatterns(conversationHistory);

  let promptInstructions = `Customer's latest message: "${lastCustomerMessage}"

Recent conversation context:
${conversationHistory}

INTENT ANALYSIS RESULTS:
- Primary Intent: ${intentAnalysis.primaryIntent}
- Is Direct Request: ${intentAnalysis.isDirectRequest}
- Requested Topic: ${intentAnalysis.requestedTopic || 'none'}
- Is Affirmative Response: ${intentAnalysis.isAffirmativeResponse}
- Should Provide Information: ${intentAnalysis.shouldProvideInformation}`;

  // Add conversation memory insights
  if (conversationMemory) {
    promptInstructions += `\n\nCONVERSATION MEMORY:
- Previously offered: ${conversationMemory.offeredItems.join(', ') || 'nothing'}
- Customer requested: ${conversationMemory.customerRequests.join(', ') || 'nothing'}
- Customer agreed to: ${conversationMemory.customerAgreements.join(', ') || 'nothing'}
- Topics discussed: ${conversationMemory.discussedTopics.join(', ') || 'none'}`;
  }

  // Add specific guidance warnings
  if (conversationGuidance && conversationGuidance.length > 0) {
    promptInstructions += `\n\n🚨 CRITICAL GUIDANCE:
${conversationGuidance.join('\n')}`;
  }

  // Add specific instructions based on intent analysis
  if (intentAnalysis.primaryIntent === 'direct_request') {
    promptInstructions += `\n\nCUSTOMER MADE A DIRECT REQUEST:
- They asked for: "${intentAnalysis.requestedTopic}"
- PROVIDE the requested information immediately
- DO NOT ask if they want the information - they already requested it
- DO NOT repeat offers or ask redundant questions`;
  } else if (intentAnalysis.primaryIntent === 'agreement' && followUpContent) {
    promptInstructions += `\n\nCUSTOMER AGREED TO SOMETHING:
- They agreed to: ${followUpContent.context}
- FOLLOW UP ACTION REQUIRED: ${followUpContent.instruction}
- DO NOT ask the same question again - provide what was agreed upon`;
  }

  // Add redundancy warnings
  if (redundancyCheck.hasRepeatedOffers) {
    promptInstructions += `\n\nWARNING: REDUNDANT PATTERN DETECTED
- You have been repeating similar offers/questions
- STOP asking the same questions
- Move the conversation forward with new information or next steps`;
  }

  promptInstructions += `\n\nGenerate a response that:
1. ${conversationPattern.isEstablishedConversation ? 
     'Continues the conversation naturally (NO generic greetings)' : 
     'Provides a warm, professional greeting'
   }
2. ${intentAnalysis.shouldProvideInformation ? 
     'Provides the specific information requested or agreed upon' : 
     'Directly and honestly addresses their question'
   }
3. ONLY mentions vehicles that actually exist in our verified inventory
4. Respects business hours when scheduling appointments
5. ${intentAnalysis.shouldProvideInformation ? 
     'Moves to next logical step after providing information' : 
     'Offers genuinely helpful next steps'
   }
6. Is conversational and under 160 characters
7. Builds trust through transparency
8. NEVER repeats questions already asked or offers already made

${intentAnalysis.primaryIntent === 'direct_request' ? 
  `DIRECT REQUEST DETECTED: Customer asked for "${intentAnalysis.requestedTopic}". Provide this information immediately without asking if they want it.` : 
  ''
}

${intentAnalysis.primaryIntent === 'agreement' && followUpContent ? 
  `CUSTOMER AGREEMENT DETECTED: They agreed to receive information. Provide what was agreed upon instead of asking again.` : 
  ''
}

${redundancyCheck.shouldAvoidRedundancy ?
  `REDUNDANCY WARNING: Stop repeating the same offers. Provide new information or move to next steps.` :
  ''
}`;

  return promptInstructions;
};
