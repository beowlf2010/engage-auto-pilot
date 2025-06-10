
import { FieldMapping } from './types';

export const normalizeFieldName = (name: string): string => {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
};

export const findBestMatch = (targetPatterns: string[], headers: string[]): string => {
  console.log('Finding match for patterns:', targetPatterns, 'in headers:', headers);
  
  // First try exact matches (case sensitive) - highest priority
  for (const pattern of targetPatterns) {
    for (const header of headers) {
      if (header === pattern) {
        console.log('Exact case-sensitive match found:', header, 'for pattern:', pattern);
        return header;
      }
    }
  }
  
  // Then try exact matches (case insensitive)
  for (const pattern of targetPatterns) {
    for (const header of headers) {
      if (header.toLowerCase() === pattern.toLowerCase()) {
        console.log('Exact case-insensitive match found:', header, 'for pattern:', pattern);
        return header;
      }
    }
  }
  
  // Then try normalized matches
  for (const pattern of targetPatterns) {
    const normalizedPattern = normalizeFieldName(pattern);
    for (const header of headers) {
      const normalizedHeader = normalizeFieldName(header);
      if (normalizedHeader === normalizedPattern) {
        console.log('Normalized match found:', header, 'for pattern:', pattern);
        return header;
      }
    }
  }
  
  // Finally try partial matches
  for (const pattern of targetPatterns) {
    const normalizedPattern = normalizeFieldName(pattern);
    for (const header of headers) {
      const normalizedHeader = normalizeFieldName(header);
      if (normalizedHeader.includes(normalizedPattern) || normalizedPattern.includes(normalizedHeader)) {
        console.log('Partial match found:', header, 'for pattern:', pattern);
        return header;
      }
    }
  }
  
  return '';
};

export const performAutoDetection = (csvHeaders: string[]): FieldMapping => {
  console.log('Starting auto-detection with headers:', csvHeaders);
  
  const autoMapping: FieldMapping = {
    firstName: '',
    lastName: ''
  };

  // Define comprehensive field mapping patterns with your exact headers first
  const fieldPatterns: Record<keyof FieldMapping, string[]> = {
    firstName: ['firstname', 'SalesPersonFirstName', 'first_name', 'fname', 'first name', 'first', 'given name'],
    lastName: ['lastname', 'SalesPersonLastName', 'last_name', 'lname', 'last name', 'last', 'surname', 'family name'],
    middleName: ['middlename', 'middle_name', 'mname', 'middle name', 'middle', 'middle initial'],
    cellphone: ['cellphone', 'cell_phone', 'mobile', 'cell', 'cell phone', 'mobile phone', 'cellular'],
    dayphone: ['dayphone', 'day_phone', 'workphone', 'work_phone', 'day phone', 'work phone', 'business phone'],
    evephone: ['evephone', 'eve_phone', 'eveningphone', 'evening_phone', 'evening phone', 'home phone'],
    email: ['email', 'emailaddress', 'email_address', 'email address', 'e-mail', 'primary email'],
    emailAlt: ['emailalt', 'email_alt', 'alternatemail', 'secondary_email', 'email alt', 'alternate email', 'email2'],
    address: ['address', 'street', 'streetaddress', 'street address', 'street_address', 'addr'],
    city: ['city', 'town', 'municipality'],
    state: ['state', 'province', 'region', 'st'],
    postalCode: ['postalcode', 'postal_code', 'zipcode', 'zip_code', 'zip', 'postal code', 'zip code'],
    vehicleYear: ['VehicleYear', 'vehicleyear', 'vehicle_year', 'year', 'vehicle year', 'model year', 'car year'],
    vehicleMake: ['VehicleMake', 'vehiclemake', 'vehicle_make', 'make', 'vehicle make', 'car make', 'manufacturer'],
    vehicleModel: ['VehicleModel', 'vehiclemodel', 'vehicle_model', 'model', 'vehicle model', 'car model'],
    vehicleVIN: ['VehicleVIN', 'vehiclevin', 'vehicle_vin', 'vin', 'vehicle vin', 'vin number'],
    vehicleStockNumber: ['VehicleStockNumber', 'vehiclestocknumber', 'vehicle_stock_number', 'stocknumber', 'stock_number', 'vehicle stock number', 'stock number', 'stock'],
    source: ['leadsourcename', 'lead_source_name', 'source', 'lead_source', 'lead source name', 'lead source', 'referral source'],
    salesPersonFirstName: ['SalesPersonFirstName', 'salespersonfirstname', 'salesperson_first_name', 'sales_first_name', 'salesperson first name', 'rep first name'],
    salesPersonLastName: ['SalesPersonLastName', 'salespersonlastname', 'salesperson_last_name', 'sales_last_name', 'salesperson last name', 'rep last name'],
    doNotCall: ['DoNotCall', 'donotcall', 'do_not_call', 'dnc', 'do not call', 'no call'],
    doNotEmail: ['DoNotEmail', 'donotemail', 'do_not_email', 'dne', 'do not email', 'no email'],
    doNotMail: ['DoNotMail', 'donotmail', 'do_not_mail', 'dnm', 'do not mail', 'no mail'],
    leadType: ['LeadTypeName', 'leadtypename', 'lead_type_name', 'leadtype', 'lead_type', 'lead type name', 'lead type', 'type'],
    dealerId: ['dealerid', 'dealer_id', 'dealer', 'dealer id', 'dealership id']
  };

  // Apply pattern matching for each field
  Object.entries(fieldPatterns).forEach(([fieldKey, patterns]) => {
    const match = findBestMatch(patterns, csvHeaders);
    if (match) {
      autoMapping[fieldKey as keyof FieldMapping] = match;
      console.log(`Auto-detected ${fieldKey}:`, match);
    }
  });

  console.log('Final auto-mapping:', autoMapping);
  return autoMapping;
};
