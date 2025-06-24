
import { FieldMapping } from './types';

// Common patterns for field detection
const fieldPatterns: Record<keyof FieldMapping, string[]> = {
  firstName: ['first_name', 'firstname', 'first name', 'fname', 'given_name'],
  lastName: ['last_name', 'lastname', 'last name', 'lname', 'surname', 'family_name'],
  middleName: ['middle_name', 'middlename', 'middle name', 'mname', 'middle_initial', 'mi'],
  cellphone: ['cellphone', 'cell_phone', 'cell phone', 'mobile', 'mobile_phone', 'primary_phone'],
  dayphone: ['dayphone', 'day_phone', 'day phone', 'work_phone', 'business_phone', 'office_phone'],
  evephone: ['evephone', 'eve_phone', 'evening_phone', 'home_phone', 'secondary_phone'],
  email: ['email', 'email_address', 'primary_email', 'e_mail'],
  emailAlt: ['email_alt', 'email2', 'secondary_email', 'alternate_email', 'email_secondary'],
  address: ['address', 'street_address', 'street', 'address1', 'home_address'],
  city: ['city', 'town', 'locality'],
  state: ['state', 'province', 'region', 'state_province'],
  postalCode: ['postal_code', 'zip_code', 'zip', 'postcode', 'postal'],
  vehicleYear: ['vehicle_year', 'year', 'model_year', 'yr'],
  vehicleMake: ['vehicle_make', 'make', 'manufacturer', 'brand'],
  vehicleModel: ['vehicle_model', 'model', 'car_model'],
  vehicleVIN: ['vehicle_vin', 'vin', 'vin_number', 'chassis_number'],
  vehicleStockNumber: ['stock_number', 'stock_no', 'inventory_number', 'unit_number'],
  source: ['source', 'lead_source', 'referral_source', 'campaign_source'],
  salesPersonFirstName: ['salesperson_first_name', 'sales_first_name', 'rep_first_name', 'advisor_first_name'],
  salesPersonLastName: ['salesperson_last_name', 'sales_last_name', 'rep_last_name', 'advisor_last_name'],
  doNotCall: ['do_not_call', 'dnc', 'no_call', 'opt_out_call'],
  doNotEmail: ['do_not_email', 'dne', 'no_email', 'opt_out_email'],
  doNotMail: ['do_not_mail', 'dnm', 'no_mail', 'opt_out_mail'],
  leadType: ['lead_type', 'type', 'customer_type', 'prospect_type'],
  dealerId: ['dealer_id', 'dealership_id', 'location_id'],
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
  
  // Auto-detect each field
  Object.entries(fieldPatterns).forEach(([fieldKey, patterns]) => {
    for (const pattern of patterns) {
      const headerIndex = lowerHeaders.findIndex(h => 
        h === pattern || 
        h.includes(pattern) || 
        pattern.includes(h)
      );
      
      if (headerIndex !== -1) {
        mapping[fieldKey as keyof FieldMapping] = headers[headerIndex];
        console.log(`Auto-detected ${fieldKey}: ${headers[headerIndex]}`);
        break;
      }
    }
  });

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
