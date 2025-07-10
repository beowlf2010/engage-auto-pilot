import { LucideIcon, Car, Hash, DollarSign, BarChart3, Image, FileText, Calendar, AlertCircle } from "lucide-react";
import { InventoryFieldMapping } from './types';

export interface InventoryFieldDefinition {
  key: keyof InventoryFieldMapping;
  label: string;
  required?: boolean;
  description?: string;
}

export interface InventoryFieldSection {
  title: string;
  icon?: LucideIcon;
  fields: InventoryFieldDefinition[];
  collapsible?: boolean;
}

export const inventoryFieldSections: InventoryFieldSection[] = [
  {
    title: "Vehicle Information",
    icon: Car,
    fields: [
      { key: "vehicle", label: "Vehicle (Combined)", description: "Combined year, make, model field like '2019 Honda Accord EX-L'" },
      { key: "year", label: "Year" },
      { key: "make", label: "Make" },
      { key: "model", label: "Model" },
      { key: "trim", label: "Trim" }
    ]
  },
  {
    title: "Identifiers",
    icon: Hash,
    fields: [
      { key: "stockNumber", label: "Stock Number", description: "Stock # or inventory number (recommended)" },
      { key: "vin", label: "VIN", description: "Vehicle Identification Number (recommended)" }
    ]
  },
  {
    title: "Vehicle Details",
    icon: FileText,
    fields: [
      { key: "odometer", label: "Odometer/Mileage" },
      { key: "color", label: "Color" },
      { key: "exteriorColor", label: "Exterior Color" },
      { key: "interiorColor", label: "Interior Color" },
      { key: "status", label: "Status" },
      { key: "condition", label: "Condition (New/Used)" },
      { key: "certified", label: "Certified" },
      { key: "age", label: "Age in Days" }
    ]
  },
  {
    title: "Pricing Information",
    icon: DollarSign,
    fields: [
      { key: "price", label: "Price", description: "Asking price (recommended)" },
      { key: "listPrice", label: "List Price" },
      { key: "msrp", label: "MSRP" },
      { key: "cost", label: "Cost" },
      { key: "bookValue", label: "Book Value" },
      { key: "costToMarket", label: "Cost To Market" },
      { key: "markup", label: "Markup" },
      { key: "mmrWholesale", label: "MMR Wholesale" }
    ]
  },
  {
    title: "Marketing Data",
    icon: Image,
    collapsible: true,
    fields: [
      { key: "autowriterDescription", label: "Autowriter Description" },
      { key: "photos", label: "Photos" },
      { key: "defaultPercentOfMarket", label: "Default % of Market" },
      { key: "lastDollarChange", label: "Last $ Change" },
      { key: "priceRankDescription", label: "Price Rank Description" },
      { key: "vRankDescription", label: "vRank Description" }
    ]
  },
  {
    title: "AutoTrader.com Data",
    icon: BarChart3,
    collapsible: true,
    fields: [
      { key: "autoTraderListPrice", label: "AutoTrader List Price" },
      { key: "autoTraderOdometer", label: "AutoTrader Odometer" },
      { key: "autoTraderImageCount", label: "AutoTrader Image Count" },
      { key: "autoTraderSRP", label: "AutoTrader SRP" },
      { key: "autoTraderVDP", label: "AutoTrader VDP" },
      { key: "autoTraderVDPPercent", label: "AutoTrader % VDP" }
    ]
  },
  {
    title: "Cars.com Data",
    icon: BarChart3,
    collapsible: true,
    fields: [
      { key: "carsComListPrice", label: "Cars.com List Price" },
      { key: "carsComOdometer", label: "Cars.com Odometer" },
      { key: "carsComImageCount", label: "Cars.com Image Count" },
      { key: "carsComSRP", label: "Cars.com SRP" },
      { key: "carsComVDP", label: "Cars.com VDP" },
      { key: "carsComVDPPercent", label: "Cars.com % VDP" }
    ]
  },
  {
    title: "CarGurus Data",
    icon: BarChart3,
    collapsible: true,
    fields: [
      { key: "carGurusListPrice", label: "CarGurus List Price" },
      { key: "carGurusOdometer", label: "CarGurus Odometer" },
      { key: "carGurusImageCount", label: "CarGurus Image Count" },
      { key: "carGurusSRP", label: "CarGurus SRP" },
      { key: "carGurusVDP", label: "CarGurus VDP" },
      { key: "carGurusVDPPercent", label: "CarGurus % VDP" }
    ]
  },
  {
    title: "Dealer Site Data",
    icon: BarChart3,
    collapsible: true,
    fields: [
      { key: "dealerSiteListPrice", label: "Dealer Site List Price" },
      { key: "dealerSiteOdometer", label: "Dealer Site Odometer" },
      { key: "dealerSiteImageCount", label: "Dealer Site Image Count" },
      { key: "dealerSiteSRP", label: "Dealer Site SRP" },
      { key: "dealerSiteVDP", label: "Dealer Site VDP" },
      { key: "dealerSiteVDPPercent", label: "Dealer Site % VDP" }
    ]
  },
  {
    title: "Carfax & Reports",
    icon: AlertCircle,
    collapsible: true,
    fields: [
      { key: "carfaxHasReport", label: "Carfax Has Report" },
      { key: "carfaxHasManufacturerRecall", label: "Carfax Has Manufacturer Recall" },
      { key: "carfaxHasWarnings", label: "Carfax Has Warnings" },
      { key: "carfaxHasProblems", label: "Carfax Has Problems" }
    ]
  },
  {
    title: "Analytics & Rankings",
    icon: BarChart3,
    collapsible: true,
    fields: [
      { key: "water", label: "Water" },
      { key: "overall", label: "Overall" },
      { key: "likeMine", label: "Like Mine" },
      { key: "vinLeads", label: "VIN Leads" },
      { key: "redBlack", label: "Red/Black" }
    ]
  },
  {
    title: "Other Fields",
    icon: Calendar,
    collapsible: true,
    fields: [
      { key: "deletedDate", label: "Deleted Date" }
    ]
  }
];