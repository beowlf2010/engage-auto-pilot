
import { PhoneNumber } from "@/types/lead";

export interface ProcessedLead {
  firstName: string;
  lastName: string;
  middleName?: string;
  phoneNumbers: PhoneNumber[];
  primaryPhone: string;
  email: string;
  emailAlt?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  vehicleInterest: string;
  vehicleVIN?: string;
  source: string;
  salesPersonName?: string;
  doNotCall: boolean;
  doNotEmail: boolean;
  doNotMail: boolean;
  status: string;
  // AI strategy fields
  leadStatusTypeName?: string;
  leadTypeName?: string;
  leadSourceName?: string;
  // Enhanced fields for advanced CSV processing
  externalId?: string;
  rawUploadData?: Record<string, any>;
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  duplicateType?: 'phone' | 'email' | 'name';
  conflictingLead?: ProcessedLead;
}

// Phone number normalization function
const normalizePhoneNumber = (phone: string): string => {
  if (!phone) return '';
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  // Handle US numbers (add 1 prefix if 10 digits)
  if (digits.length === 10) {
    return `1${digits}`;
  }
  return digits;
};

// Email normalization function
const normalizeEmail = (email: string): string => {
  if (!email) return '';
  return email.toLowerCase().trim();
};

// Name normalization function
const normalizeName = (first: string, last: string): string => {
  if (!first || !last) return '';
  return `${first.toLowerCase().trim()}_${last.toLowerCase().trim()}`;
};

export const checkForDuplicate = (newLead: ProcessedLead, existingLeads: ProcessedLead[]): DuplicateCheckResult => {
  const newPhoneNumbers = newLead.phoneNumbers.map(p => normalizePhoneNumber(p.number)).filter(Boolean);
  const newEmail = normalizeEmail(newLead.email);
  const newName = normalizeName(newLead.firstName, newLead.lastName);

  for (const existingLead of existingLeads) {
    // Check phone number duplicates
    const existingPhoneNumbers = existingLead.phoneNumbers.map(p => normalizePhoneNumber(p.number)).filter(Boolean);
    
    for (const newPhone of newPhoneNumbers) {
      if (existingPhoneNumbers.includes(newPhone)) {
        return {
          isDuplicate: true,
          duplicateType: 'phone',
          conflictingLead: existingLead
        };
      }
    }

    // Check email duplicates (only if both have emails)
    if (newEmail && normalizeEmail(existingLead.email) === newEmail) {
      return {
        isDuplicate: true,
        duplicateType: 'email',
        conflictingLead: existingLead
      };
    }

    // Check name duplicates (only if both have complete names)
    const existingName = normalizeName(existingLead.firstName, existingLead.lastName);
    if (newName && existingName === newName) {
      return {
        isDuplicate: true,
        duplicateType: 'name',
        conflictingLead: existingLead
      };
    }
  }

  return {
    isDuplicate: false
  };
};
