
import { useState, useEffect, useCallback } from 'react';

export interface PersistentState<T> {
  data: T;
  timestamp: number;
  version: string;
}

const FILTER_STORAGE_KEY = 'inbox-filters-v1';
const FILTER_VERSION = '1.0';
const EXPIRY_HOURS = 24 * 7; // 7 days

export const useFilterPersistence = <T>(
  defaultValue: T,
  storageKey: string = FILTER_STORAGE_KEY
) => {
  const [state, setState] = useState<T>(defaultValue);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load persisted state on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed: PersistentState<T> = JSON.parse(saved);
        
        // Check if data is expired
        const now = Date.now();
        const hoursSinceUpdate = (now - parsed.timestamp) / (1000 * 60 * 60);
        
        if (hoursSinceUpdate < EXPIRY_HOURS && parsed.version === FILTER_VERSION) {
          console.log('🔄 [FILTER PERSISTENCE] Restored filters from localStorage');
          setState(parsed.data);
        } else {
          console.log('⏰ [FILTER PERSISTENCE] Expired or outdated filters, using defaults');
          localStorage.removeItem(storageKey);
        }
      }
    } catch (error) {
      console.warn('⚠️ [FILTER PERSISTENCE] Failed to load persisted filters:', error);
      localStorage.removeItem(storageKey);
    } finally {
      setIsLoaded(true);
    }
  }, [storageKey]);

  // Save state to localStorage
  const saveState = useCallback((newState: T) => {
    try {
      const persistentState: PersistentState<T> = {
        data: newState,
        timestamp: Date.now(),
        version: FILTER_VERSION
      };
      
      localStorage.setItem(storageKey, JSON.stringify(persistentState));
      console.log('💾 [FILTER PERSISTENCE] Saved filters to localStorage');
      setState(newState);
    } catch (error) {
      console.warn('⚠️ [FILTER PERSISTENCE] Failed to save filters:', error);
      setState(newState);
    }
  }, [storageKey]);

  // Clear persisted state
  const clearState = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
      console.log('🗑️ [FILTER PERSISTENCE] Cleared persisted filters');
      setState(defaultValue);
    } catch (error) {
      console.warn('⚠️ [FILTER PERSISTENCE] Failed to clear filters:', error);
    }
  }, [storageKey, defaultValue]);

  return {
    state,
    saveState,
    clearState,
    isLoaded
  };
};
