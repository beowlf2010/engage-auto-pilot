
import { classifyVehicle } from './vehicleClassification.ts';
import { analyzeConversationPattern } from './conversationAnalysis.ts';
import { analyzeCustomerIntent, generateFollowUpContent } from './intentAnalysis.ts';

export const buildSystemPrompt = (
  leadName: string,
  vehicleInterest: string,
  conversationLength: number,
  conversationHistory: string,
  inventoryStatus: any
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
- If customer shows interest in something, provide that information instead of asking again

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
}

INVENTORY ANALYSIS:`;

  // Enhanced Tesla-specific handling with new/used logic
  if (requestedCategory.isTesla) {
    if (requestedCategory.condition === 'new') {
      systemPrompt += `\n❌ IMPORTANT: WE DO NOT SELL NEW TESLA VEHICLES
- Tesla only sells new vehicles through their own stores and website
- We are not a Tesla dealership for new vehicles
- Be honest about this limitation
- Offer to help with other new electric vehicles if they're interested in EVs`;
    } else if (requestedCategory.condition === 'used') {
      if (inventoryStatus?.hasRequestedVehicle) {
        systemPrompt += `\n✅ WE HAVE USED TESLA VEHICLES:
${inventoryStatus.matchingVehicles?.map(v => `- ${v.year} ${v.make} ${v.model} - $${v.price?.toLocaleString()}`).join('\n') || ''}`;
      } else {
        systemPrompt += `\n❌ WE DO NOT CURRENTLY HAVE USED TESLA VEHICLES IN STOCK.
- We can sell used Teslas when we get them as trade-ins
- I'd be happy to keep an eye out for Tesla trade-ins for you
- Would you like me to notify you when we get used Teslas in?`;
        
        if (inventoryStatus?.availableAlternatives?.length > 0) {
          systemPrompt += `\n\nRELEVANT ALTERNATIVES (luxury/electric vehicles):
${inventoryStatus.availableAlternatives.map(v => `- ${v.year} ${v.make} ${v.model} - $${v.price?.toLocaleString()}`).join('\n')}`;
        }
      }
    } else {
      // Unknown condition - ask for clarification
      systemPrompt += `\n❓ TESLA INQUIRY NEEDS CLARIFICATION:
- For NEW Teslas: Tesla sells direct (we can't help)
- For USED Teslas: We can help if we have inventory or get trade-ins
- Ask customer to clarify if they want new or used`;
    }
  } else if (inventoryStatus?.hasRequestedVehicle) {
    systemPrompt += `\n✅ WE HAVE MATCHING ${inventoryStatus.requestedMake?.toUpperCase()} VEHICLES:
${inventoryStatus.matchingVehicles?.map(v => `- ${v.year} ${v.make} ${v.model} - $${v.price?.toLocaleString()}`).join('\n') || ''}`;
  } else if (inventoryStatus?.requestedMake) {
    systemPrompt += `\n❌ WE DO NOT HAVE ${inventoryStatus.requestedMake.toUpperCase()} VEHICLES IN STOCK.`;
    
    if (inventoryStatus.availableAlternatives?.length > 0) {
      systemPrompt += `\n\nRELEVANT ALTERNATIVES (same category):
${inventoryStatus.availableAlternatives.map(v => `- ${v.year} ${v.make} ${v.model} - $${v.price?.toLocaleString()}`).join('\n')}`;
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
  conversationPattern: any
) => {
  // Analyze customer intent to detect if they're agreeing to something
  const intentAnalysis = analyzeCustomerIntent(conversationHistory, lastCustomerMessage);
  const followUpContent = intentAnalysis.agreedToOffer ? 
    generateFollowUpContent(intentAnalysis.agreedToOffer, requestedCategory) : null;

  let promptInstructions = `Customer's latest message: "${lastCustomerMessage}"

Recent conversation context:
${conversationHistory}`;

  // Add intent-based instructions
  if (intentAnalysis.shouldFollowUp && followUpContent) {
    promptInstructions += `\n\nIMPORTANT - CUSTOMER INTENT DETECTED:
- Customer has expressed interest in: ${followUpContent.context}
- FOLLOW UP ACTION REQUIRED: ${followUpContent.instruction}
- DO NOT ask the same question again - provide the requested information`;
  }

  promptInstructions += `\n\nGenerate a response that:
1. ${conversationPattern.isEstablishedConversation ? 
     'Continues the conversation naturally (NO generic greetings)' : 
     'Provides a warm, professional greeting'
   }
2. ${intentAnalysis.shouldFollowUp ? 
     'Follows through on what the customer agreed to (don\'t repeat offers)' : 
     'Directly and honestly addresses their question'
   }
3. ${requestedCategory.isTesla ? 
     (requestedCategory.condition === 'new' ? 
       'Explains we cannot help with NEW Tesla vehicles (Tesla direct sales only)' :
       requestedCategory.condition === 'used' ?
         'Addresses used Tesla availability honestly' :
         'Clarifies whether they want new or used Tesla'
     ) : 
     'Provides accurate inventory information'
   }
4. ${intentAnalysis.shouldFollowUp ? 
     'Provides the specific information they requested' : 
     'Offers genuinely helpful next steps'
   }
5. Is conversational and under 160 characters
6. Builds trust through transparency

${intentAnalysis.shouldFollowUp ? 
  `CUSTOMER AGREEMENT DETECTED: They said "${lastCustomerMessage}" in response to an offer. Provide the requested information instead of asking again.` : 
  ''
}

${requestedCategory.isTesla && requestedCategory.condition === 'new' ? 
  'NEW TESLA RESPONSE: Politely explain that Tesla only sells new vehicles direct and offer to help with other new EVs.' : 
  requestedCategory.isTesla && requestedCategory.condition === 'used' ?
    'USED TESLA RESPONSE: Be honest about current used Tesla inventory and offer alternatives or to watch for trade-ins.' :
    ''
}`;

  return promptInstructions;
};
