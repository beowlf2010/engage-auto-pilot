
import { FieldMapping } from './types';
import { parseClientName, parseSalesperson } from '@/utils/csvDataParsers';

// Enhanced patterns for field detection - includes user's specific CSV format
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
  leadSourceName: ['leadsourcename', 'lead_source_name', 'source_name'],
  
  // Enhanced fields for user's specific CSV format
  clientName: ['client name', 'clientname', 'customer_name', 'full_name', 'name'],
  prospectType: ['prospect type', 'prospecttype', 'customer_type', 'lead_category'],
  businessUnit: ['business unit', 'businessunit', 'unit', 'department', 'division'],
  phonePrivacy: ['phone privacy', 'phoneprivacy', 'phone_opt_out', 'call_privacy'],
  emailPrivacy: ['email privacy', 'emailprivacy', 'email_opt_out', 'email_preference'],
  letterPrivacy: ['letterprivacy', 'letter_privacy', 'mail_privacy', 'mail_opt_out'],
  contactPhone: ['contact phone', 'contactphone', 'phone', 'primary_phone', 'main_phone'],
  contactEmail: ['contact email', 'contactemail', 'primary_email', 'main_email'],
  historySold: ['history sold', 'historysold', 'sales_history', 'sold_count'],
  historyService: ['history service', 'historyservice', 'service_history', 'service_count'],
  bookValue: ['book value', 'bookvalue', 'trade_value', 'vehicle_value'],
  estPayoff: ['est. payoff', 'est payoff', 'estimated_payoff', 'payoff_amount'],
  equityAmount: ['equity amount', 'equityamount', 'equity', 'trade_equity'],
  estMileage: ['est. mileage', 'est mileage', 'estimated_mileage', 'mileage'],
  paymentsLeft: ['# of payments left', 'payments left', 'paymentsleft', 'remaining_payments'],
  lastActivityType: ['last activity type', 'lastactivitytype', 'activity_type', 'last_action'],
  lastActivityDate: ['last activity date', 'lastactivitydate', 'activity_date', 'last_contact'],
  lastActivityCompletedBy: ['last activity completed by', 'lastactivitycompletedby', 'completed_by', 'contact_by'],
  lastActivityNote: ['last activity note', 'lastactivitynote', 'activity_note', 'notes'],
  dmsId: ['dms id #', 'dms id', 'dmsid', 'dealer_id', 'customer_id'],
  vipStatus: ['vip', 'vip_status', 'priority', 'special_customer'],
  firstDesiredVehicle: ['first desired vehicle', 'firstdesiredvehicle', 'desired_vehicle_1', 'interest_1'],
  secondDesiredVehicle: ['second desired vehicle', 'seconddesiredvehicle', 'desired_vehicle_2', 'interest_2'],
  firstOwnedVehicle: ['first owned vehicle', 'firstownedvehicle', 'owned_vehicle_1', 'trade_1'],
  secondOwnedVehicle: ['second owned vehicle', 'secondownedvehicle', 'owned_vehicle_2', 'trade_2'],
  salesperson: ['salesperson', 'sales_person', 'advisor', 'consultant', 'rep']
};

export const performAutoDetection = (headers: string[]): FieldMapping => {
  const mapping: Partial<FieldMapping> = {};
  
  // Convert headers to lowercase for comparison
  const lowerHeaders = headers.map(h => h.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim());
  
  console.log('🔍 [FIELD MAPPING] Headers found:', headers);
  console.log('🔍 [FIELD MAPPING] Normalized headers:', lowerHeaders);
  
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

  // Special handling for combined client name field
  if (mapping.clientName && !mapping.firstName && !mapping.lastName) {
    console.log('🔄 [FIELD MAPPING] Found combined client name field, will parse during processing');
  }

  // Special validation to prevent salesperson names from being mapped to customer names
  if (mapping.firstName && mapping.firstName.toLowerCase().includes('salesperson')) {
    console.warn('⚠️ [FIELD MAPPING] Removing incorrect firstName mapping from salesperson field:', mapping.firstName);
    delete mapping.firstName;
  }
  
  if (mapping.lastName && mapping.lastName.toLowerCase().includes('salesperson')) {
    console.warn('⚠️ [FIELD MAPPING] Removing incorrect lastName mapping from salesperson field:', mapping.lastName);
    delete mapping.lastName;
  }

  // Enhanced name field detection for combined formats
  if (!mapping.firstName && !mapping.lastName && !mapping.clientName) {
    // Look for any name-like field
    const nameFieldIndex = lowerHeaders.findIndex(h => 
      h.includes('name') || h.includes('client') || h.includes('customer')
    );
    if (nameFieldIndex !== -1) {
      mapping.clientName = headers[nameFieldIndex];
      console.log(`🔄 [FIELD MAPPING] Found name field: ${headers[nameFieldIndex]}`);
    }
  }

  // Map contact phone if no specific phone fields found
  if (!mapping.cellphone && !mapping.dayphone && mapping.contactPhone) {
    mapping.cellphone = mapping.contactPhone;
    console.log('🔄 [FIELD MAPPING] Mapped contact phone to cellphone');
  }

  console.log('🎯 [FIELD MAPPING] Final mapping result:', mapping);
  return mapping as FieldMapping;
};

export const validateMapping = (mapping: FieldMapping): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  // Check for name fields - either separate first/last names OR combined client name
  const hasNameFields = (mapping.firstName && mapping.lastName) || mapping.clientName;
  
  if (!hasNameFields) {
    errors.push('Name information is required (either First Name & Last Name, or Client Name)');
  }
  
  // Validate that we have some form of contact information
  const hasContactInfo = mapping.cellphone || mapping.dayphone || mapping.contactPhone || 
                        mapping.email || mapping.contactEmail;
  
  if (!hasContactInfo) {
    errors.push('At least one form of contact information (phone or email) is required');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};
