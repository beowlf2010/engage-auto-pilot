
import { LucideIcon, User, Phone, Mail, MapPin, Car, Briefcase, Settings, Brain } from "lucide-react";

export interface FieldDefinition {
  key: string;
  label: string;
  required?: boolean;
}

export interface FieldSection {
  title: string;
  icon?: LucideIcon;
  fields: FieldDefinition[];
}

export const fieldSections: FieldSection[] = [
  {
    title: "Required Fields",
    icon: User,
    fields: [
      { key: "firstName", label: "First Name", required: true },
      { key: "lastName", label: "Last Name", required: true },
      { key: "middleName", label: "Middle Name" }
    ]
  },
  {
    title: "Contact Information",
    icon: Phone,
    fields: [
      { key: "cellphone", label: "Cell Phone" },
      { key: "dayphone", label: "Day Phone" },
      { key: "evephone", label: "Evening Phone" },
      { key: "email", label: "Email" },
      { key: "emailAlt", label: "Alternate Email" }
    ]
  },
  {
    title: "Address",
    icon: MapPin,
    fields: [
      { key: "address", label: "Street Address" },
      { key: "city", label: "City" },
      { key: "state", label: "State" },
      { key: "postalCode", label: "Postal Code" }
    ]
  },
  {
    title: "Vehicle Information",
    icon: Car,
    fields: [
      { key: "vehicleYear", label: "Vehicle Year" },
      { key: "vehicleMake", label: "Vehicle Make" },
      { key: "vehicleModel", label: "Vehicle Model" },
      { key: "vehicleVIN", label: "Vehicle VIN" },
      { key: "vehicleStockNumber", label: "Stock Number" }
    ]
  },
  {
    title: "AI Strategy Fields",
    icon: Brain,
    fields: [
      { key: "leadStatusTypeName", label: "Lead Status Type" },
      { key: "leadTypeName", label: "Lead Type" },
      { key: "leadSourceName", label: "Lead Source" }
    ]
  },
  {
    title: "Sales Information",
    icon: Briefcase,
    fields: [
      { key: "source", label: "Lead Source" },
      { key: "status", label: "Lead Status" },
      { key: "salesPersonFirstName", label: "Salesperson First Name" },
      { key: "salesPersonLastName", label: "Salesperson Last Name" },
      { key: "leadType", label: "Lead Type" },
      { key: "dealerId", label: "Dealer ID" }
    ]
  },
  {
    title: "Preferences",
    icon: Settings,
    fields: [
      { key: "doNotCall", label: "Do Not Call" },
      { key: "doNotEmail", label: "Do Not Email" },
      { key: "doNotMail", label: "Do Not Mail" }
    ]
  }
];
