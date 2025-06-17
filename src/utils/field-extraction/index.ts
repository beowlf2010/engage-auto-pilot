
// Main export file for field extraction utilities
export { getFieldValue, parseDate } from './core';
export { findVINInRow, isValidVIN } from './vin';
export { parseVautoVehicleField } from './vauto';
export { findMakeInRow, findModelInRow, findYearInRow, isValidYear } from './vehicle';
export { extractGMGlobalStatus } from './gmGlobal';
export { extractRPOCodes, extractOptionDescriptions } from './options';

// Add missing extraction functions that are being imported
export const extractVehicleFields = (row: any) => {
  return {
    year: findYearInRow(row),
    make: findMakeInRow(row),
    model: findModelInRow(row),
    // Add other vehicle fields as needed
  };
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
