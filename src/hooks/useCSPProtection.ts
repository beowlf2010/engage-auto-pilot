import { useEffect } from 'react';
import { initCSPProtection } from '@/utils/cspHandler';

/**
 * Hook to initialize CSP protection for the application
 */
export const useCSPProtection = () => {
  useEffect(() => {
    // Initialize CSP protection on mount
    initCSPProtection();
    
    // Cleanup function (if needed)
    return () => {
      // CSP protection doesn't need cleanup
    };
  }, []);
};