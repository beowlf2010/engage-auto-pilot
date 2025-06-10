
import { createPhoneNumbers, getPrimaryPhone } from "@/utils/phoneUtils";
import { checkForDuplicate, ProcessedLead } from "./duplicateDetection";

export interface ProcessingResult {
  validLeads: ProcessedLead[];
  duplicates: Array<{
    lead: ProcessedLead;
    duplicateType: 'phone' | 'email' | 'name';
    conflictingLead: ProcessedLead;
    rowIndex: number;
  }>;
  errors: Array<{
    rowIndex: number;
    error: string;
  }>;
}

export const processLeads = (csvData: any, mapping: any): ProcessingResult => {
  const validLeads: ProcessedLead[] = [];
  const duplicates: ProcessingResult['duplicates'] = [];
  const errors: ProcessingResult['errors'] = [];

  csvData.rows.forEach((row: any, index: number) => {
    try {
      // Create phone numbers with priority
      const phoneNumbers = createPhoneNumbers(
        row[mapping.cellphone] || '',
        row[mapping.dayphone] || '',
        row[mapping.evephone] || ''
      );

      const primaryPhone = getPrimaryPhone(phoneNumbers);
      
      // Skip leads without valid phone numbers
      if (!primaryPhone) {
        errors.push({
          rowIndex: index + 1,
          error: 'No valid phone number found'
        });
        return;
      }

      // Combine vehicle information
      const vehicleParts = [
        row[mapping.vehicleYear] || '',
        row[mapping.vehicleMake] || '',
        row[mapping.vehicleModel] || ''
      ].filter(Boolean);
      
      const vehicleInterest = vehicleParts.length > 0 ? vehicleParts.join(' ') : 'Not specified';

      // Handle contact preferences
      const doNotCall = row[mapping.doNotCall]?.toLowerCase() === 'true';
      const doNotEmail = row[mapping.doNotEmail]?.toLowerCase() === 'true';

      const newLead: ProcessedLead = {
        firstName: row[mapping.firstName] || '',
        lastName: row[mapping.lastName] || '',
        middleName: row[mapping.middleName] || '',
        phoneNumbers,
        primaryPhone,
        email: row[mapping.email] || '',
        emailAlt: row[mapping.emailAlt] || '',
        address: row[mapping.address] || '',
        city: row[mapping.city] || '',
        state: row[mapping.state] || '',
        postalCode: row[mapping.postalCode] || '',
        vehicleInterest,
        vehicleVIN: row[mapping.vehicleVIN] || '',
        source: row[mapping.source] || 'CSV Import',
        salesPersonName: [row[mapping.salesPersonFirstName], row[mapping.salesPersonLastName]].filter(Boolean).join(' '),
        doNotCall,
        doNotEmail,
        doNotMail: row[mapping.doNotMail]?.toLowerCase() === 'true'
      };

      // Check for duplicates against already processed leads
      const duplicateCheck = checkForDuplicate(newLead, validLeads);
      
      if (duplicateCheck.isDuplicate && duplicateCheck.conflictingLead) {
        duplicates.push({
          lead: newLead,
          duplicateType: duplicateCheck.duplicateType!,
          conflictingLead: duplicateCheck.conflictingLead,
          rowIndex: index + 1
        });
        console.log(`Duplicate found at row ${index + 1}: ${duplicateCheck.duplicateType} conflict`);
      } else {
        validLeads.push(newLead);
        console.log(`Valid lead processed at row ${index + 1}: ${newLead.firstName} ${newLead.lastName}`);
      }

    } catch (error) {
      errors.push({
        rowIndex: index + 1,
        error: `Processing error: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  });

  return {
    validLeads,
    duplicates,
    errors
  };
};
