
import { FieldMapping } from './types';

// Common patterns for field detection - UPDATED to prioritize customer fields over salesperson fields
const fieldPatterns: Record<keyof FieldMapping, string[]> = {
  // Customer name fields - prioritize actual customer fields over salesperson fields
  firstName: ['firstname', 'first_name', 'first name', 'fname', 'given_name', 'customer_first_name', 'cust_first_name'],
  lastName: ['lastname', 'last_name', 'last name', 'lname', 'surname', 'family_name', 'customer_last_name', 'cust_last_name'],
  middleName: ['middlename', 'middle_name', 'middle name', 'mname', 'middle_initial', 'mi'],
  cellphone: ['cellphone', 'cell_phone', 'cell phone', 'mobile', 'mobile_phone', 'primary_phone'],
  dayphone: ['dayphone', 'day_phone', 'day phone', 'work_phone', 'business_phone', 'office_phone'],
  evephone: ['evephone', 'eve_phone', 'evening_phone', 'home_phone', 'secondary_phone'],
  email: ['email', 'email_address', 'primary_email', 'e_mail'],
  emailAlt: ['emailalt', 'email_alt', 'email2', 'secondary_email', 'alternate_email', 'email_secondary'],
  address: ['address', 'street_address', 'street', 'address1', 'home_address'],
  city: ['city', 'town', 'locality'],
  state: ['state', 'province', 'region', 'state_province'],
  postalCode: ['postalcode', 'postal_code', 'zip_code', 'zip', 'postcode', 'postal'],
  vehicleYear: ['vehicleyear', 'vehicle_year', 'year', 'model_year', 'yr'],
  vehicleMake: ['vehiclemake', 'vehicle_make', 'make', 'manufacturer', 'brand'],
  vehicleModel: ['vehiclemodel', 'vehicle_model', 'model', 'car_model'],
  vehicleVIN: ['vehiclevin', 'vehicle_vin', 'vin', 'vin_number', 'chassis_number'],
  vehicleStockNumber: ['vehiclestocknumber', 'stock_number', 'stock_no', 'inventory_number', 'unit_number'],
  source: ['source', 'lead_source', 'referral_source', 'campaign_source'],
  // Salesperson fields - these should map to salesperson, not customer names
  salesPersonFirstName: ['salesperson_first_name', 'salespersonfirstname', 'sales_first_name', 'rep_first_name', 'advisor_first_name'],
  salesPersonLastName: ['salesperson_last_name', 'salespersonlastname', 'sales_last_name', 'rep_last_name', 'advisor_last_name'],
  doNotCall: ['donotcall', 'do_not_call', 'dnc', 'no_call', 'opt_out_call'],
  doNotEmail: ['donotemail', 'do_not_email', 'dne', 'no_email', 'opt_out_email'],
  doNotMail: ['donotmail', 'do_not_mail', 'dnm', 'no_mail', 'opt_out_mail'],
  leadType: ['lead_type', 'type', 'customer_type', 'prospect_type'],
  dealerId: ['dealerid', 'dealer_id', 'dealership_id', 'location_id'],
  status: ['status', 'lead_status', 'stage', 'disposition'],
  // AI Strategy Fields - exact matches for CSV columns
  leadStatusTypeName: ['leadstatustypename', 'lead_status_type_name', 'statustype', 'status_type'],
  leadTypeName: ['leadtypename', 'lead_type_name', 'type_name'],
  leadSourceName: ['leadsourcename', 'lead_source_name', 'source_name']
};

export const performAutoDetection = (headers: string[]): FieldMapping => {
  const mapping: Partial<FieldMapping> = {};
  
  // Convert headers to lowercase for comparison
  const lowerHeaders = headers.map(h => h.toLowerCase());
  
  console.log('🔍 [FIELD MAPPING] Headers found:', headers);
  console.log('🔍 [FIELD MAPPING] Lowercase headers:', lowerHeaders);
  
  // Auto-detect each field with improved logic
  Object.entries(fieldPatterns).forEach(([fieldKey, patterns]) => {
    for (const pattern of patterns) {
      const headerIndex = lowerHeaders.findIndex(h => {
        // Exact match first (highest priority)
        if (h === pattern) return true;
        // Contains match (lower priority)
        if (h.includes(pattern) || pattern.includes(h)) return true;
        return false;
      });
      
      if (headerIndex !== -1) {
        mapping[fieldKey as keyof FieldMapping] = headers[headerIndex];
        console.log(`✅ [FIELD MAPPING] Auto-detected ${fieldKey}: ${headers[headerIndex]} (pattern: ${pattern})`);
        break;
      }
    }
  });

  // Special validation to prevent salesperson names from being mapped to customer names
  if (mapping.firstName && mapping.firstName.toLowerCase().includes('salesperson')) {
    console.warn('⚠️ [FIELD MAPPING] Removing incorrect firstName mapping from salesperson field:', mapping.firstName);
    delete mapping.firstName;
  }
  
  if (mapping.lastName && mapping.lastName.toLowerCase().includes('salesperson')) {
    console.warn('⚠️ [FIELD MAPPING] Removing incorrect lastName mapping from salesperson field:', mapping.lastName);
    delete mapping.lastName;
  }

  // Try to find actual customer name fields if we don't have them
  if (!mapping.firstName) {
    const customerFirstNameIndex = lowerHeaders.findIndex(h => 
      h === 'firstname' || h === 'first_name' || h === 'fname'
    );
    if (customerFirstNameIndex !== -1) {
      mapping.firstName = headers[customerFirstNameIndex];
      console.log(`🔄 [FIELD MAPPING] Found customer firstName: ${headers[customerFirstNameIndex]}`);
    }
  }

  if (!mapping.lastName) {
    const customerLastNameIndex = lowerHeaders.findIndex(h => 
      h === 'lastname' || h === 'last_name' || h === 'lname'
    );
    if (customerLastNameIndex !== -1) {
      mapping.lastName = headers[customerLastNameIndex];
      console.log(`🔄 [FIELD MAPPING] Found customer lastName: ${headers[customerLastNameIndex]}`);
    }
  }

  console.log('🎯 [FIELD MAPPING] Final mapping result:', mapping);
  return mapping as FieldMapping;
};

export const validateMapping = (mapping: FieldMapping): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!mapping.firstName) {
    errors.push('First Name is required');
  }
  
  if (!mapping.lastName) {
    errors.push('Last Name is required');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};
