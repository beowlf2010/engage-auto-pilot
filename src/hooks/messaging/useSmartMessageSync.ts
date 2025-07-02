import { useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

interface MessageSyncOptions {
  debounceMs?: number;
  batchSize?: number;
  maxRetries?: number;
}

export const useSmartMessageSync = (options: MessageSyncOptions = {}) => {
  const { debounceMs = 1000, batchSize = 10, maxRetries = 3 } = options;
  const queryClient = useQueryClient();
  
  const pendingUpdatesRef = useRef<Set<string>>(new Set());
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const batchTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced conversation list refresh
  const debouncedRefreshConversations = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      console.log('🔄 [SMART SYNC] Refreshing conversations list');
      queryClient.invalidateQueries({ queryKey: ['stable-conversations'] });
    }, debounceMs);
  }, [queryClient, debounceMs]);

  // Batched message updates for specific leads
  const batchMessageUpdate = useCallback((leadId: string) => {
    pendingUpdatesRef.current.add(leadId);

    if (batchTimerRef.current) {
      clearTimeout(batchTimerRef.current);
    }

    batchTimerRef.current = setTimeout(() => {
      const leadsToUpdate = Array.from(pendingUpdatesRef.current);
      pendingUpdatesRef.current.clear();

      console.log(`🔄 [SMART SYNC] Batch updating messages for ${leadsToUpdate.length} leads`);
      
      // Process in smaller batches to avoid overwhelming the system
      const batches = [];
      for (let i = 0; i < leadsToUpdate.length; i += batchSize) {
        batches.push(leadsToUpdate.slice(i, i + batchSize));
      }

      batches.forEach((batch, index) => {
        setTimeout(() => {
          batch.forEach(leadId => {
            window.dispatchEvent(new CustomEvent('lead-messages-update', { 
              detail: { leadId } 
            }));
          });
        }, index * 100); // Stagger batch processing
      });

    }, debounceMs / 2); // Shorter delay for message updates
  }, [batchSize, debounceMs]);

  // Smart deduplication for rapid-fire updates
  const deduplicatedUpdate = useCallback((leadId: string, updateType: 'message' | 'conversation' = 'message') => {
    if (updateType === 'conversation') {
      debouncedRefreshConversations();
    } else {
      batchMessageUpdate(leadId);
    }
  }, [debouncedRefreshConversations, batchMessageUpdate]);

  // Cross-tab synchronization
  const syncAcrossTabs = useCallback(() => {
    // Broadcast update to other tabs
    if ('BroadcastChannel' in window) {
      const channel = new BroadcastChannel('message-sync');
      channel.postMessage({ type: 'sync-request', timestamp: Date.now() });
      
      // Listen for sync requests from other tabs
      channel.addEventListener('message', (event) => {
        if (event.data.type === 'sync-request') {
          debouncedRefreshConversations();
        }
      });
    }
  }, [debouncedRefreshConversations]);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    if (batchTimerRef.current) {
      clearTimeout(batchTimerRef.current);
    }
    pendingUpdatesRef.current.clear();
  }, []);

  return {
    debouncedRefreshConversations,
    batchMessageUpdate,
    deduplicatedUpdate,
    syncAcrossTabs,
    cleanup
  };
};