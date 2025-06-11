
import { User, Phone, Mail, Car, Users, Shield, Activity } from "lucide-react";
import { FieldMapping } from './types';

export interface FieldDefinition {
  key: keyof FieldMapping;
  label: string;
  required: boolean;
}

export interface FieldSection {
  title: string;
  icon: any;
  fields: FieldDefinition[];
}

export const fieldSections: FieldSection[] = [
  {
    title: "Required Fields",
    icon: User,
    fields: [
      { key: 'firstName', label: 'First Name', required: true },
      { key: 'lastName', label: 'Last Name', required: true },
      { key: 'middleName', label: 'Middle Name', required: false }
    ]
  },
  {
    title: "Phone Numbers (Priority Order)",
    icon: Phone,
    fields: [
      { key: 'cellphone', label: 'Cell Phone (Priority 1 - Primary)', required: false },
      { key: 'dayphone', label: 'Day Phone (Priority 2 - Secondary)', required: false },
      { key: 'evephone', label: 'Evening Phone (Priority 3 - Tertiary)', required: false }
    ]
  },
  {
    title: "Contact Information",
    icon: Mail,
    fields: [
      { key: 'email', label: 'Primary Email', required: false },
      { key: 'emailAlt', label: 'Alternate Email', required: false }
    ]
  },
  {
    title: "Address Information",
    icon: null,
    fields: [
      { key: 'address', label: 'Street Address', required: false },
      { key: 'city', label: 'City', required: false },
      { key: 'state', label: 'State', required: false },
      { key: 'postalCode', label: 'Postal Code', required: false }
    ]
  },
  {
    title: "Vehicle Information",
    icon: Car,
    fields: [
      { key: 'vehicleYear', label: 'Vehicle Year', required: false },
      { key: 'vehicleMake', label: 'Vehicle Make', required: false },
      { key: 'vehicleModel', label: 'Vehicle Model', required: false },
      { key: 'vehicleVIN', label: 'Vehicle VIN', required: false },
      { key: 'vehicleStockNumber', label: 'Stock Number', required: false }
    ]
  },
  {
    title: "Lead Status & Assignment",
    icon: Activity,
    fields: [
      { key: 'status', label: 'Lead Status (Active/Sold/Bad/etc.)', required: false },
      { key: 'salesPersonFirstName', label: 'Salesperson First Name', required: false },
      { key: 'salesPersonLastName', label: 'Salesperson Last Name', required: false }
    ]
  },
  {
    title: "Contact Preferences & Lead Data",
    icon: Shield,
    fields: [
      { key: 'doNotCall', label: 'Do Not Call', required: false },
      { key: 'doNotEmail', label: 'Do Not Email', required: false },
      { key: 'doNotMail', label: 'Do Not Mail', required: false },
      { key: 'source', label: 'Lead Source', required: false },
      { key: 'leadType', label: 'Lead Type', required: false },
      { key: 'dealerId', label: 'Dealer ID', required: false }
    ]
  }
];
