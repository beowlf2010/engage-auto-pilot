
import { PhoneNumber } from '@/types/lead';

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
  salesPersonName: string;
  doNotCall: boolean;
  doNotEmail: boolean;
  doNotMail: boolean;
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  duplicateType: 'phone' | 'email' | 'name' | null;
  conflictingLead?: ProcessedLead;
}

const normalizePhone = (phone: string): string => {
  return phone.replace(/\D/g, '');
};

const normalizeEmail = (email: string): string => {
  return email.toLowerCase().trim();
};

const normalizeName = (firstName: string, lastName: string): string => {
  return `${firstName.toLowerCase().trim()} ${lastName.toLowerCase().trim()}`;
};

export const checkForDuplicate = (
  newLead: ProcessedLead,
  existingLeads: ProcessedLead[]
): DuplicateCheckResult => {
  // Check for phone number duplicates (highest priority)
  if (newLead.primaryPhone) {
    const newPhone = normalizePhone(newLead.primaryPhone);
    for (const existing of existingLeads) {
      if (existing.primaryPhone) {
        const existingPhone = normalizePhone(existing.primaryPhone);
        if (newPhone === existingPhone) {
          return {
            isDuplicate: true,
            duplicateType: 'phone',
            conflictingLead: existing
          };
        }
      }
    }
  }

  // Check for email duplicates
  if (newLead.email) {
    const newEmail = normalizeEmail(newLead.email);
    for (const existing of existingLeads) {
      if (existing.email) {
        const existingEmail = normalizeEmail(existing.email);
        if (newEmail === existingEmail) {
          return {
            isDuplicate: true,
            duplicateType: 'email',
            conflictingLead: existing
          };
        }
      }
    }
  }

  // Check for name duplicates (lowest priority)
  if (newLead.firstName && newLead.lastName) {
    const newName = normalizeName(newLead.firstName, newLead.lastName);
    for (const existing of existingLeads) {
      if (existing.firstName && existing.lastName) {
        const existingName = normalizeName(existing.firstName, existing.lastName);
        if (newName === existingName) {
          return {
            isDuplicate: true,
            duplicateType: 'name',
            conflictingLead: existing
          };
        }
      }
    }
  }

  return {
    isDuplicate: false,
    duplicateType: null
  };
};
