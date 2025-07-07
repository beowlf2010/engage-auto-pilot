import { useCallback, useRef, useEffect } from 'react';

interface UseOptimizedQueryOptions {
  cacheTime?: number;
  staleTime?: number;
  refetchOnWindowFocus?: boolean;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  isStale: boolean;
}

const queryCache = new Map<string, CacheEntry<any>>();

export const useOptimizedQuery = <T>(
  key: string,
  queryFn: () => Promise<T>,
  options: UseOptimizedQueryOptions = {}
) => {
  const {
    cacheTime = 5 * 60 * 1000, // 5 minutes
    staleTime = 30 * 1000, // 30 seconds
    refetchOnWindowFocus = false
  } = options;

  const abortControllerRef = useRef<AbortController | null>(null);

  const getCachedData = useCallback((key: string): CacheEntry<T> | null => {
    const cached = queryCache.get(key);
    if (!cached) return null;

    const now = Date.now();
    const isExpired = now - cached.timestamp > cacheTime;
    
    if (isExpired) {
      queryCache.delete(key);
      return null;
    }

    const isStale = now - cached.timestamp > staleTime;
    return { ...cached, isStale };
  }, [cacheTime, staleTime]);

  const setCachedData = useCallback((key: string, data: T) => {
    queryCache.set(key, {
      data,
      timestamp: Date.now(),
      isStale: false
    });
  }, []);

  const optimizedQuery = useCallback(async (): Promise<T> => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Check cache first
    const cached = getCachedData(key);
    if (cached && !cached.isStale) {
      return cached.data;
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    try {
      const data = await queryFn();
      setCachedData(key, data);
      return data;
    } catch (error) {
      // Return cached data if available, even if stale
      if (cached) {
        return cached.data;
      }
      throw error;
    }
  }, [key, queryFn, getCachedData, setCachedData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Optional: Refetch on window focus
  useEffect(() => {
    if (!refetchOnWindowFocus) return;

    const handleFocus = () => {
      const cached = getCachedData(key);
      if (cached?.isStale) {
        optimizedQuery();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [refetchOnWindowFocus, key, getCachedData, optimizedQuery]);

  return optimizedQuery;
};

// Clear cache utility
export const clearQueryCache = (pattern?: string) => {
  if (pattern) {
    const regex = new RegExp(pattern);
    for (const key of queryCache.keys()) {
      if (regex.test(key)) {
        queryCache.delete(key);
      }
    }
  } else {
    queryCache.clear();
  }
};