
import { LucideIcon, User, Phone, Mail, MapPin, Car, Briefcase, Settings, Brain, Building, FileText, Star } from "lucide-react";
import { FieldMapping } from './types';

export interface FieldDefinition {
  key: keyof FieldMapping;
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
    title: "Customer Name",
    icon: User,
    fields: [
      { key: "clientName", label: "Client Name (Combined)" },
      { key: "firstName", label: "First Name" },
      { key: "lastName", label: "Last Name" },
      { key: "middleName", label: "Middle Name" }
    ]
  },
  {
    title: "Contact Information",
    icon: Phone,
    fields: [
      { key: "contactPhone", label: "Contact Phone" },
      { key: "contactEmail", label: "Contact Email" },
      { key: "cellphone", label: "Cell Phone" },
      { key: "dayphone", label: "Day Phone" },
      { key: "evephone", label: "Evening Phone" },
      { key: "email", label: "Email" },
      { key: "emailAlt", label: "Alternate Email" }
    ]
  },
  {
    title: "Privacy Settings",
    icon: Settings,
    fields: [
      { key: "phonePrivacy", label: "Phone Privacy" },
      { key: "emailPrivacy", label: "Email Privacy" },
      { key: "letterPrivacy", label: "Letter Privacy" },
      { key: "doNotCall", label: "Do Not Call" },
      { key: "doNotEmail", label: "Do Not Email" },
      { key: "doNotMail", label: "Do Not Mail" }
    ]
  },
  {
    title: "Address",
    icon: MapPin,
    fields: [
      { key: "address", label: "Street Address" },
      { key: "city", label: "City" },
      { key: "state", label: "State" },
      { key: "postalCode", label: "ZIP Code" }
    ]
  },
  {
    title: "Lead Classification",
    icon: Briefcase,
    fields: [
      { key: "prospectType", label: "Prospect Type" },
      { key: "status", label: "Status" },
      { key: "source", label: "Source" },
      { key: "leadType", label: "Lead Type" },
      { key: "vipStatus", label: "VIP Status" }
    ]
  },
  {
    title: "Vehicle Interests",
    icon: Car,
    fields: [
      { key: "firstDesiredVehicle", label: "First Desired Vehicle" },
      { key: "secondDesiredVehicle", label: "Second Desired Vehicle" },
      { key: "vehicleYear", label: "Vehicle Year" },
      { key: "vehicleMake", label: "Vehicle Make" },
      { key: "vehicleModel", label: "Vehicle Model" },
      { key: "vehicleVIN", label: "Vehicle VIN" },
      { key: "vehicleStockNumber", label: "Stock Number" }
    ]
  },
  {
    title: "Trade Information",
    icon: Car,
    fields: [
      { key: "firstOwnedVehicle", label: "First Owned Vehicle" },
      { key: "secondOwnedVehicle", label: "Second Owned Vehicle" },
      { key: "bookValue", label: "Book Value" },
      { key: "estPayoff", label: "Estimated Payoff" },
      { key: "equityAmount", label: "Equity Amount" },
      { key: "estMileage", label: "Estimated Mileage" },
      { key: "paymentsLeft", label: "Payments Left" }
    ]
  },
  {
    title: "Sales Team & Business",
    icon: Building,
    fields: [
      { key: "salesperson", label: "Salesperson" },
      { key: "salesPersonFirstName", label: "Salesperson First Name" },
      { key: "salesPersonLastName", label: "Salesperson Last Name" },
      { key: "businessUnit", label: "Business Unit" },
      { key: "dealerId", label: "Dealer ID" }
    ]
  },
  {
    title: "Activity & History",
    icon: FileText,
    fields: [
      { key: "lastActivityType", label: "Last Activity Type" },
      { key: "lastActivityDate", label: "Last Activity Date" },
      { key: "lastActivityCompletedBy", label: "Last Activity Completed By" },
      { key: "lastActivityNote", label: "Last Activity Note" },
      { key: "historySold", label: "History Sold" },
      { key: "historyService", label: "History Service" }
    ]
  },
  {
    title: "System Fields",
    icon: Star,
    fields: [
      { key: "dmsId", label: "DMS ID #" },
      { key: "leadStatusTypeName", label: "Lead Status Type Name" },
      { key: "leadTypeName", label: "Lead Type Name" },
      { key: "leadSourceName", label: "Lead Source Name" }
    ]
  }
];
