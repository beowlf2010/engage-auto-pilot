import DOMPurify from 'dompurify';

/**
 * Security middleware for comprehensive input validation and XSS prevention
 */

// Enhanced Content Security Policy configuration
export const CSP_CONFIG = {
  'default-src': "'self'",
  'script-src': "'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://js.stripe.com",
  'style-src': "'self' 'unsafe-inline' https://fonts.googleapis.com",
  'font-src': "'self' https://fonts.gstatic.com",
  'img-src': "'self' data: https: blob:",
  'media-src': "'self' data: https: blob:",
  'connect-src': "'self' https://*.supabase.co wss://*.supabase.co https://api.openai.com",
  'frame-src': "'self' https://js.stripe.com",
  'object-src': "'none'",
  'base-uri': "'self'",
  'form-action': "'self'",
  'frame-ancestors': "'none'",
  'upgrade-insecure-requests': ""
};

// Generate CSP header string
export const generateCSPHeader = (): string => {
  return Object.entries(CSP_CONFIG)
    .map(([directive, sources]) => `${directive} ${sources}`)
    .join('; ');
};

/**
 * Enhanced HTML sanitization with stricter security
 */
export const sanitizeHtmlStrict = (html: string): string => {
  if (!html || typeof html !== 'string') {
    return '';
  }

  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'span'],
    ALLOWED_ATTR: ['class'],
    ALLOW_DATA_ATTR: false,
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input', 'textarea', 'select', 'button', 'link', 'meta'],
    FORBID_ATTR: ['onclick', 'onload', 'onerror', 'onmouseover', 'onmouseout', 'onfocus', 'onblur', 'onkeydown', 'onkeyup', 'onsubmit', 'href', 'src'],
    FORCE_BODY: false,
    SANITIZE_DOM: true,
    SANITIZE_NAMED_PROPS: true,
    KEEP_CONTENT: true,
    RETURN_DOM: false,
    RETURN_DOM_FRAGMENT: false,
    RETURN_TRUSTED_TYPE: false
  });
};

/**
 * Safe text highlighting that prevents XSS
 */
export const safeHighlightText = (text: string, searchTerm: string): string => {
  if (!searchTerm || !text) return text;
  
  // Escape the search term to prevent regex injection
  const escapedTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  
  // Create regex for case-insensitive matching
  const regex = new RegExp(`(${escapedTerm})`, 'gi');
  
  // Replace with highlighted version
  const highlighted = text.replace(regex, '<mark class="highlight-search">$1</mark>');
  
  // Sanitize the result to ensure no malicious content
  return sanitizeHtmlStrict(highlighted);
};

/**
 * Input validation patterns
 */
export const VALIDATION_PATTERNS = {
  email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  phone: /^[+]?[1-9][\d]{0,15}$/,
  alphanumeric: /^[a-zA-Z0-9\s]+$/,
  text: /^[a-zA-Z0-9\s.,!?-]+$/,
  name: /^[a-zA-Z\s\-'.]+$/,
  vin: /^[A-HJ-NPR-Z0-9]{17}$/,
  stockNumber: /^[A-Z0-9\-]+$/,
  currency: /^\d+(\.\d{1,2})?$/
};

/**
 * Validate input against pattern and length constraints
 */
export const validateInput = (
  input: string, 
  type: keyof typeof VALIDATION_PATTERNS,
  maxLength: number = 255,
  required: boolean = false
): { isValid: boolean; error?: string; sanitized: string } => {
  if (!input || input.trim() === '') {
    if (required) {
      return { isValid: false, error: 'This field is required', sanitized: '' };
    }
    return { isValid: true, sanitized: '' };
  }

  // Sanitize input first
  const sanitized = input.trim().substring(0, maxLength);
  
  // Check length
  if (sanitized.length > maxLength) {
    return { 
      isValid: false, 
      error: `Input too long (max ${maxLength} characters)`, 
      sanitized 
    };
  }

  // Check pattern
  const pattern = VALIDATION_PATTERNS[type];
  if (!pattern.test(sanitized)) {
    return { 
      isValid: false, 
      error: `Invalid ${type} format`, 
      sanitized 
    };
  }

  return { isValid: true, sanitized };
};

/**
 * Rate limiting utility
 */
interface RateLimitEntry {
  count: number;
  firstAttempt: number;
  lastAttempt: number;
}

class RateLimiter {
  private attempts: Map<string, RateLimitEntry> = new Map();
  private readonly maxAttempts: number;
  private readonly windowMs: number;

  constructor(maxAttempts: number = 10, windowMs: number = 60000) {
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMs;
  }

  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const entry = this.attempts.get(identifier);

    if (!entry) {
      this.attempts.set(identifier, {
        count: 1,
        firstAttempt: now,
        lastAttempt: now
      });
      return true;
    }

    // Clean old entries
    if (now - entry.firstAttempt > this.windowMs) {
      this.attempts.set(identifier, {
        count: 1,
        firstAttempt: now,
        lastAttempt: now
      });
      return true;
    }

    // Check if limit exceeded
    if (entry.count >= this.maxAttempts) {
      entry.lastAttempt = now;
      return false;
    }

    // Increment count
    entry.count += 1;
    entry.lastAttempt = now;
    return true;
  }

  getRemainingTime(identifier: string): number {
    const entry = this.attempts.get(identifier);
    if (!entry) return 0;
    
    const elapsed = Date.now() - entry.firstAttempt;
    return Math.max(0, this.windowMs - elapsed);
  }

  reset(identifier: string): void {
    this.attempts.delete(identifier);
  }
}

export const defaultRateLimiter = new RateLimiter();

/**
 * Security event logging
 */
export interface SecurityEvent {
  type: 'xss_attempt' | 'rate_limit_exceeded' | 'invalid_input' | 'unauthorized_access';
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: Record<string, any>;
  timestamp: number;
  userAgent?: string;
  ip?: string;
}

class SecurityLogger {
  private events: SecurityEvent[] = [];
  private readonly maxEvents = 1000;

  log(event: Omit<SecurityEvent, 'timestamp'>): void {
    const securityEvent: SecurityEvent = {
      ...event,
      timestamp: Date.now()
    };

    this.events.unshift(securityEvent);
    
    // Keep only recent events
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(0, this.maxEvents);
    }

    // Log critical events to console
    if (event.severity === 'critical') {
      console.error('🚨 CRITICAL SECURITY EVENT:', securityEvent);
    } else if (event.severity === 'high') {
      console.warn('⚠️ HIGH SEVERITY SECURITY EVENT:', securityEvent);
    }
  }

  getEvents(limit?: number): SecurityEvent[] {
    return limit ? this.events.slice(0, limit) : [...this.events];
  }

  getEventsByType(type: SecurityEvent['type']): SecurityEvent[] {
    return this.events.filter(event => event.type === type);
  }

  clear(): void {
    this.events = [];
  }
}

export const securityLogger = new SecurityLogger();

/**
 * Detect potential XSS attempts
 */
export const detectXSSAttempt = (input: string): boolean => {
  const xssPatterns = [
    /<script[^>]*>/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /<iframe[^>]*>/i,
    /<object[^>]*>/i,
    /<embed[^>]*>/i,
    /expression\s*\(/i,
    /vbscript:/i,
    /data:text\/html/i,
    /<link[^>]*>/i,
    /<meta[^>]*>/i
  ];

  return xssPatterns.some(pattern => pattern.test(input));
};

/**
 * Secure form data processing
 */
export const processFormData = (
  data: Record<string, any>,
  validationRules: Record<string, { type: keyof typeof VALIDATION_PATTERNS; maxLength?: number; required?: boolean }>
): { isValid: boolean; errors: Record<string, string>; sanitized: Record<string, string> } => {
  const errors: Record<string, string> = {};
  const sanitized: Record<string, string> = {};
  let isValid = true;

  for (const [field, value] of Object.entries(data)) {
    const rule = validationRules[field];
    if (!rule) {
      // Skip unknown fields
      continue;
    }

    // Check for XSS attempts
    if (typeof value === 'string' && detectXSSAttempt(value)) {
      securityLogger.log({
        type: 'xss_attempt',
        severity: 'high',
        details: { field, value, source: 'form_input' }
      });
      errors[field] = 'Invalid input detected';
      isValid = false;
      continue;
    }

    const validation = validateInput(
      String(value),
      rule.type,
      rule.maxLength || 255,
      rule.required || false
    );

    if (!validation.isValid) {
      errors[field] = validation.error || 'Invalid input';
      isValid = false;
    } else {
      sanitized[field] = validation.sanitized;
    }
  }

  return { isValid, errors, sanitized };
};
