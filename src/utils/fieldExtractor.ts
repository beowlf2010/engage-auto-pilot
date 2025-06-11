
// Enhanced field mapping that handles exact matches and comprehensive alternatives
export const getFieldValue = (row: Record<string, any>, possibleFields: string[]): string => {
  console.log(`Looking for field from options: [${possibleFields.join(', ')}]`);
  
  for (const field of possibleFields) {
    // Try exact match first
    if (row[field] !== undefined && row[field] !== null && row[field] !== '') {
      const value = String(row[field]).trim();
      console.log(`✓ Found exact match for "${field}": "${value}"`);
      return value;
    }
  }
  
  // Try case-insensitive and partial matches
  for (const field of possibleFields) {
    const lowerField = field.toLowerCase();
    for (const key of Object.keys(row)) {
      const lowerKey = key.toLowerCase();
      if (lowerKey === lowerField || lowerKey.includes(lowerField) || lowerField.includes(lowerKey)) {
        if (row[key] !== undefined && row[key] !== null && row[key] !== '') {
          const value = String(row[key]).trim();
          console.log(`✓ Found fuzzy match "${key}" for "${field}": "${value}"`);
          return value;
        }
      }
    }
  }
  
  console.log(`✗ No match found for any of: [${possibleFields.join(', ')}]`);
  return '';
};

// Extract RPO codes from various possible fields
export const extractRPOCodes = (row: Record<string, any>): string[] => {
  const rpoFields = [
    'rpo_codes', 'option_codes', 'options', 'rpo', 'accessories', 'RPO_Codes', 'OptionCodes',
    'Ordered Options', 'Options', 'Equipment', 'Features'
  ];
  let rpoCodes: string[] = [];
  
  for (const field of rpoFields) {
    const value = getFieldValue(row, [field]);
    if (value) {
      // Split by common delimiters and clean up
      const codes = value.split(/[,;|\s]+/).filter(code => 
        code.trim().length > 0 && /^[A-Z0-9]{2,5}$/.test(code.trim())
      );
      rpoCodes = [...rpoCodes, ...codes.map(code => code.trim().toUpperCase())];
    }
  }
  
  return [...new Set(rpoCodes)]; // Remove duplicates
};
