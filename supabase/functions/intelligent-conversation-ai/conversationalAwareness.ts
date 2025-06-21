
// Enhanced conversational awareness for informational messages and handoffs
export const analyzeConversationalContext = (message: string, conversationHistory: string) => {
  const text = message.toLowerCase();
  
  // Detect handoff scenarios
  const handoffIndicators = [
    /\b(will be handling|handling it|taking over|working with|assigned to)\b/,
    /\b(meet|introduce|this is|here is)\s+\w+\s+(who|will|is)\b/,
    /\b(transferred to|passed to|working with)\b/,
    /\b(new contact|new person|someone else)\b/
  ];
  
  const isHandoffScenario = handoffIndicators.some(pattern => pattern.test(text));
  
  // Detect name introductions
  const nameIntroPattern = /\b(don't know if you know|meet|this is|here is)\s+([A-Z][a-z]+)\b/;
  const nameMatch = text.match(nameIntroPattern);
  const introducedName = nameMatch ? nameMatch[2] : null;
  
  // Detect informational updates that warrant acknowledgment
  const informationalIndicators = [
    /\b(letting you know|wanted to tell you|heads up|update)\b/,
    /\b(by the way|also|additionally)\b/,
    /\b(just so you know|for your information|fyi)\b/
  ];
  
  const isInformationalUpdate = informationalIndicators.some(pattern => pattern.test(text));
  
  // Detect process/status updates
  const processUpdateIndicators = [
    /\b(will handle|handling|taking care of|managing)\b/,
    /\b(next steps|moving forward|going forward)\b/,
    /\b(process|procedure|workflow)\b/
  ];
  
  const isProcessUpdate = processUpdateIndicators.some(pattern => pattern.test(text));
  
  // Detect relationship building opportunities
  const relationshipIndicators = [
    /\b(hope|looking forward|excited|pleased)\b/,
    /\b(work together|collaborate|partnership)\b/,
    /\b(experience|service|help)\b/
  ];
  
  const isRelationshipBuilding = relationshipIndicators.some(pattern => pattern.test(text));
  
  return {
    isHandoffScenario,
    introducedName,
    isInformationalUpdate,
    isProcessUpdate,
    isRelationshipBuilding,
    warrantsAcknowledgment: isHandoffScenario || isInformationalUpdate || isProcessUpdate || introducedName,
    responseType: isHandoffScenario ? 'handoff_acknowledgment' : 
                  introducedName ? 'name_introduction' :
                  isProcessUpdate ? 'process_acknowledgment' :
                  isInformationalUpdate ? 'information_acknowledgment' :
                  'general_engagement'
  };
};

// Generate appropriate conversational response
export const generateConversationalResponse = (context: any, leadName: string) => {
  const { 
    isHandoffScenario, 
    introducedName, 
    isProcessUpdate, 
    responseType 
  } = context;
  
  switch (responseType) {
    case 'handoff_acknowledgment':
      if (introducedName) {
        return `Thanks for letting me know about ${introducedName}, ${leadName}! I appreciate the introduction. I'm here to help with any questions about vehicles or to assist ${introducedName} as well. What can I help with next?`;
      }
      return `Thanks for the update, ${leadName}! I appreciate you letting me know about the handoff. I'm here to help however I can. What questions can I answer?`;
    
    case 'name_introduction':
      return `Nice to meet ${introducedName}! Thanks for the introduction, ${leadName}. I'm Finn with Jason Pilger Chevrolet, and I'm here to help both of you with any vehicle questions or needs. What can I assist with today?`;
    
    case 'process_acknowledgment':
      return `Got it, ${leadName}! Thanks for keeping me in the loop. I'm here to support the process however I can. Feel free to reach out with any questions along the way.`;
    
    case 'information_acknowledgment':
      return `Thanks for the update, ${leadName}! I appreciate you letting me know. Is there anything specific I can help with or any questions I can answer?`;
    
    default:
      return `Thanks for reaching out, ${leadName}! I'm here to help with any questions you might have. What can I assist you with today?`;
  }
};
