
import { getFieldValue } from './core';

// Smart make detection that scans multiple possible fields
export const findMakeInRow = (row: Record<string, any>): string => {
  console.log('=== SMART MAKE DETECTION ===');
  
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
