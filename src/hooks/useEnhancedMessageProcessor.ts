
import { useEffect } from 'react';
import { setupMessageProcessor } from '@/services/enhancedMessageProcessor';

// Hook to set up enhanced message processing
export const useEnhancedMessageProcessor = () => {
  useEffect(() => {
    console.log('🔧 Initializing enhanced message processor');
    const cleanup = setupMessageProcessor();
    
    return cleanup;
  }, []);
};
