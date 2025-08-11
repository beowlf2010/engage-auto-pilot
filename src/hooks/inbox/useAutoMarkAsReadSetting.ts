
import { useCallback, useEffect, useState } from 'react';

// Centralized setting for auto-marking conversations as read when opened
// Persists to localStorage so the preference survives reloads
export const useAutoMarkAsReadSetting = () => {
  const STORAGE_KEY = 'autoMarkAsRead';
  const [enabled, setEnabledState] = useState<boolean>(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored !== null) {
        setEnabledState(stored === 'true');
      }
    } catch (e) {
      // Ignore storage errors
    }
  }, []);

  const setEnabled = useCallback((value: boolean) => {
    setEnabledState(value);
    try {
      localStorage.setItem(STORAGE_KEY, String(value));
    } catch (e) {
      // Ignore storage errors
    }
  }, []);

  return { enabled, setEnabled } as const;
};
