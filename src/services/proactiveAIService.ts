
// Re-export all functionality from the refactored modules
export { sendInitialMessage } from './proactive/initialMessageService';
export { processProactiveMessages } from './proactive/proactiveMessagingProcessor';
export { triggerImmediateMessage } from './proactive/triggerService';
export { generateWarmInitialMessage } from './proactive/warmIntroductionService';

// Re-export types
export type { ProactiveMessageResult } from './proactive/initialMessageService';
