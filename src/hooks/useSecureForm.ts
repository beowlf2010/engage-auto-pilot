import { useState, useCallback } from 'react';
import { processFormData, VALIDATION_PATTERNS, defaultRateLimiter, securityLogger } from '@/utils/securityMiddleware';

interface FormField {
  type: keyof typeof VALIDATION_PATTERNS;
  maxLength?: number;
  required?: boolean;
}

interface UseSecureFormProps {
  fields: Record<string, FormField>;
  onSubmit: (data: Record<string, string>) => Promise<void> | void;
  rateLimitKey?: string;
}

export const useSecureForm = ({ fields, onSubmit, rateLimitKey }: UseSecureFormProps) => {
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [submitAttempts, setSubmitAttempts] = useState(0);

  const setValue = useCallback((field: string, value: string) => {
    setValues(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  }, [errors]);

  const validateField = useCallback((field: string, value: string) => {
    const fieldConfig = fields[field];
    if (!fieldConfig) return { isValid: true, error: '', sanitized: value };

    return processFormData({ [field]: value }, { [field]: fieldConfig });
  }, [fields]);

  const validateForm = useCallback(() => {
    const result = processFormData(values, fields);
    setErrors(result.errors);
    return result;
  }, [values, fields]);

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    
    // Rate limiting check
    const identifier = rateLimitKey || 'default';
    if (!defaultRateLimiter.isAllowed(identifier)) {
      const remainingTime = Math.ceil(defaultRateLimiter.getRemainingTime(identifier) / 1000);
      setErrors({ _form: `Too many attempts. Please wait ${remainingTime} seconds.` });
      
      securityLogger.log({
        type: 'rate_limit_exceeded',
        severity: 'medium',
        details: { identifier, attempts: submitAttempts }
      });
      
      return;
    }

    setLoading(true);
    setSubmitAttempts(prev => prev + 1);

    try {
      const validation = validateForm();
      
      if (!validation.isValid) {
        setLoading(false);
        return;
      }

      await onSubmit(validation.sanitized);
      
      // Reset form on successful submission
      setValues({});
      setErrors({});
      setSubmitAttempts(0);
      
    } catch (error) {
      console.error('Form submission error:', error);
      setErrors({ 
        _form: error instanceof Error ? error.message : 'An error occurred during submission' 
      });
    } finally {
      setLoading(false);
    }
  }, [values, fields, onSubmit, rateLimitKey, submitAttempts, validateForm]);

  const reset = useCallback(() => {
    setValues({});
    setErrors({});
    setSubmitAttempts(0);
  }, []);

  return {
    values,
    errors,
    loading,
    setValue,
    validateField,
    handleSubmit,
    reset,
    isValid: Object.keys(errors).length === 0
  };
};