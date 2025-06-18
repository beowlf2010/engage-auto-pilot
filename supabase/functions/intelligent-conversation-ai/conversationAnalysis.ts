
// Check for repetitive conversations
export const analyzeConversationPattern = (conversationHistory: string) => {
  const lines = conversationHistory.split('\n');
  const customerLines = lines.filter(line => line.startsWith('Customer:'));
  const salesLines = lines.filter(line => line.startsWith('Sales:'));
  
  // Check for repeated sales messages
  const lastSalesMessages = salesLines.slice(-3);
  const hasRepetitiveGreeting = lastSalesMessages.some(msg => 
    msg.includes('Hi ') && msg.includes('What questions can I answer')
  );
  
  // Check conversation length
  const isEstablishedConversation = customerLines.length > 1 || salesLines.length > 2;
  
  return {
    hasRepetitiveGreeting,
    isEstablishedConversation,
    customerMessageCount: customerLines.length,
    salesMessageCount: salesLines.length
  };
};
