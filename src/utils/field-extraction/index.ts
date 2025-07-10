
// Main export file for field extraction utilities
export { getFieldValue, parseDate } from './core';
export { findVINInRow, isValidVIN } from './vin';
export { parseVautoVehicleField } from './vauto';
export { findMakeInRow, findModelInRow, findYearInRow, isValidYear } from './vehicle';
export { extractGMGlobalStatus } from './gmGlobal';
export { extractRPOCodes, extractOptionDescriptions } from './options';

// Import the functions we need for the wrapper functions
import { findYearInRow, findMakeInRow, findModelInRow, parseVehicleField } from './vehicle';
import { findVINInRow } from './vin';
import { extractRPOCodes, extractOptionDescriptions } from './options';
import { parseVautoVehicleField } from './vauto';

// Add missing extraction functions that are being imported
export const extractVehicleFields = (row: any) => {
  console.log('🔍 [VEHICLE EXTRACTION] Starting vehicle field extraction');
  console.log('🔍 [VEHICLE EXTRACTION] Available columns:', Object.keys(row));
  
  // First, try to extract from combined vehicle field (highest priority)
  const vehicleFields = ['Vehicle', 'vehicle', 'Vehicle Description', 'Full Vehicle', 'Description'];
  let extractedData: { year?: number; make?: string; model?: string; trim?: string } = {};
  
  for (const fieldName of vehicleFields) {
    if (row[fieldName] && typeof row[fieldName] === 'string' && row[fieldName].trim()) {
      console.log(`🔍 [VEHICLE EXTRACTION] Found combined vehicle field: ${fieldName} = "${row[fieldName]}"`);
      const parsed = parseVehicleField(row[fieldName]);
      if (parsed.make && parsed.model) {
        console.log('✅ [VEHICLE EXTRACTION] Successfully parsed combined field:', parsed);
        extractedData = parsed;
        break;
      }
    }
  }
  
  // If combined field parsing didn't work, fall back to individual fields
  if (!extractedData.make || !extractedData.model) {
    console.log('🔄 [VEHICLE EXTRACTION] Falling back to individual field extraction');
    extractedData = {
      year: findYearInRow(row),
      make: findMakeInRow(row),
      model: findModelInRow(row)
    };
  }
  
  console.log('📋 [VEHICLE EXTRACTION] Final extracted data:', extractedData);
  return extractedData;
};

export const extractVINField = (row: any) => {
  return {
    vin: findVINInRow(row)
  };
};

export const extractOptionsFields = (row: any) => {
  return {
    rpo_codes: extractRPOCodes(row),
    rpo_descriptions: extractOptionDescriptions(row)
  };
};

export const extractVautoFields = (row: any) => {
  // Check if this looks like a vAuto file
  const vehicleField = Object.keys(row).find(key => 
    key.toLowerCase().includes('vehicle') && 
    typeof row[key] === 'string' && 
    row[key].includes(' ')
  );
  
  if (vehicleField) {
    return parseVautoVehicleField(row[vehicleField]);
  }
  
  return {};
};
