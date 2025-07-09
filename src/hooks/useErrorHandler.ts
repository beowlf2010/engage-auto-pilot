import { useCallback } from 'react';
import { toast } from '@/hooks/use-toast';

export interface ErrorHandlerOptions {
  showToast?: boolean;
  logError?: boolean;
  fallbackMessage?: string;
  silent?: boolean;
}

export const useErrorHandler = () => {
  const handleError = useCallback((
    error: Error | unknown,
    context?: string,
    options: ErrorHandlerOptions = {}
  ) => {
    const {
      showToast = true,
      logError = true,
      fallbackMessage = 'Something went wrong. Please try again.',
      silent = false
    } = options;

    // Extract error message
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Log error
    if (logError && !silent) {
      console.error(`Error in ${context || 'Application'}:`, error);
    }

    // Show toast notification
    if (showToast && !silent) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: errorMessage || fallbackMessage,
      });
    }

    return errorMessage;
  }, []);

  const handleAsyncError = useCallback(async <T>(
    asyncFn: () => Promise<T>,
    context?: string,
    options: ErrorHandlerOptions = {}
  ): Promise<T | null> => {
    try {
      return await asyncFn();
    } catch (error) {
      handleError(error, context, options);
      return null;
    }
  }, [handleError]);

  const safeExecute = useCallback(async <T>(
    fn: () => Promise<T>,
    fallback: T,
    context?: string
  ): Promise<T> => {
    try {
      return await fn();
    } catch (error) {
      handleError(error, context, { silent: true });
      return fallback;
    }
  }, [handleError]);

  return {
    handleError,
    handleAsyncError,
    safeExecute
  };
};