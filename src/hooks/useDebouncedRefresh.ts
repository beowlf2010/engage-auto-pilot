
import { useCallback, useRef } from 'react';

export const useDebouncedRefresh = (refreshFn: () => void, delay: number = 300) => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const debouncedRefresh = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      refreshFn();
      timeoutRef.current = null;
    }, delay);
  }, [refreshFn, delay]);

  const cancelRefresh = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  return { debouncedRefresh, cancelRefresh };
};
