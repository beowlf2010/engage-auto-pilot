/**
 * Smart name validation service to detect non-personal identifiers
 * like cities, business names, and other geographic/business entities
 */

import { getLearnedNameValidation } from './nameValidationLearningService';

// Common US cities and states that might appear as "names"
const COMMON_CITIES = new Set([
  'pensacola', 'mobile', 'birmingham', 'huntsville', 'montgomery', 'tuscaloosa',
  'atlanta', 'savannah', 'augusta', 'columbus', 'macon', 'albany',
  'jacksonville', 'miami', 'tampa', 'orlando', 'tallahassee', 'gainesville',
  'new york', 'los angeles', 'chicago', 'houston', 'phoenix', 'philadelphia',
  'san antonio', 'san diego', 'dallas', 'san jose', 'austin', 'fort worth',
  'charlotte', 'memphis', 'boston', 'seattle', 'denver', 'nashville',
  'baltimore', 'louisville', 'portland', 'oklahoma city', 'milwaukee',
  'las vegas', 'albuquerque', 'tucson', 'fresno', 'sacramento', 'kansas city',
  'mesa', 'virginia beach', 'atlanta', 'colorado springs', 'omaha',
  'raleigh', 'long beach', 'miami', 'virginia beach', 'oakland', 'minneapolis',
  'tulsa', 'arlington', 'new orleans', 'wichita', 'cleveland', 'tampa',
  'honolulu', 'anaheim', 'lexington', 'stockton', 'corpus christi', 'henderson',
  'riverside', 'santa ana', 'lincoln', 'greensboro', 'plano', 'newark',
  'toledo', 'jersey city', 'chula vista', 'buffalo', 'fort wayne', 'chandler',
  'st petersburg', 'laredo', 'durham', 'irvine', 'madison', 'norfolk'
]);

const COMMON_STATES = new Set([
  'alabama', 'alaska', 'arizona', 'arkansas', 'california', 'colorado',
  'connecticut', 'delaware', 'florida', 'georgia', 'hawaii', 'idaho',
  'illinois', 'indiana', 'iowa', 'kansas', 'kentucky', 'louisiana',
  'maine', 'maryland', 'massachusetts', 'michigan', 'minnesota', 'mississippi',
  'missouri', 'montana', 'nebraska', 'nevada', 'new hampshire', 'new jersey',
  'new mexico', 'new york', 'north carolina', 'north dakota', 'ohio',
  'oklahoma', 'oregon', 'pennsylvania', 'rhode island', 'south carolina',
  'south dakota', 'tennessee', 'texas', 'utah', 'vermont', 'virginia',
  'washington', 'west virginia', 'wisconsin', 'wyoming'
]);

// Common business indicators
const BUSINESS_INDICATORS = [
  'llc', 'inc', 'corp', 'corporation', 'company', 'co', 'ltd', 'limited',
  'group', 'enterprises', 'solutions', 'services', 'systems', 'technologies',
  'automotive', 'motors', 'dealership', 'dealer', 'sales', 'auto'
];

// Generic/placeholder names that indicate poor data quality
const GENERIC_NAMES = new Set([
  'unknown', 'test', 'n/a', 'na', 'null', 'undefined', 'none', 'customer',
  'lead', 'prospect', 'caller', 'visitor', 'user', 'guest', 'anonymous',
  'not specified', 'not provided', 'no name', 'firstname', 'lastname',
  'name', 'enter name', 'your name', 'full name'
]);

// Phone number patterns
const PHONE_PATTERN = /^[\+]?[1]?[\s\-\(\)]?[\d\s\-\(\)]{10,}$/;

// Common personal names that should get higher confidence scores
const COMMON_PERSONAL_NAMES = new Set([
  'kimberly', 'jennifer', 'michael', 'david', 'susan', 'robert', 'lisa', 'james',
  'mary', 'john', 'patricia', 'william', 'elizabeth', 'richard', 'barbara',
  'thomas', 'helen', 'charles', 'nancy', 'christopher', 'karen', 'daniel',
  'betty', 'matthew', 'dorothy', 'anthony', 'sandra', 'mark', 'donna',
  'donald', 'carol', 'steven', 'ruth', 'paul', 'sharon', 'andrew', 'michelle',
  'connie', 'sarah', 'brian', 'laura', 'kevin', 'emily', 'george', 'amanda',
  'edward', 'melissa', 'ronald', 'deborah', 'timothy', 'stephanie', 'jason',
  'maria', 'jeffrey', 'catherine', 'ryan', 'christine', 'jacob', 'samantha',
  'gary', 'debra', 'nicholas', 'rachel', 'eric', 'carolyn', 'jonathan',
  'janet', 'stephen', 'virginia', 'larry', 'maria', 'justin', 'heather'
]);

export interface NameValidationResult {
  isValidPersonalName: boolean;
  confidence: number;
  detectedType: 'personal' | 'city' | 'state' | 'business' | 'generic' | 'phone' | 'unknown' | 'learned_override';
  userOverride?: boolean;
  timesApproved?: number;
  timesRejected?: number;
  timesSeen?: number;
  suggestions: {
    useGenericGreeting: boolean;
    contextualGreeting?: string;
    leadSourceHint?: string;
  };
}

export const validatePersonalName = async (name: string): Promise<NameValidationResult> => {
  if (!name || typeof name !== 'string') {
    return {
      isValidPersonalName: false,
      confidence: 0,
      detectedType: 'unknown',
      suggestions: {
        useGenericGreeting: true,
        contextualGreeting: 'Hello! Thanks for your interest in finding the right vehicle.'
      }
    };
  }

  // First, check if we have a learned decision for this name
  const learnedValidation = await getLearnedNameValidation(name);
  if (learnedValidation) {
    console.log(`🧠 [NAME VALIDATION] Using learned validation for "${name}"`);
    return learnedValidation;
  }

  // Fall back to original validation logic
  const cleanName = name.trim().toLowerCase();
  
  // Check for phone numbers
  if (PHONE_PATTERN.test(cleanName)) {
    return {
      isValidPersonalName: false,
      confidence: 0.95,
      detectedType: 'phone',
      suggestions: {
        useGenericGreeting: true,
        contextualGreeting: 'Hello! Thanks for calling about finding the right vehicle.',
        leadSourceHint: 'phone_call'
      }
    };
  }

  // Check for generic/placeholder names
  if (GENERIC_NAMES.has(cleanName)) {
    return {
      isValidPersonalName: false,
      confidence: 0.9,
      detectedType: 'generic',
      suggestions: {
        useGenericGreeting: true,
        contextualGreeting: 'Hello! Thanks for your interest in finding the right vehicle.'
      }
    };
  }

  // Check for cities
  if (COMMON_CITIES.has(cleanName)) {
    return {
      isValidPersonalName: false,
      confidence: 0.85,
      detectedType: 'city',
      suggestions: {
        useGenericGreeting: true,
        contextualGreeting: `Hello! Thanks for calling from the ${formatProperName(name)} area about finding the right vehicle.`,
        leadSourceHint: 'phone_call'
      }
    };
  }

  // Check for states
  if (COMMON_STATES.has(cleanName)) {
    return {
      isValidPersonalName: false,
      confidence: 0.8,
      detectedType: 'state',
      suggestions: {
        useGenericGreeting: true,
        contextualGreeting: `Hello! Thanks for calling from ${formatProperName(name)} about finding the right vehicle.`,
        leadSourceHint: 'phone_call'
      }
    };
  }

  // Check for business indicators
  const hasBusinessIndicator = BUSINESS_INDICATORS.some(indicator => 
    cleanName.includes(indicator)
  );
  
  if (hasBusinessIndicator) {
    return {
      isValidPersonalName: false,
      confidence: 0.75,
      detectedType: 'business',
      suggestions: {
        useGenericGreeting: true,
        contextualGreeting: 'Hello! Thanks for your business inquiry about finding the right vehicle.',
        leadSourceHint: 'business_inquiry'
      }
    };
  }

  // Check for multiple words that might indicate business name or address
  const words = cleanName.split(/\s+/);
  if (words.length > 3) {
    return {
      isValidPersonalName: false,
      confidence: 0.6,
      detectedType: 'unknown',
      suggestions: {
        useGenericGreeting: true,
        contextualGreeting: 'Hello! Thanks for your interest in finding the right vehicle.'
      }
    };
  }

  // Check for unusual patterns that suggest non-personal names
  const hasNumbers = /\d/.test(cleanName);
  const hasSpecialChars = /[^a-z\s\-\'\.]/i.test(cleanName);
  
  if (hasNumbers || hasSpecialChars) {
    return {
      isValidPersonalName: false,
      confidence: 0.7,
      detectedType: 'unknown',
      suggestions: {
        useGenericGreeting: true,
        contextualGreeting: 'Hello! Thanks for your interest in finding the right vehicle.'
      }
    };
  }

  // If we get here, it's likely a valid personal name
  // Check confidence based on common name patterns
  let confidence = 0.8;
  
  // Boost confidence for common personal names
  if (COMMON_PERSONAL_NAMES.has(cleanName)) {
    confidence = 0.9;
    console.log(`✅ [NAME VALIDATION] "${cleanName}" recognized as common personal name - confidence boosted to ${confidence}`);
  }
  
  // Single word names are less confident (unless they're common names)
  if (words.length === 1 && !COMMON_PERSONAL_NAMES.has(cleanName)) {
    confidence = 0.6;
  }
  
  // Very short or very long names are suspicious
  if (cleanName.length < 2 || cleanName.length > 25) {
    confidence = 0.4;
  }

  console.log(`📝 [NAME VALIDATION] Final assessment for "${cleanName}":`, {
    isValid: confidence > 0.5,
    confidence: confidence,
    detectedType: 'personal'
  });

  return {
    isValidPersonalName: confidence > 0.5,
    confidence,
    detectedType: 'personal',
    suggestions: {
      useGenericGreeting: confidence < 0.7,
      contextualGreeting: confidence < 0.7 ? 
        'Hello! Thanks for your interest in finding the right vehicle.' : 
        undefined
    }
  };
};

// Helper function to format proper names (reuse existing logic)
const formatProperName = (name: string): string => {
  if (!name || typeof name !== 'string') return '';
  
  const trimmed = name.trim();
  if (!trimmed) return '';
  
  return trimmed
    .split(' ')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
};

export const detectLeadSource = (leadData: any): string => {
  // Analyze lead data to detect likely source
  const name = leadData.first_name?.toLowerCase() || '';
  const lastName = leadData.last_name?.toLowerCase() || '';
  const phone = leadData.phone || '';
  const vehicleInterest = leadData.vehicle_interest || '';
  
  // Phone call indicators
  if (COMMON_CITIES.has(name) || COMMON_STATES.has(name)) {
    return 'phone_call';
  }
  
  // Web form indicators
  if (vehicleInterest && vehicleInterest !== 'Not specified' && name && !GENERIC_NAMES.has(name)) {
    return 'web_form';
  }
  
  // Bulk import indicators
  if (GENERIC_NAMES.has(name) || !name || name === lastName) {
    return 'bulk_import';
  }
  
  return 'unknown';
};

export const generateContextualGreeting = (
  leadData: any, 
  nameValidation: NameValidationResult,
  leadSource: string
): string => {
  const vehicleInterest = leadData.vehicle_interest || '';
  const hasVehicleInterest = vehicleInterest && vehicleInterest !== 'Not specified';
  
  // Use custom greeting from validation if available
  if (nameValidation.suggestions.contextualGreeting) {
    return nameValidation.suggestions.contextualGreeting;
  }
  
  // Generate source-specific greetings
  switch (leadSource) {
    case 'phone_call':
      return hasVehicleInterest 
        ? `Hello! Thanks for calling about the ${vehicleInterest}.`
        : 'Hello! Thanks for calling about finding the right vehicle.';
        
    case 'web_form':
      return hasVehicleInterest
        ? `Hello! Thanks for your interest in the ${vehicleInterest}.`
        : 'Hello! Thanks for your interest in finding the right vehicle.';
        
    case 'business_inquiry':
      return 'Hello! Thanks for your business inquiry about finding the right vehicle.';
      
    default:
      return hasVehicleInterest
        ? `Hello! Thanks for your interest in the ${vehicleInterest}.`
        : 'Hello! Thanks for your interest in finding the right vehicle.';
  }
};
