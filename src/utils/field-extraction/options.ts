
import { getFieldValue } from './core';

// Extract RPO codes from various possible fields
export const extractRPOCodes = (row: Record<string, any>): string[] => {
  console.log('=== RPO CODES EXTRACTION ===');
  
  const rpoFields = [
    'RPO Codes', 'RPO', 'rpo_codes', 'Options', 'Option Codes',
    'Equipment Codes', 'Package Codes', 'Feature Codes'
  ];
  
  const rpoStr = getFieldValue(row, rpoFields);
  if (!rpoStr) {
    console.log('No RPO codes found');
    return [];
  }
  
  // Split by common delimiters and clean up
  const codes = rpoStr
    .split(/[,;|\n\r]+/)
    .map(code => code.trim().toUpperCase())
    .filter(code => code.length > 0 && /^[A-Z0-9]{2,5}$/.test(code));
  
  console.log(`Found RPO codes: ${codes.join(', ')}`);
  return codes;
};

// Extract option descriptions from various possible fields
export const extractOptionDescriptions = (row: Record<string, any>): string[] => {
  console.log('=== OPTION DESCRIPTIONS EXTRACTION ===');
  
  const descFields = [
    'Option Descriptions', 'Options Description', 'rpo_descriptions',
    'Equipment Description', 'Features', 'Packages', 'Equipment List'
  ];
  
  const descStr = getFieldValue(row, descFields);
  if (!descStr) {
    console.log('No option descriptions found');
    return [];
  }
  
  // Split by common delimiters and clean up
  const descriptions = descStr
    .split(/[,;|\n\r]+/)
    .map(desc => desc.trim())
    .filter(desc => desc.length > 0);
  
  console.log(`Found ${descriptions.length} option descriptions`);
  return descriptions;
};
