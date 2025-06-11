
import { getFieldValue } from './core';

// Enhanced RPO code extraction with comprehensive GM option field support
export const extractRPOCodes = (row: Record<string, any>): string[] => {
  console.log('=== ENHANCED RPO CODE EXTRACTION ===');
  
  const rpoFields = [
    'rpo_codes', 'option_codes', 'options', 'rpo', 'accessories', 'RPO_Codes', 'OptionCodes',
    'Ordered Options', 'Options', 'Equipment', 'Features',
    // GM-specific option fields
    'RPO Code List', 'Option Code List', 'Equipment List', 'Accessory Codes',
    'Ordered Option Codes', 'Standard Equipment', 'Optional Equipment'
  ];
  
  let rpoCodes: string[] = [];
  
  for (const field of rpoFields) {
    const value = getFieldValue(row, [field]);
    if (value) {
      console.log(`Processing options from field "${field}": ${value}`);
      
      // Split by various delimiters used in GM data
      const codes = value.split(/[,;|\s\n\r\t]+/)
        .map(code => code.trim().toUpperCase())
        .filter(code => {
          // More flexible RPO code pattern - GM codes can be 2-5 characters
          const isValidCode = code.length >= 2 && code.length <= 5 && /^[A-Z0-9]+$/.test(code);
          if (isValidCode) {
            console.log(`✓ Valid RPO code found: ${code}`);
          }
          return isValidCode;
        });
      
      rpoCodes = [...rpoCodes, ...codes];
    }
  }
  
  // Remove duplicates and return
  const uniqueCodes = [...new Set(rpoCodes)];
  console.log(`✓ Total unique RPO codes extracted: ${uniqueCodes.length}`);
  console.log('RPO codes:', uniqueCodes);
  
  return uniqueCodes;
};

// NEW: Extract option descriptions for future mapping
export const extractOptionDescriptions = (row: Record<string, any>): string[] => {
  console.log('=== OPTION DESCRIPTIONS EXTRACTION ===');
  
  const descriptionFields = [
    'Option Descriptions', 'Equipment Descriptions', 'Feature Descriptions',
    'Accessory Descriptions', 'Standard Features', 'Optional Features',
    'Package Descriptions', 'Trim Features'
  ];
  
  let descriptions: string[] = [];
  
  for (const field of descriptionFields) {
    const value = getFieldValue(row, [field]);
    if (value) {
      console.log(`Processing descriptions from field "${field}"`);
      
      // Split by common delimiters and clean
      const descs = value.split(/[;|\n\r]+/)
        .map(desc => desc.trim())
        .filter(desc => desc.length > 3); // Filter out very short descriptions
      
      descriptions = [...descriptions, ...descs];
    }
  }
  
  // Remove duplicates
  const uniqueDescriptions = [...new Set(descriptions)];
  console.log(`✓ Total option descriptions extracted: ${uniqueDescriptions.length}`);
  
  return uniqueDescriptions;
};
