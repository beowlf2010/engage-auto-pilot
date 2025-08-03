import { memo } from 'react';
import { sanitizeHtmlStrict } from '@/utils/securityMiddleware';
import { detectXSSAttempt, securityLogger } from '@/utils/securityMiddleware';

interface SafeHtmlRendererProps {
  /** HTML content to render safely */
  content: string;
  /** Additional CSS classes */
  className?: string;
  /** Component to render as (default: div) */
  as?: keyof JSX.IntrinsicElements;
  /** Maximum content length for security */
  maxLength?: number;
  /** Context for security logging */
  context?: string;
}

/**
 * Safe HTML renderer that prevents XSS attacks
 * Use this instead of dangerouslySetInnerHTML wherever possible
 */
export const SafeHtmlRenderer = memo<SafeHtmlRendererProps>(({
  content,
  className = '',
  as: Component = 'div',
  maxLength = 10000,
  context = 'unknown'
}) => {
  // Early validation
  if (!content || typeof content !== 'string') {
    return null;
  }

  // Length validation
  if (content.length > maxLength) {
    securityLogger.log({
      type: 'invalid_input',
      severity: 'medium',
      details: {
        reason: 'Content too long',
        length: content.length,
        maxLength,
        context
      }
    });
    return <Component className={className}>Content too long to display safely</Component>;
  }

  // XSS detection
  if (detectXSSAttempt(content)) {
    securityLogger.log({
      type: 'xss_attempt',
      severity: 'high',
      details: {
        content: content.substring(0, 100) + '...',
        context,
        blocked: true
      }
    });
    return <Component className={className}>Content blocked for security reasons</Component>;
  }

  // Sanitize content
  const sanitizedContent = sanitizeHtmlStrict(content);

  // Additional validation after sanitization
  if (!sanitizedContent) {
    return <Component className={className}>No safe content to display</Component>;
  }

  return (
    <Component 
      className={className}
      dangerouslySetInnerHTML={{ __html: sanitizedContent }}
    />
  );
});

SafeHtmlRenderer.displayName = 'SafeHtmlRenderer';

/**
 * Hook for safe text highlighting
 */
export const useSafeHighlight = () => {
  const highlightText = (text: string, searchTerm: string, maxLength: number = 1000) => {
    if (!text || !searchTerm || text.length > maxLength) return text;
    
    // XSS detection before processing
    if (detectXSSAttempt(text) || detectXSSAttempt(searchTerm)) {
      securityLogger.log({
        type: 'xss_attempt',
        severity: 'high',
        details: {
          function: 'useSafeHighlight',
          text: text.substring(0, 50),
          searchTerm: searchTerm.substring(0, 50)
        }
      });
      return text; // Return plain text if XSS detected
    }

    try {
      const escapedTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(${escapedTerm})`, 'gi');
      const highlighted = text.replace(regex, '<mark class="highlight-search">$1</mark>');
      return sanitizeHtmlStrict(highlighted);
    } catch (error) {
      console.error('Error in safe highlighting:', error);
      return text;
    }
  };

  return { highlightText };
};

/**
 * Safe wrapper for email content rendering
 */
export const SafeEmailContent = memo<{ content: string; className?: string }>(({ 
  content, 
  className = '' 
}) => {
  return (
    <SafeHtmlRenderer
      content={content}
      className={`email-content ${className}`}
      maxLength={50000}
      context="email_content"
    />
  );
});

SafeEmailContent.displayName = 'SafeEmailContent';