
// Simplified conversational awareness for better build performance
export const analyzeConversationalContext = (message: string) => {
  const text = message.toLowerCase();
  
  // Simple handoff detection
  const hasHandoff = /\b(will be handling|handling it|this is|here is)\b/.test(text);
  const hasNameIntro = /\b(don't know if you know|meet)\s+\w+/.test(text);
  const hasUpdate = /\b(letting you know|wanted to tell you|heads up)\b/.test(text);
  
  return {
    warrantsAcknowledgment: hasHandoff || hasNameIntro || hasUpdate,
    responseType: hasHandoff ? 'handoff' : hasNameIntro ? 'intro' : 'update'
  };
};

export const generateConversationalResponse = (context: any, leadName: string) => {
  const { responseType } = context;
  
  switch (responseType) {
    case 'handoff':
      return `Thanks for letting me know, ${leadName}! I appreciate the update. I'm here to help with any questions you might have.`;
    case 'intro':
      return `Nice to meet them! Thanks for the introduction, ${leadName}. I'm here to help with any vehicle questions or needs.`;
    default:
      return `Thanks for the update, ${leadName}! I'm here to help with any questions you might have.`;
  }
};
