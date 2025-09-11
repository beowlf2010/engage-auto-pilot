
import { createPhoneNumbers, getPrimaryPhone } from "@/utils/phoneUtils";
import { checkForDuplicate, ProcessedLead } from "./duplicateDetection";
import { 
  parseClientName, 
  parseVehicleString, 
  parseSalesperson, 
  parsePrivacyFlag, 
  parseProspectTypeToStatus,
  cleanFieldValue,
  parseDmsId
} from "@/utils/csvDataParsers";

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
  soldCustomers: ProcessedLead[];
  soldCustomersCount: number;
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
  const soldCustomers: ProcessedLead[] = [];

  console.log('Processing leads with cleaned CSV data. Sample row:', csvData.sample);

  csvData.rows.forEach((row: any, index: number) => {
    try {
      // Enhanced name parsing - handle combined client name field
      let firstName = cleanFieldValue(row[mapping.firstName]);
      let lastName = cleanFieldValue(row[mapping.lastName]);
      let middleName = cleanFieldValue(row[mapping.middleName]);
      
      // If we have a combined client name field, parse it
      if (mapping.clientName && row[mapping.clientName] && !firstName && !lastName) {
        const parsedName = parseClientName(cleanFieldValue(row[mapping.clientName]));
        firstName = parsedName.firstName;
        lastName = parsedName.lastName;
        middleName = parsedName.middleName || middleName;
        console.log(`📝 [PROCESS LEADS] Parsed client name "${row[mapping.clientName]}" -> First: "${firstName}", Last: "${lastName}"`);
      }
      
      // Enhanced phone number handling - try multiple phone field sources
      const phoneFields = [
        row[mapping.contactPhone] || '',
        row[mapping.cellphone] || '',
        row[mapping.dayphone] || '',
        row[mapping.evephone] || ''
      ].filter(Boolean);
      
      const phoneResult = createPhoneNumbers(
        phoneFields[0] || '',
        phoneFields[1] || '',
        phoneFields[2] || ''
      );

      const phoneNumbers = phoneResult.phones;
      const primaryPhone = getPrimaryPhone(phoneNumbers);
      
      // Enhanced email handling
      const email = cleanFieldValue(row[mapping.contactEmail] || row[mapping.email]);
      const emailAlt = cleanFieldValue(row[mapping.emailAlt]);
      
      // Skip leads without basic contact info (name and phone/email)
      if (!firstName || !lastName) {
        errors.push({
          rowIndex: index + 1,
          error: 'First name and last name are required'
        });
        return;
      }
      
      if (!primaryPhone && !email) {
        errors.push({
          rowIndex: index + 1,
          error: 'At least one valid contact method (phone or email) is required'
        });
        return;
      }

      // Enhanced vehicle interest parsing
      let vehicleInterest = 'Not specified';
      
      // Try first desired vehicle
      if (mapping.firstDesiredVehicle && row[mapping.firstDesiredVehicle]) {
        const parsed = parseVehicleString(cleanFieldValue(row[mapping.firstDesiredVehicle]));
        vehicleInterest = parsed.fullString || vehicleInterest;
      } else {
        // Fallback to individual vehicle fields
        const vehicleParts = [
          cleanFieldValue(row[mapping.vehicleYear]),
          cleanFieldValue(row[mapping.vehicleMake]),
          cleanFieldValue(row[mapping.vehicleModel])
        ].filter(Boolean);
        
        if (vehicleParts.length > 0) {
          vehicleInterest = vehicleParts.join(' ');
        }
      }

      // Enhanced privacy flag parsing
      const doNotCall = parsePrivacyFlag(row[mapping.phonePrivacy]) || parsePrivacyFlag(row[mapping.doNotCall]);
      const doNotEmail = parsePrivacyFlag(row[mapping.emailPrivacy]) || parsePrivacyFlag(row[mapping.doNotEmail]);
      const doNotMail = parsePrivacyFlag(row[mapping.letterPrivacy]) || parsePrivacyFlag(row[mapping.doNotMail]);

      // Enhanced status mapping - try prospect type first
      let mappedStatus = 'new';
      if (mapping.prospectType && row[mapping.prospectType]) {
        mappedStatus = parseProspectTypeToStatus(cleanFieldValue(row[mapping.prospectType]));
      } else if (mapping.status && row[mapping.status]) {
        mappedStatus = mapStatusToSystemStatus(cleanFieldValue(row[mapping.status]));
      }

      // Enhanced salesperson parsing
      let salesPersonName = '';
      if (mapping.salesperson && row[mapping.salesperson]) {
        const parsedSales = parseSalesperson(cleanFieldValue(row[mapping.salesperson]));
        salesPersonName = `${parsedSales.firstName} ${parsedSales.lastName}`.trim();
      } else {
        salesPersonName = [
          cleanFieldValue(row[mapping.salesPersonFirstName]), 
          cleanFieldValue(row[mapping.salesPersonLastName])
        ].filter(Boolean).join(' ');
      }

      // Enhanced AI strategy field mapping
      const leadStatusTypeName = cleanFieldValue(row[mapping.leadStatusTypeName]);
      const leadTypeName = cleanFieldValue(row[mapping.leadTypeName] || row[mapping.prospectType]);
      const leadSourceName = cleanFieldValue(row[mapping.leadSourceName] || row[mapping.source]);
      
      // Create raw data object for fields not in main schema
      const rawUploadData: Record<string, any> = {};
      
      // Store additional fields that don't have direct schema mappings
      const additionalFields = [
        'businessUnit', 'historySold', 'historyService', 'bookValue', 
        'estPayoff', 'equityAmount', 'estMileage', 'paymentsLeft',
        'lastActivityType', 'lastActivityDate', 'lastActivityCompletedBy', 
        'lastActivityNote', 'vipStatus', 'secondDesiredVehicle',
        'firstOwnedVehicle', 'secondOwnedVehicle'
      ];
      
      additionalFields.forEach(field => {
        if (mapping[field as keyof typeof mapping] && row[mapping[field as keyof typeof mapping]]) {
          rawUploadData[field] = cleanFieldValue(row[mapping[field as keyof typeof mapping]]);
        }
      });

      const newLead: ProcessedLead = {
        firstName,
        lastName,
        middleName,
        phoneNumbers,
        primaryPhone,
        email,
        emailAlt,
        address: cleanFieldValue(row[mapping.address]),
        city: cleanFieldValue(row[mapping.city]),
        state: cleanFieldValue(row[mapping.state]),
        postalCode: cleanFieldValue(row[mapping.postalCode]),
        vehicleInterest,
        vehicleVIN: cleanFieldValue(row[mapping.vehicleVIN]),
        source: cleanFieldValue(row[mapping.source]) || leadSourceName || 'CSV Import',
        salesPersonName,
        doNotCall,
        doNotEmail,
        doNotMail,
        status: mappedStatus,
        // Enhanced AI strategy fields
        leadStatusTypeName,
        leadTypeName,
        leadSourceName,
        // Store DMS ID and other system fields
        externalId: parseDmsId(cleanFieldValue(row[mapping.dmsId])),
        rawUploadData
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
        
        // Track sold customers separately
        if (newLead.status === 'sold' || mappedStatus === 'bought elsewhere') {
          soldCustomers.push(newLead);
          console.log(`✅ Sold customer processed at row ${index + 1}: ${newLead.firstName} ${newLead.lastName} (Source: ${newLead.source})`);
        }
        
        console.log(`✅ Valid lead processed at row ${index + 1}: ${newLead.firstName} ${newLead.lastName} (Status: ${newLead.status}, Type: ${leadTypeName}, Source: ${leadSourceName})`);
      }

    } catch (error) {
      errors.push({
        rowIndex: index + 1,
        error: `Processing error: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
      console.error(`💥 Error processing row ${index + 1}:`, error);
    }
  });

  console.log(`📊 [PROCESS LEADS] Summary: ${validLeads.length} valid leads, ${soldCustomers.length} sold customers, ${duplicates.length} duplicates, ${errors.length} errors`);

  return {
    validLeads,
    duplicates,
    errors,
    soldCustomers,
    soldCustomersCount: soldCustomers.length
  };
};
