
import { getFieldValue } from './core';

// Smart VIN detection that scans all columns for VIN patterns
export const findVINInRow = (row: Record<string, any>): string => {
  console.log('=== SMART VIN DETECTION ===');
  
  // First try standard VIN fields
  const vinFields = [
    'VIN', 'vin', 'Vin', 'Vehicle VIN', 'Unit VIN',
    'VIN Number', 'Vehicle Identification Number'
  ];
  
  const standardVin = getFieldValue(row, vinFields);
  if (isValidVIN(standardVin)) {
    console.log(`Found VIN in standard field: ${standardVin}`);
    return standardVin;
  }
  
  // Scan all columns for VIN pattern
  console.log('Standard VIN fields failed, scanning all columns...');
  for (const [key, value] of Object.entries(row)) {
    if (value && typeof value === 'string') {
      const cleanValue = String(value).trim().toUpperCase();
      if (isValidVIN(cleanValue)) {
        console.log(`✓ Found VIN in column "${key}": ${cleanValue}`);
        return cleanValue;
      }
    }
  }
  
  console.log('✗ No valid VIN found in any column');
  return '';
};

// Validate VIN format (17 characters, alphanumeric, no I/O/Q)
export const isValidVIN = (vin: string): boolean => {
  if (!vin || typeof vin !== 'string') return false;
  const cleanVin = vin.trim().toUpperCase();
  return cleanVin.length === 17 && /^[A-HJ-NPR-Z0-9]{17}$/.test(cleanVin);
};
