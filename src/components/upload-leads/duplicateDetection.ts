
import { PhoneNumber } from "@/types/lead";

export interface ProcessedLead {
  firstName: string;
  lastName: string;
  middleName: string;
  phoneNumbers: PhoneNumber[];
  primaryPhone: string;
  email: string;
  emailAlt: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  vehicleInterest: string;
  vehicleVIN: string;
  source: string;
  salesPersonName: string;
  doNotCall: boolean;
  doNotEmail: boolean;
  doNotMail: boolean;
  status: string;
}

export interface DuplicateCheck {
  isDuplicate: boolean;
  duplicateType?: 'phone' | 'email' | 'name';
  conflictingLead?: ProcessedLead;
}

const normalizePhone = (phone: string): string => {
  return phone.replace(/\D/g, '');
};

const normalizeName = (firstName: string, lastName: string): string => {
  return `${firstName.toLowerCase().trim()} ${lastName.toLowerCase().trim()}`;
};

const normalizeEmail = (email: string): string => {
  return email.toLowerCase().trim();
};

export const checkForDuplicate = (newLead: ProcessedLead, existingLeads: ProcessedLead[]): DuplicateCheck => {
  // Check for phone number duplicates (highest priority)
  if (newLead.primaryPhone) {
    const normalizedNewPhone = normalizePhone(newLead.primaryPhone);
    
    for (const existingLead of existingLeads) {
      if (existingLead.primaryPhone) {
        const normalizedExistingPhone = normalizePhone(existingLead.primaryPhone);
        if (normalizedNewPhone === normalizedExistingPhone) {
          return {
            isDuplicate: true,
            duplicateType: 'phone',
            conflictingLead: existingLead
          };
        }
      }
      
      // Also check against all phone numbers of existing lead
      for (const phoneNumber of existingLead.phoneNumbers) {
        const normalizedExistingPhone = normalizePhone(phoneNumber.number);
        if (normalizedNewPhone === normalizedExistingPhone) {
          return {
            isDuplicate: true,
            duplicateType: 'phone',
            conflictingLead: existingLead
          };
        }
      }
    }
  }

  // Check for email duplicates (medium priority)
  if (newLead.email) {
    const normalizedNewEmail = normalizeEmail(newLead.email);
    
    for (const existingLead of existingLeads) {
      if (existingLead.email && normalizeEmail(existingLead.email) === normalizedNewEmail) {
        return {
          isDuplicate: true,
          duplicateType: 'email',
          conflictingLead: existingLead
        };
      }
      if (existingLead.emailAlt && normalizeEmail(existingLead.emailAlt) === normalizedNewEmail) {
        return {
          isDuplicate: true,
          duplicateType: 'email',
          conflictingLead: existingLead
        };
      }
    }
  }

  // Check for name duplicates (lowest priority, only if both first and last name match)
  if (newLead.firstName && newLead.lastName) {
    const normalizedNewName = normalizeName(newLead.firstName, newLead.lastName);
    
    for (const existingLead of existingLeads) {
      if (existingLead.firstName && existingLead.lastName) {
        const normalizedExistingName = normalizeName(existingLead.firstName, existingLead.lastName);
        if (normalizedNewName === normalizedExistingName) {
          return {
            isDuplicate: true,
            duplicateType: 'name',
            conflictingLead: existingLead
          };
        }
      }
    }
  }

  return {
    isDuplicate: false
  };
};
