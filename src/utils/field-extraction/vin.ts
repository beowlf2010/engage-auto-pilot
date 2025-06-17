
import { getFieldValue } from './core';

// Find VIN in row data with smart detection
export const findVINInRow = (row: Record<string, any>): string => {
  console.log('=== SMART VIN DETECTION ===');
  
  const vinFields = [
    'VIN', 'vin', 'Vin', 'Vehicle Identification Number',
    'VehicleVIN', 'vehicle_vin', 'SerialNumber', 'Serial Number'
  ];
  
  const vin = getFieldValue(row, vinFields);
  
  if (!vin) {
    console.log('No VIN found');
    return '';
  }
  
  const cleanVin = vin.toUpperCase().replace(/[^A-Z0-9]/g, '');
  
  if (isValidVIN(cleanVin)) {
    console.log(`Found valid VIN: ${cleanVin}`);
    return cleanVin;
  }
  
  console.log(`Invalid VIN format: ${vin}`);
  return vin; // Return original if validation fails
};

// Validate VIN format (17 characters, alphanumeric, no I, O, Q)
export const isValidVIN = (vin: string): boolean => {
  if (!vin || vin.length !== 17) {
    return false;
  }
  
  // VINs cannot contain I, O, or Q
  const invalidChars = /[IOQ]/;
  if (invalidChars.test(vin)) {
    return false;
  }
  
  // Must be alphanumeric
  const validFormat = /^[A-HJ-NPR-Z0-9]{17}$/;
  return validFormat.test(vin);
};
