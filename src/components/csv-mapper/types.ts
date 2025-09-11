
export interface FieldMapping {
  firstName: string;
  lastName: string;
  middleName?: string;
  cellphone?: string;
  dayphone?: string;
  evephone?: string;
  email?: string;
  emailAlt?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  vehicleYear?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleVIN?: string;
  vehicleStockNumber?: string;
  source?: string;
  salesPersonFirstName?: string;
  salesPersonLastName?: string;
  doNotCall?: string;
  doNotEmail?: string;
  doNotMail?: string;
  leadType?: string;
  dealerId?: string;
  status?: string;
  // AI Strategy Fields
  leadStatusTypeName?: string;
  leadTypeName?: string;
  leadSourceName?: string;
  
  // Enhanced fields for user's CSV format
  clientName?: string;          // Combined "Last, First" format
  prospectType?: string;        // Maps to status/leadType
  businessUnit?: string;        // Dealership unit
  phonePrivacy?: string;        // Privacy flags
  emailPrivacy?: string;
  letterPrivacy?: string;
  contactPhone?: string;        // Main contact phone
  contactEmail?: string;        // Main contact email
  historySold?: string;         // Sales history
  historyService?: string;      // Service history
  bookValue?: string;           // Vehicle values
  estPayoff?: string;
  equityAmount?: string;
  estMileage?: string;
  paymentsLeft?: string;
  lastActivityType?: string;    // Activity tracking
  lastActivityDate?: string;
  lastActivityCompletedBy?: string;
  lastActivityNote?: string;
  dmsId?: string;              // DMS identifier
  vipStatus?: string;          // VIP flag
  firstDesiredVehicle?: string; // Vehicle interests
  secondDesiredVehicle?: string;
  firstOwnedVehicle?: string;   // Current vehicles
  secondOwnedVehicle?: string;
  salesperson?: string;         // Combined salesperson name
}
