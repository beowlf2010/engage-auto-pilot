import { useEffect, ReactNode } from 'react';
import { useCSPProtection } from '@/hooks/useCSPProtection';
import { securityLogger } from '@/utils/securityMiddleware';

interface SecurityEnhancedLayoutProps {
  children: ReactNode;
}

/**
 * Layout wrapper that provides comprehensive security enhancements
 */
export const SecurityEnhancedLayout = ({ children }: SecurityEnhancedLayoutProps) => {
  // Initialize CSP protection
  useCSPProtection();

  useEffect(() => {
    // Monitor for security events
    const handleSecurityEvent = (event: any) => {
      securityLogger.log({
        type: 'unauthorized_access',
        severity: 'medium',
        details: {
          type: event.type,
          target: event.target?.tagName,
          timestamp: Date.now()
        }
      });
    };

    // Add global error handlers for security monitoring
    window.addEventListener('error', handleSecurityEvent);
    window.addEventListener('unhandledrejection', handleSecurityEvent);

    // Log app initialization
    securityLogger.log({
      type: 'unauthorized_access',
      severity: 'low',
      details: {
        action: 'app_initialized',
        userAgent: navigator.userAgent,
        timestamp: Date.now()
      }
    });

    return () => {
      window.removeEventListener('error', handleSecurityEvent);
      window.removeEventListener('unhandledrejection', handleSecurityEvent);
    };
  }, []);

  return <>{children}</>;
};