import { CSP_CONFIG, generateCSPHeader } from './securityMiddleware';

/**
 * CSP header management and violation reporting
 */

export interface CSPViolation {
  'document-uri': string;
  referrer: string;
  'violated-directive': string;
  'effective-directive': string;
  'original-policy': string;
  disposition: string;
  'blocked-uri': string;
  'line-number': number;
  'column-number': number;
  'source-file': string;
  'status-code': number;
  'script-sample': string;
}

// Simple quiet-mode controls for security logs
const isSecurityQuiet = (): boolean => {
  try {
    return localStorage.getItem('security.quietLogs') === '1';
  } catch {
    return false;
  }
};

export const setSecurityQuietMode = (enabled: boolean): void => {
  try {
    localStorage.setItem('security.quietLogs', enabled ? '1' : '0');
  } catch {
    // no-op
  }
};

/**
 * Apply CSP headers to prevent XSS attacks
 */
export const applyCSPHeaders = (): void => {
  // Only run in browser environment
  if (typeof document === 'undefined') return;

  try {
    const cspHeader = generateCSPHeader();
    // Remove unsupported directives for meta-delivered CSP (e.g., frame-ancestors)
    const sanitizedHeader = cspHeader
      .replace(/(^|;)\s*frame-ancestors[^;]*;?/gi, '$1')
      .replace(/;;+/g, ';')
      .replace(/^\s*;|;\s*$/g, '');
    
    // Create or update CSP meta tag
    let cspMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]') as HTMLMetaElement;
    
    if (!cspMeta) {
      cspMeta = document.createElement('meta');
      cspMeta.setAttribute('http-equiv', 'Content-Security-Policy');
      document.head.appendChild(cspMeta);
    }
    
    cspMeta.setAttribute('content', sanitizedHeader);
    
    if (!isSecurityQuiet()) {
      console.log('🛡️ CSP headers applied successfully');
    }
  } catch (error) {
    console.error('❌ Failed to apply CSP headers:', error);
  }
};

/**
 * Handle CSP violation reports
 */
export const handleCSPViolation = (violation: CSPViolation): void => {
  console.warn('🚨 CSP Violation detected:', {
    violatedDirective: violation['violated-directive'],
    blockedUri: violation['blocked-uri'],
    sourceFile: violation['source-file'],
    lineNumber: violation['line-number'],
    scriptSample: violation['script-sample']
  });

  // Log to security system
  if (typeof window !== 'undefined') {
    // Send violation report to monitoring endpoint if available
    fetch('/api/security/csp-violation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        violation,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href
      })
    }).catch(error => {
      console.error('Failed to report CSP violation:', error);
    });
  }
};

/**
 * Initialize CSP violation reporting
 */
export const initCSPReporting = (): void => {
  if (typeof document === 'undefined') return;

  // Listen for CSP violations
  document.addEventListener('securitypolicyviolation', (event) => {
    handleCSPViolation({
      'document-uri': event.documentURI,
      referrer: event.referrer,
      'violated-directive': event.violatedDirective,
      'effective-directive': event.effectiveDirective,
      'original-policy': event.originalPolicy,
      disposition: event.disposition,
      'blocked-uri': event.blockedURI,
      'line-number': event.lineNumber,
      'column-number': event.columnNumber,
      'source-file': event.sourceFile,
      'status-code': event.statusCode,
      'script-sample': event.sample
    });
  });

  if (!isSecurityQuiet()) {
    console.log('🛡️ CSP violation reporting initialized');
  }
};

/**
 * Create nonce for inline scripts (when absolutely necessary)
 */
export const generateNonce = (): string => {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array));
};

/**
 * Validate if a URL is safe to load
 */
export const isUrlSafe = (url: string): boolean => {
  try {
    const urlObj = new URL(url);
    
    // Allow same origin
    if (urlObj.origin === window.location.origin) {
      return true;
    }
    
    // Allow specific trusted domains
    const trustedDomains = [
      'fonts.googleapis.com',
      'fonts.gstatic.com',
      'cdn.jsdelivr.net',
      'js.stripe.com'
    ];
    
    return trustedDomains.some(domain => urlObj.hostname === domain);
  } catch {
    return false;
  }
};

/**
 * Initialize comprehensive CSP protection
 */
export const initCSPProtection = (): void => {
  applyCSPHeaders();
  initCSPReporting();
  
  // Add runtime security checks
  const originalSetAttribute = Element.prototype.setAttribute;
  Element.prototype.setAttribute = function(name: string, value: string) {
    // Monitor dangerous attributes
    if (name.toLowerCase().startsWith('on')) {
      console.warn('🚨 Blocked inline event handler:', name, value);
      return;
    }
    
    // Validate script sources
    if (this.tagName === 'SCRIPT' && name === 'src' && !isUrlSafe(value)) {
      console.warn('🚨 Blocked unsafe script source:', value);
      return;
    }
    
    return originalSetAttribute.call(this, name, value);
  };
  
  if (!isSecurityQuiet()) {
    console.log('🛡️ Comprehensive CSP protection initialized');
  }
};