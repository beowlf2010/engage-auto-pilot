
// Re-export all the focused services for backward compatibility
export { 
  generateConversationSummary, 
  getConversationSummary,
  type ConversationSummary 
} from './conversationSummaryService';

export { 
  analyzeMessageSentiment, 
  getMessageSentiments,
  type MessageSentiment 
} from './sentimentAnalysisService';

export { 
  generateResponseSuggestions,
  type ResponseSuggestion 
} from './responseSuggestionsService';
