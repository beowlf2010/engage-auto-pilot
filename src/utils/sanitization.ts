import DOMPurify, { Config } from 'dompurify';

/**
 * Sanitize HTML content to prevent XSS attacks
 * @param html - Raw HTML content
 * @param options - DOMPurify configuration options
 * @returns Sanitized HTML string
 */
export const sanitizeHtml = (html: string, options?: Config): string => {
  if (!html || typeof html !== 'string') {
    return '';
  }

  const defaultOptions: Config = {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'span', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'a'],
    ALLOWED_ATTR: ['href', 'title', 'target', 'rel', 'class'],
    ALLOW_DATA_ATTR: false,
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input', 'textarea', 'select', 'button'],
    FORBID_ATTR: ['onclick', 'onload', 'onerror', 'onmouseover', 'onmouseout', 'onfocus', 'onblur', 'onkeydown', 'onkeyup', 'onsubmit'],
    FORCE_BODY: false,
    SANITIZE_DOM: true,
    SANITIZE_NAMED_PROPS: true,
    KEEP_CONTENT: true,
    RETURN_DOM: false,
    RETURN_DOM_FRAGMENT: false,
    RETURN_TRUSTED_TYPE: false
  };

  const config = { ...defaultOptions, ...options };
  return DOMPurify.sanitize(html, config) as string;
};

/**
 * Sanitize search query highlighting - more restrictive for search results
 * @param html - HTML with search highlighting
 * @returns Sanitized HTML with only highlighting tags
 */
export const sanitizeSearchHighlight = (html: string): string => {
  return sanitizeHtml(html, {
    ALLOWED_TAGS: ['mark', 'span', 'strong', 'em'],
    ALLOWED_ATTR: ['class'],
    KEEP_CONTENT: true
  });
};

/**
 * Sanitize email content - allows more formatting for email display
 * @param html - Email HTML content
 * @returns Sanitized email HTML
 */
export const sanitizeEmailContent = (html: string): string => {
  return sanitizeHtml(html, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'span', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'a', 'img', 'table', 'tr', 'td', 'th', 'tbody', 'thead'],
    ALLOWED_ATTR: ['href', 'title', 'target', 'rel', 'class', 'style', 'src', 'alt', 'width', 'height', 'align', 'border', 'cellpadding', 'cellspacing'],
    ALLOW_DATA_ATTR: false,
    SANITIZE_NAMED_PROPS: true
  });
};

/**
 * Strip all HTML tags and return plain text
 * @param html - HTML content
 * @returns Plain text content
 */
export const stripHtml = (html: string): string => {
  if (!html || typeof html !== 'string') {
    return '';
  }
  return DOMPurify.sanitize(html, { ALLOWED_TAGS: [] });
};

/**
 * Validate and sanitize user input for database storage
 * @param input - User input string
 * @param maxLength - Maximum allowed length
 * @returns Sanitized input string
 */
export const sanitizeUserInput = (input: string, maxLength: number = 1000): string => {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // Strip all HTML tags for user input
  const sanitized = stripHtml(input);
  
  // Trim whitespace and limit length
  return sanitized.trim().substring(0, maxLength);
};