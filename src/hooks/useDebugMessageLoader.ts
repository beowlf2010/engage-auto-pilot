
import { useState, useCallback, useRef } from 'react';
import { messageValidationService } from '@/services/messageValidationService';
import { useRobustMessageLoader } from './messaging/useRobustMessageLoader';

interface DebugLoadingState {
  isLoading: boolean;
  error: string | null;
  validationResult: any | null;
  cacheStatus: 'hit' | 'miss' | 'bypassed';
  loadingMethod: string;
  debugLogs: string[];
}

export const useDebugMessageLoader = () => {
  const {
    messages,
    loadingState,
    loadMessages: robustLoadMessages,
    forceReload,
    clearCache
  } = useRobustMessageLoader();

  const [debugState, setDebugState] = useState<DebugLoadingState>({
    isLoading: false,
    error: null,
    validationResult: null,
    cacheStatus: 'miss',
    loadingMethod: 'initial',
    debugLogs: []
  });

  const debugLogsRef = useRef<string[]>([]);

  const addDebugLog = useCallback((message: string) => {
    const timestamp = new Date().toISOString();
    const logEntry = `${timestamp}: ${message}`;
    console.log(`🐛 [DEBUG LOADER] ${message}`);
    
    debugLogsRef.current.unshift(logEntry);
    if (debugLogsRef.current.length > 50) {
      debugLogsRef.current = debugLogsRef.current.slice(0, 50);
    }
    
    setDebugState(prev => ({
      ...prev,
      debugLogs: [...debugLogsRef.current]
    }));
  }, []);

  const validateAndLoadMessages = useCallback(async (leadId: string, options: {
    bypassCache?: boolean;
    method?: string;
  } = {}) => {
    const { bypassCache = false, method = 'standard' } = options;
    
    addDebugLog(`Starting message load for lead ${leadId} with method: ${method}`);
    
    setDebugState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
      loadingMethod: method,
      cacheStatus: bypassCache ? 'bypassed' : 'unknown'
    }));

    try {
      // Step 1: Validate current state
      addDebugLog('Running message validation...');
      const validationResult = await messageValidationService.validateConversationMessages(leadId);
      
      setDebugState(prev => ({
        ...prev,
        validationResult
      }));

      if (validationResult.validationErrors.length > 0) {
        addDebugLog(`Validation errors found: ${validationResult.validationErrors.join(', ')}`);
      }

      // Step 2: Debug the loading pipeline
      addDebugLog('Running debug pipeline...');
      await messageValidationService.debugMessageLoadingPipeline(leadId);

      // Step 3: Load messages
      addDebugLog(`Loading messages using ${bypassCache ? 'force reload' : 'standard load'}...`);
      
      let loadedMessages;
      if (bypassCache) {
        addDebugLog('Clearing cache and forcing reload...');
        clearCache(leadId);
        loadedMessages = await forceReload(leadId);
        setDebugState(prev => ({ ...prev, cacheStatus: 'bypassed' }));
      } else {
        loadedMessages = await robustLoadMessages(leadId);
        setDebugState(prev => ({ ...prev, cacheStatus: 'miss' }));
      }

      addDebugLog(`Loaded ${loadedMessages?.length || messages.length} messages successfully`);

      // Step 4: Final validation
      const finalMessages = loadedMessages || messages;
      const expectedCount = validationResult.actualUnreadCount;
      const displayedCount = finalMessages.length;
      
      if (expectedCount > 0 && displayedCount === 0) {
        addDebugLog(`🚨 MISMATCH DETECTED: Expected ${expectedCount} unread messages but displaying ${displayedCount} total messages`);
        setDebugState(prev => ({
          ...prev,
          error: `Message display mismatch: Expected ${expectedCount} unread but showing ${displayedCount} total`
        }));
      } else {
        addDebugLog(`✅ Message counts validated: ${displayedCount} displayed, ${expectedCount} unread`);
      }

      return finalMessages;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      addDebugLog(`❌ Error during message loading: ${errorMessage}`);
      
      setDebugState(prev => ({
        ...prev,
        error: errorMessage
      }));
      
      throw error;
    } finally {
      setDebugState(prev => ({
        ...prev,
        isLoading: false
      }));
    }
  }, [robustLoadMessages, forceReload, clearCache, messages, addDebugLog]);

  const getDebugInfo = useCallback(() => {
    return {
      debugState,
      robustLoadingState: loadingState,
      messageCount: messages.length,
      debugLogs: debugLogsRef.current
    };
  }, [debugState, loadingState, messages]);

  const clearDebugLogs = useCallback(() => {
    debugLogsRef.current = [];
    setDebugState(prev => ({
      ...prev,
      debugLogs: []
    }));
    addDebugLog('Debug logs cleared');
  }, [addDebugLog]);

  return {
    messages,
    debugState,
    validateAndLoadMessages,
    getDebugInfo,
    clearDebugLogs,
    addDebugLog,
    // Pass through robust loader functions
    forceReload: (leadId: string) => validateAndLoadMessages(leadId, { bypassCache: true, method: 'force_reload' }),
    clearCache
  };
};
