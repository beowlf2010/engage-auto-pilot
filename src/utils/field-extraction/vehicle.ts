
import { getFieldValue } from './core';

// Parse combined vehicle field like "2019 Honda Accord EX-L"
export const parseVehicleField = (vehicleText: string): { year?: number; make?: string; model?: string; trim?: string } => {
  if (!vehicleText || typeof vehicleText !== 'string') {
    console.log('🔍 [VEHICLE PARSING] No valid vehicle text provided');
    return {};
  }

  console.log('🔍 [VEHICLE PARSING] Parsing combined vehicle field:', vehicleText);

  const trimmed = vehicleText.trim();
  const parts = trimmed.split(' ').filter(part => part.length > 0);
  
  if (parts.length < 3) {
    console.warn('⚠️ [VEHICLE PARSING] Vehicle field has less than 3 parts, trying alternative parsing:', parts);
    
    // Try alternative parsing for cases like "Honda Accord" without year
    if (parts.length === 2) {
      return {
        make: parts[0],
        model: parts[1]
      };
    }
    return {};
  }

  // First part should be year (4 digits)
  const yearMatch = parts[0].match(/^\d{4}$/);
  let year: number | undefined;
  let makeIndex = 1;
  
  if (yearMatch) {
    year = parseInt(parts[0], 10);
    if (year < 1900 || year > new Date().getFullYear() + 2) {
      console.warn('⚠️ [VEHICLE PARSING] Invalid year, treating as make:', parts[0]);
      year = undefined;
      makeIndex = 0;
    }
  } else {
    console.log('🔍 [VEHICLE PARSING] No year found, starting with make');
    makeIndex = 0;
  }

  // Extract make and model
  const make = parts[makeIndex];
  const model = parts[makeIndex + 1];
  
  // Remaining parts are trim
  const trim = parts.slice(makeIndex + 2).join(' ') || undefined;

  const result = {
    year,
    make,
    model,
    trim
  };

  console.log('✅ [VEHICLE PARSING] Parsed result:', result);
  return result;
};

// Smart make detection that scans multiple possible fields
export const findMakeInRow = (row: Record<string, any>): string => {
  console.log('=== SMART MAKE DETECTION ===');
  
  // First check for combined vehicle field and try to parse it
  const vehicleFields = ['Vehicle', 'vehicle', 'Vehicle Description', 'Full Vehicle'];
  const vehicleValue = getFieldValue(row, vehicleFields);
  if (vehicleValue) {
    const parsed = parseVehicleField(vehicleValue);
    if (parsed.make) {
      console.log(`Found make from combined vehicle field: ${parsed.make}`);
      return parsed.make;
    }
  }
  
  // Fall back to separate make fields
  const makeFields = [
    'Make', 'make', 'Brand', 'Manufacturer', 'Vehicle Make',
    'Car Make', 'Auto Make', 'MFG', 'Mfg'
  ];
  
  const make = getFieldValue(row, makeFields);
  console.log(`Found make: ${make}`);
  return make;
};

// Smart model detection that scans multiple possible fields
export const findModelInRow = (row: Record<string, any>): string => {
  console.log('=== SMART MODEL DETECTION ===');
  
  // First check for combined vehicle field and try to parse it
  const vehicleFields = ['Vehicle', 'vehicle', 'Vehicle Description', 'Full Vehicle'];
  const vehicleValue = getFieldValue(row, vehicleFields);
  if (vehicleValue) {
    const parsed = parseVehicleField(vehicleValue);
    if (parsed.model) {
      console.log(`Found model from combined vehicle field: ${parsed.model}`);
      return parsed.model;
    }
  }
  
  // Fall back to separate model fields
  const modelFields = [
    'Model', 'model', 'Vehicle Model', 'Car Model', 'Auto Model',
    'Model Name', 'Model Description'
  ];
  
  const model = getFieldValue(row, modelFields);
  console.log(`Found model: ${model}`);
  return model;
};

// Smart year detection that scans multiple possible fields
export const findYearInRow = (row: Record<string, any>): number | null => {
  console.log('=== SMART YEAR DETECTION ===');
  
  // First check for combined vehicle field and try to parse it
  const vehicleFields = ['Vehicle', 'vehicle', 'Vehicle Description', 'Full Vehicle'];
  const vehicleValue = getFieldValue(row, vehicleFields);
  if (vehicleValue) {
    const parsed = parseVehicleField(vehicleValue);
    if (parsed.year) {
      console.log(`Found year from combined vehicle field: ${parsed.year}`);
      return parsed.year;
    }
  }
  
  // Fall back to separate year fields
  const yearFields = [
    'Year', 'year', 'Model Year', 'MY', 'Vehicle Year',
    'Car Year', 'Auto Year', 'Yr'
  ];
  
  const yearStr = getFieldValue(row, yearFields);
  if (!yearStr) {
    console.log('No year found');
    return null;
  }
  
  const year = parseInt(yearStr, 10);
  if (isValidYear(year)) {
    console.log(`Found valid year: ${year}`);
    return year;
  }
  
  console.log(`Invalid year: ${yearStr}`);
  return null;
};

// Validate year is reasonable for vehicles
export const isValidYear = (year: number): boolean => {
  const currentYear = new Date().getFullYear();
  return year >= 1900 && year <= currentYear + 2;
};
