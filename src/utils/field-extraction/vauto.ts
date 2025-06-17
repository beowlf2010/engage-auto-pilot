
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

// Extract vAuto-specific fields from row data
export const extractVautoFields = (row: Record<string, any>): any => {
  console.log('=== VAUTO FIELDS EXTRACTION ===');
  
  // Look for vAuto vehicle field
  const vehicleFields = [
    'Vehicle', 'vehicle', 'Vehicle:', 'VehicleDescription'
  ];
  
  const vehicleStr = getFieldValue(row, vehicleFields);
  if (vehicleStr) {
    return parseVautoVehicleField(vehicleStr);
  }
  
  // Look for other vAuto-specific fields
  const result: any = {};
  
  // Price fields
  const priceFields = ['Price', 'AskingPrice', 'ListPrice'];
  const price = getFieldValue(row, priceFields);
  if (price) {
    const numPrice = parseFloat(price.replace(/[^0-9.-]/g, ''));
    if (!isNaN(numPrice)) {
      result.price = numPrice;
    }
  }
  
  // Mileage fields
  const mileageFields = ['Mileage', 'Miles', 'Odometer'];
  const mileage = getFieldValue(row, mileageFields);
  if (mileage) {
    const numMileage = parseInt(mileage.replace(/[^0-9]/g, ''), 10);
    if (!isNaN(numMileage)) {
      result.mileage = numMileage;
    }
  }
  
  console.log('Extracted vAuto fields:', result);
  return result;
};
