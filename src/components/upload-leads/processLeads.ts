
import { createPhoneNumbers, getPrimaryPhone } from "@/utils/phoneUtils";

export const processLeads = (csvData: any, mapping: any) => {
  return csvData.rows.map((row: any) => {
    // Create phone numbers with priority
    const phoneNumbers = createPhoneNumbers(
      row[mapping.cellphone] || '',
      row[mapping.dayphone] || '',
      row[mapping.evephone] || ''
    );

    const primaryPhone = getPrimaryPhone(phoneNumbers);
    
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

    return {
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
  });
};
