import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { securityLogger } from '@/utils/securityMiddleware';

interface SecureApiCallOptions {
  endpoint: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: any;
  timeout?: number;
  retries?: number;
  requireAuth?: boolean;
}

interface SecureApiCallResult<T = any> {
  data: T | null;
  error: string | null;
  loading: boolean;
  callApi: (options: SecureApiCallOptions) => Promise<T | null>;
}

export const useSecureApiCall = <T = any>(): SecureApiCallResult<T> => {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const callApi = async (options: SecureApiCallOptions): Promise<T | null> => {
    const {
      endpoint,
      method = 'POST',
      body,
      timeout = 30000,
      retries = 2,
      requireAuth = true
    } = options;

    setLoading(true);
    setError(null);

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        // Security validation before making request
        if (requireAuth) {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) {
            throw new Error('Authentication required');
          }
        }

        // Input sanitization
        let sanitizedBody = body;
        if (body && typeof body === 'object') {
          sanitizedBody = JSON.parse(JSON.stringify(body)); // Deep clone to avoid mutation
          
          // Basic XSS prevention for string values
          const sanitizeStringValues = (obj: any): any => {
            if (typeof obj === 'string') {
              return obj.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
            }
            if (typeof obj === 'object' && obj !== null) {
              const sanitized: any = Array.isArray(obj) ? [] : {};
              for (const key in obj) {
                sanitized[key] = sanitizeStringValues(obj[key]);
              }
              return sanitized;
            }
            return obj;
          };
          
          sanitizedBody = sanitizeStringValues(sanitizedBody);
        }

        // Create abort controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        let response;
        
        try {
          if (endpoint.startsWith('http')) {
            // External API call
            response = await fetch(endpoint, {
              method,
              headers: {
                'Content-Type': 'application/json',
                ...(requireAuth && {
                  'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
                })
              },
              body: sanitizedBody ? JSON.stringify(sanitizedBody) : undefined,
              signal: controller.signal
            });

            if (!response.ok) {
              throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            clearTimeout(timeoutId);
            setData(result);
            return result;
          } else {
            // Supabase edge function call
            const { data: result, error: edgeError } = await supabase.functions.invoke(endpoint, {
              body: sanitizedBody
            });

            clearTimeout(timeoutId);

            if (edgeError) {
              throw new Error(edgeError.message || 'Edge function error');
            }

            if (result?.success === false) {
              throw new Error(result?.error || 'Operation failed');
            }

            setData(result);
            return result;
          }
        } finally {
          clearTimeout(timeoutId);
        }

      } catch (err) {
        lastError = err as Error;
        
        // Log security events for suspicious activities
        if (err.message.includes('Authentication') || err.message.includes('403')) {
          securityLogger.log({
            type: 'unauthorized_access',
            severity: 'high',
            details: {
              endpoint,
              method,
              error: err.message,
              attempt: attempt + 1
            }
          });
        }

        // Don't retry on authentication errors or validation errors
        if (err.message.includes('Authentication') || 
            err.message.includes('validation') ||
            err.message.includes('403') ||
            err.message.includes('401')) {
          break;
        }

        // Wait before retry (exponential backoff)
        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }

    // All attempts failed
    const errorMessage = lastError?.message || 'Request failed after multiple attempts';
    setError(errorMessage);
    
    // Log critical failures
    securityLogger.log({
      type: 'unauthorized_access',
      severity: 'medium',
      details: {
        endpoint,
        method,
        error: errorMessage,
        attempts: retries + 1
      }
    });

    toast({
      title: "Request Failed",
      description: errorMessage,
      variant: "destructive"
    });

    setLoading(false);
    return null;
  };

  return {
    data,
    error,
    loading,
    callApi
  };
};

// Utility function for secure edge function calls
export const secureEdgeFunctionCall = async (
  functionName: string, 
  body?: any,
  options?: { timeout?: number; requireAuth?: boolean }
): Promise<{ data: any; error: string | null }> => {
  try {
    const { requireAuth = true, timeout = 30000 } = options || {};
    
    if (requireAuth) {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        return { data: null, error: 'Authentication required' };
      }
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: body || {}
      });

      clearTimeout(timeoutId);

      if (error) {
        securityLogger.log({
          type: 'invalid_input',
          severity: 'medium',
          details: {
            function: functionName,
            error: error.message,
            body: body ? Object.keys(body) : []
          }
        });
        return { data: null, error: error.message };
      }

      return { data, error: null };
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (err) {
    const error = err as Error;
    securityLogger.log({
      type: 'unauthorized_access',
      severity: 'high',
      details: {
        function: functionName,
        error: error.message,
        stack: error.stack
      }
    });
    return { data: null, error: error.message };
  }
};