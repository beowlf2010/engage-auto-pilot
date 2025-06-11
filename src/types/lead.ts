
export interface PhoneNumber {
  number: string;
  type: 'cell' | 'day' | 'eve';
  priority: number;
  status: 'active' | 'failed' | 'opted_out';
  lastAttempt?: string;
}

export interface Lead {
  id: number;
  firstName: string;
  lastName: string;
  middleName?: string;
  phoneNumbers: PhoneNumber[];
  primaryPhone: string; // The currently active phone number
  email: string;
  emailAlt?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  vehicleInterest: string;
  source: string;
  status: 'new' | 'engaged' | 'paused' | 'closed' | 'lost';
  salesperson: string;
  salespersonId: string;
  aiOptIn: boolean;
  aiStage?: string;
  nextAiSendAt?: string;
  createdAt: string;
  lastMessage?: string;
  lastMessageTime?: string; // Add this missing property
  unreadCount: number;
  doNotCall: boolean;
  doNotEmail: boolean;
  doNotMail: boolean;
  vehicleYear?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleVIN?: string;
  contactStatus: 'no_contact' | 'contact_attempted' | 'response_received'; // Add this missing property
}
