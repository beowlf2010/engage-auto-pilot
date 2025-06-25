
/**
 * Utility functions for formatting names consistently
 * (Copy of src/utils/nameFormatter.ts for edge function use)
 */

export const formatProperName = (name: string): string => {
  if (!name || typeof name !== 'string') return '';
  
  // Trim whitespace
  const trimmed = name.trim();
  if (!trimmed) return '';
  
  // Split by spaces to handle multiple names
  return trimmed
    .split(' ')
    .map(part => formatNamePart(part))
    .join(' ');
};

const formatNamePart = (part: string): string => {
  if (!part) return '';
  
  // Convert to lowercase first
  const lower = part.toLowerCase();
  
  // Handle hyphenated names (e.g., "mary-ann")
  if (lower.includes('-')) {
    return lower
      .split('-')
      .map(segment => capitalizeSegment(segment))
      .join('-');
  }
  
  // Handle apostrophe names (e.g., "o'connor")
  if (lower.includes("'")) {
    return lower
      .split("'")
      .map((segment, index) => {
        if (index === 0) return capitalizeSegment(segment);
        // Special handling for common patterns like O'Connor, McDonald
        if (segment.toLowerCase().startsWith('mc') || segment.toLowerCase().startsWith('mac')) {
          return capitalizeSegment(segment);
        }
        return capitalizeSegment(segment);
      })
      .join("'");
  }
  
  // Handle "Mc" and "Mac" prefixes
  if (lower.startsWith('mc') && lower.length > 2) {
    return 'Mc' + capitalizeSegment(lower.slice(2));
  }
  
  if (lower.startsWith('mac') && lower.length > 3) {
    return 'Mac' + capitalizeSegment(lower.slice(3));
  }
  
  // Standard capitalization
  return capitalizeSegment(lower);
};

const capitalizeSegment = (segment: string): string => {
  if (!segment) return '';
  return segment.charAt(0).toUpperCase() + segment.slice(1);
};

// Format full name (first + last)
export const formatFullName = (firstName: string, lastName: string): string => {
  const formattedFirst = formatProperName(firstName);
  const formattedLast = formatProperName(lastName);
  
  if (formattedFirst && formattedLast) {
    return `${formattedFirst} ${formattedLast}`;
  }
  
  return formattedFirst || formattedLast || '';
};

// Get first name only, properly formatted
export const getFirstName = (fullName: string): string => {
  if (!fullName) return '';
  const formatted = formatProperName(fullName);
  return formatted.split(' ')[0] || '';
};
