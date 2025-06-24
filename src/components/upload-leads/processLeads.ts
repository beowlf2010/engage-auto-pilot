
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

// Map VIN Evolution and other external statuses to our system statuses
const mapStatusToSystemStatus = (inputStatus: string): string => {
  if (!inputStatus) return 'new';
  
  const normalizedStatus = inputStatus.toLowerCase().trim();
  
  // VIN Evolution status mappings
  const statusMappings: Record<string, string> = {
    'active': 'active',
    'sold': 'sold', 
    'bad': 'bad',
    'pending': 'pending',
    'new': 'new',
    'engaged': 'engaged',
    'contacted': 'contacted',
    'follow up': 'follow_up',
    'follow_up': 'follow_up',
    'not interested': 'not_interested',
    'not_interested': 'not_interested',
    'paused': 'paused',
    'closed': 'closed',
    'lost': 'lost',
    // Common variations
    'hot': 'engaged',
    'warm': 'follow_up',
    'cold': 'paused',
    'dead': 'bad',
    'complete': 'closed',
    'completed': 'closed',
    'converted': 'closed'
  };
  
  const mappedStatus = statusMappings[normalizedStatus];
  if (mappedStatus) {
    console.log(`Mapped status '${inputStatus}' to '${mappedStatus}'`);
    return mappedStatus;
  }
  
  // If no mapping found, default to 'new' and log for review
  console.log(`Unknown status '${inputStatus}' defaulted to 'new'`);
  return 'new';
};

export const processLeads = (csvData: any, mapping: any): ProcessingResult => {
  const validLeads: ProcessedLead[] = [];
  const duplicates: ProcessingResult['duplicates'] = [];
  const errors: ProcessingResult['errors'] = [];

  console.log('Processing leads with cleaned CSV data. Sample row:', csvData.sample);

  csvData.rows.forEach((row: any, index: number) => {
    try {
      // Data is already cleaned by the unified CSV parser
      // No need for additional quote removal since cleanFieldValue handles it
      
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

      // Combine vehicle information - data is already clean
      const vehicleParts = [
        row[mapping.vehicleYear] || '',
        row[mapping.vehicleMake] || '',
        row[mapping.vehicleModel] || ''
      ].filter(Boolean);
      
      const vehicleInterest = vehicleParts.length > 0 ? vehicleParts.join(' ') : 'Not specified';

      // Handle contact preferences
      const doNotCall = row[mapping.doNotCall]?.toLowerCase() === 'true';
      const doNotEmail = row[mapping.doNotEmail]?.toLowerCase() === 'true';

      // Map the status from CSV to our system status
      const mappedStatus = mapStatusToSystemStatus(row[mapping.status] || '');

      // Capture lead factors for AI strategy
      const leadStatusTypeName = row[mapping.leadstatustypename] || '';
      const leadTypeName = row[mapping.LeadTypeName] || '';
      const leadSourceName = row[mapping.leadsourcename] || row[mapping.source] || '';

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
        doNotMail: row[mapping.doNotMail]?.toLowerCase() === 'true',
        status: mappedStatus,
        // New lead factors for AI strategy
        leadStatusTypeName,
        leadTypeName,
        leadSourceName
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
        console.log(`Valid lead processed at row ${index + 1}: ${newLead.firstName} ${newLead.lastName} (Status: ${newLead.status}, Factors: ${leadStatusTypeName}/${leadTypeName}/${leadSourceName})`);
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
