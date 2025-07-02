import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { MessageData } from '@/hooks/conversation/conversationTypes';

interface LoadingState {
  isLoading: boolean;
  error: string | null;
  lastLoadTime: Date | null;
  retryCount: number;
}

export const useRobustMessageLoader = () => {
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [loadingState, setLoadingState] = useState<LoadingState>({
    isLoading: false,
    error: null,
    lastLoadTime: null,
    retryCount: 0
  });
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const cacheRef = useRef<Map<string, { messages: MessageData[]; timestamp: number }>>(new Map());

  // Clear cache for a specific lead
  const clearCache = useCallback((leadId?: string) => {
    if (leadId) {
      cacheRef.current.delete(leadId);
    } else {
      cacheRef.current.clear();
    }
  }, []);

  // Get cached messages if they're fresh (less than 10 seconds old)
  const getCachedMessages = useCallback((leadId: string): MessageData[] | null => {
    const cached = cacheRef.current.get(leadId);
    if (cached && Date.now() - cached.timestamp < 10000) {
      console.log(`💾 [ROBUST LOADER] Using cached messages for lead: ${leadId}`);
      return cached.messages;
    }
    return null;
  }, []);

  // Cache messages
  const cacheMessages = useCallback((leadId: string, messages: MessageData[]) => {
    cacheRef.current.set(leadId, {
      messages: [...messages],
      timestamp: Date.now()
    });
  }, []);

  const loadMessagesWithRetry = useCallback(async (
    leadId: string, 
    options: { 
      useCache?: boolean; 
      maxRetries?: number; 
      timeout?: number;
    } = {}
  ) => {
    const { useCache = true, maxRetries = 3, timeout = 10000 } = options;

    if (!leadId) {
      throw new Error('Lead ID is required');
    }

    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Check cache first
    if (useCache) {
      const cachedMessages = getCachedMessages(leadId);
      if (cachedMessages) {
        setMessages(cachedMessages);
        return cachedMessages;
      }
    }

    setLoadingState(prev => ({
      ...prev,
      isLoading: true,
      error: null
    }));

    // Create new abort controller for this request
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    const attemptLoad = async (attempt: number): Promise<MessageData[]> => {
      try {
        console.log(`📨 [ROBUST LOADER] Loading messages for lead ${leadId} (attempt ${attempt + 1}/${maxRetries + 1})`);

        // Set up timeout
        const timeoutId = setTimeout(() => {
          if (!signal.aborted) {
            abortControllerRef.current?.abort();
          }
        }, timeout);

        const { data, error } = await supabase
          .from('conversations')
          .select('*')
          .eq('lead_id', leadId)
          .order('sent_at', { ascending: true })
          .abortSignal(signal);

        clearTimeout(timeoutId);

        if (signal.aborted) {
          throw new Error('Request was cancelled');
        }

        if (error) {
          throw error;
        }

        const transformedMessages: MessageData[] = data.map(msg => ({
          id: msg.id,
          leadId: msg.lead_id,
          body: msg.body,
          direction: msg.direction as 'in' | 'out',
          sentAt: msg.sent_at,
          smsStatus: msg.sms_status || 'delivered',
          aiGenerated: msg.ai_generated || false
        }));

        // Cache the results
        cacheMessages(leadId, transformedMessages);
        
        setMessages(transformedMessages);
        setLoadingState({
          isLoading: false,
          error: null,
          lastLoadTime: new Date(),
          retryCount: 0
        });

        console.log(`✅ [ROBUST LOADER] Loaded ${transformedMessages.length} messages for lead ${leadId}`);
        return transformedMessages;

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error(`❌ [ROBUST LOADER] Attempt ${attempt + 1} failed:`, errorMessage);

        if (signal.aborted) {
          console.log(`⏹️ [ROBUST LOADER] Request cancelled for lead ${leadId}`);
          throw new Error('Request cancelled');
        }

        // Retry logic
        if (attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 5000); // Exponential backoff, max 5 seconds
          console.log(`⏳ [ROBUST LOADER] Retrying in ${delay}ms...`);
          
          await new Promise(resolve => setTimeout(resolve, delay));
          return attemptLoad(attempt + 1);
        }

        throw err;
      }
    };

    try {
      return await attemptLoad(0);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load messages';
      setLoadingState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
        retryCount: prev.retryCount + 1
      }));
      throw err;
    }
  }, [getCachedMessages, cacheMessages]);

  // Enhanced load function with automatic deduplication
  const loadMessages = useCallback(async (leadId: string) => {
    try {
      const messages = await loadMessagesWithRetry(leadId);
      
      // Mark unread incoming messages as read
      const unreadIncoming = messages
        .filter(msg => msg.direction === 'in')
        .map(msg => msg.id);

      if (unreadIncoming.length > 0) {
        console.log(`📖 [ROBUST LOADER] Marking ${unreadIncoming.length} messages as read`);
        
        // Don't await this to avoid blocking the UI
        supabase
          .from('conversations')
          .update({ read_at: new Date().toISOString() })
          .in('id', unreadIncoming)
          .then(({ error }) => {
            if (error) {
              console.error('Error marking messages as read:', error);
            }
          });
      }

      return messages;
    } catch (err) {
      console.error('Failed to load messages:', err);
      throw err;
    }
  }, [loadMessagesWithRetry]);

  // Force reload without cache
  const forceReload = useCallback(async (leadId: string) => {
    clearCache(leadId);
    return loadMessagesWithRetry(leadId, { useCache: false });
  }, [loadMessagesWithRetry, clearCache]);

  // Listen for custom events to reload messages
  useEffect(() => {
    const handleMessageUpdate = (event: CustomEvent) => {
      const { leadId } = event.detail;
      if (leadId) {
        loadMessages(leadId);
      }
    };

    window.addEventListener('lead-messages-update', handleMessageUpdate as EventListener);
    
    return () => {
      window.removeEventListener('lead-messages-update', handleMessageUpdate as EventListener);
    };
  }, [loadMessages]);

  return {
    messages,
    loadingState,
    loadMessages,
    forceReload,
    clearCache
  };
};