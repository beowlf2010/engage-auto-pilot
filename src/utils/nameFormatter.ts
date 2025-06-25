
/**
 * Utility functions for formatting names consistently
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

// Enhanced validation helpers
export const isLikelyPersonalName = (name: string): boolean => {
  if (!name || typeof name !== 'string') return false;
  
  const cleanName = name.trim().toLowerCase();
  
  // Common cities that are often mistaken for names
  const commonCities = [
    'pensacola', 'mobile', 'birmingham', 'huntsville', 'montgomery',
    'atlanta', 'savannah', 'jacksonville', 'miami', 'tampa', 'orlando'
  ];
  
  // Common states
  const commonStates = [
    'alabama', 'florida', 'georgia', 'mississippi', 'tennessee', 'texas'
  ];
  
  // Generic placeholders
  const genericNames = [
    'unknown', 'test', 'customer', 'lead', 'prospect', 'n/a', 'na', 'none'
  ];
  
  // Check if it's a known non-personal identifier
  if (commonCities.includes(cleanName) || 
      commonStates.includes(cleanName) || 
      genericNames.includes(cleanName)) {
    return false;
  }
  
  // Check for business indicators
  const businessKeywords = ['llc', 'inc', 'corp', 'company', 'auto', 'motors'];
  if (businessKeywords.some(keyword => cleanName.includes(keyword))) {
    return false;
  }
  
  // Check for phone number patterns
  if (/^\+?[\d\s\-\(\)]{10,}$/.test(cleanName)) {
    return false;
  }
  
  // If it passes basic checks, it's likely a personal name
  return true;
};

export const getNameConfidenceScore = (name: string): number => {
  if (!isLikelyPersonalName(name)) {
    return 0;
  }
  
  const cleanName = name.trim();
  let confidence = 0.8;
  
  // Adjust confidence based on various factors
  if (cleanName.length < 2 || cleanName.length > 25) {
    confidence -= 0.3;
  }
  
  if (cleanName.split(' ').length === 1) {
    confidence -= 0.1; // Single names are slightly less confident
  }
  
  if (/\d/.test(cleanName)) {
    confidence -= 0.4; // Numbers in names are suspicious
  }
  
  return Math.max(0, Math.min(1, confidence));
};

export const shouldUsePersonalGreeting = (name: string): boolean => {
  return isLikelyPersonalName(name) && getNameConfidenceScore(name) > 0.6;
};
