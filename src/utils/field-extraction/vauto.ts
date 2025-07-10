
import { getFieldValue } from './core';

// Parse vAuto vehicle field format: "2022 Chevrolet Silverado 1500 LT"
export const parseVautoVehicleField = (vehicleStr: string): any => {
  console.log('=== VAUTO VEHICLE PARSING ===');
  console.log('Vehicle string:', vehicleStr);
  
  if (!vehicleStr || typeof vehicleStr !== 'string') {
    return {};
  }
  
  const parts = vehicleStr.trim().split(/\s+/);
  if (parts.length < 3) {
    console.log('Insufficient parts for vAuto parsing');
    return {};
  }
  
  // Find year (4-digit number)
  const yearPart = parts.find(p => /^\d{4}$/.test(p));
  const yearIndex = yearPart ? parts.indexOf(yearPart) : -1;
  
  if (yearIndex === -1 || yearIndex >= parts.length - 2) {
    console.log('Could not find valid year and make/model structure');
    return {};
  }
  
  const year = parseInt(yearPart!, 10);
  const make = parts[yearIndex + 1];
  const model = parts.slice(yearIndex + 2).join(' ');
  
  console.log('Parsed vAuto vehicle:', { year, make, model });
  
  return {
    year,
    make,
    model
  };
};

// Detect if this is a vAuto file format
export const detectVautoFormat = (row: Record<string, any>): boolean => {
  const keys = Object.keys(row).map(k => k.toLowerCase());
  const vautoPatterns = ['vehicle', 'stock #', 'price', 'mileage', 'cost to market'];
  const matches = vautoPatterns.filter(pattern => 
    keys.some(key => key.includes(pattern.replace(' ', '_')) || key.includes(pattern))
  );
  return matches.length >= 3;
};

// Extract vAuto-specific fields from row data
export const extractVautoFields = (row: Record<string, any>): any => {
  console.log('=== VAUTO FIELDS EXTRACTION ===');
  
  // Enhanced vAuto vehicle field patterns
  const vehicleFields = [
    'Vehicle', 'vehicle', 'Vehicle:', 'VehicleDescription', 'Vehicle Description',
    'Full Vehicle', 'Unit', 'Description', 'Vehicle_Description'
  ];
  
  const vehicleStr = getFieldValue(row, vehicleFields);
  let result: any = {};
  
  if (vehicleStr) {
    const parsedVehicle = parseVautoVehicleField(vehicleStr);
    if (parsedVehicle.make && parsedVehicle.model) {
      result = { ...result, ...parsedVehicle };
      console.log('✅ Successfully parsed vAuto vehicle field:', parsedVehicle);
    }
  }
  
  // Look for other vAuto-specific fields
  
  // Enhanced vAuto field extraction
  
  // Price fields
  const priceFields = ['Price', 'AskingPrice', 'ListPrice', 'List Price', 'Asking Price'];
  const price = getFieldValue(row, priceFields);
  if (price) {
    const numPrice = parseFloat(price.replace(/[^0-9.-]/g, ''));
    if (!isNaN(numPrice)) {
      result.price = numPrice;
    }
  }
  
  // Mileage fields
  const mileageFields = ['Mileage', 'Miles', 'Odometer', 'Milo'];
  const mileage = getFieldValue(row, mileageFields);
  if (mileage) {
    const numMileage = parseInt(mileage.replace(/[^0-9]/g, ''), 10);
    if (!isNaN(numMileage)) {
      result.mileage = numMileage;
    }
  }
  
  // Stock number
  const stockFields = ['Stock #', 'Stock Number', 'Stock_Number', 'StockNumber'];
  const stockNumber = getFieldValue(row, stockFields);
  if (stockNumber) {
    result.stock_number = stockNumber;
  }
  
  // Days in inventory
  const daysFields = ['Days in Inventory', 'Days_in_Inventory', 'Age', 'Inventory_Age'];
  const days = getFieldValue(row, daysFields);
  if (days) {
    const numDays = parseInt(days.replace(/[^0-9]/g, ''), 10);
    if (!isNaN(numDays)) {
      result.days_in_inventory = numDays;
    }
  }
  
  console.log('Extracted vAuto fields:', result);
  return result;
};
