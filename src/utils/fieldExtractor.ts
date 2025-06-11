
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

// Smart make detection with GM division mapping
export const findMakeInRow = (row: Record<string, any>): string => {
  console.log('=== SMART MAKE DETECTION ===');
  
  // GM Division code mapping
  const gmDivisionMap: Record<string, string> = {
    'AKO': 'Buick',
    'CHV': 'Chevrolet',
    'CAD': 'Cadillac',
    'GMC': 'GMC',
    'PON': 'Pontiac',
    'SAT': 'Saturn',
    'HUM': 'Hummer',
    'OLD': 'Oldsmobile'
  };
  
  // First try standard make fields
  const makeFields = [
    'Division', 'Make', 'Brand', 'Manufacturer',
    'GM Division', 'Vehicle Make', 'Auto Make'
  ];
  
  const standardMake = getFieldValue(row, makeFields);
  if (standardMake) {
    // Check if it's a GM division code
    const mappedMake = gmDivisionMap[standardMake.toUpperCase()];
    if (mappedMake) {
      console.log(`✓ Mapped GM division code "${standardMake}" to "${mappedMake}"`);
      return mappedMake;
    }
    
    // Check if it's already a full make name
    if (standardMake.length > 2) {
      console.log(`✓ Found make in standard field: ${standardMake}`);
      return standardMake;
    }
  }
  
  // Scan all columns for GM division codes or make names
  console.log('Standard make fields failed, scanning all columns...');
  for (const [key, value] of Object.entries(row)) {
    if (value && typeof value === 'string') {
      const cleanValue = String(value).trim();
      
      // Check for GM division code
      const mappedMake = gmDivisionMap[cleanValue.toUpperCase()];
      if (mappedMake) {
        console.log(`✓ Found GM division code "${cleanValue}" in column "${key}": ${mappedMake}`);
        return mappedMake;
      }
      
      // Check for common make names
      const commonMakes = ['Chevrolet', 'Buick', 'Cadillac', 'GMC', 'Ford', 'Toyota', 'Honda', 'Nissan'];
      const matchedMake = commonMakes.find(make => 
        cleanValue.toLowerCase().includes(make.toLowerCase())
      );
      if (matchedMake) {
        console.log(`✓ Found make "${matchedMake}" in column "${key}"`);
        return matchedMake;
      }
    }
  }
  
  console.log('✗ No valid make found');
  return '';
};

// Smart model detection that looks for vehicle model patterns
export const findModelInRow = (row: Record<string, any>): string => {
  console.log('=== SMART MODEL DETECTION ===');
  
  // First try standard model fields
  const modelFields = [
    'Model', 'Vehicle Model', 'Product',
    'Model Name', 'Series Model', 'Product Name',
    'GM Stored Config Description'
  ];
  
  const standardModel = getFieldValue(row, modelFields);
  if (standardModel && standardModel.length > 1) {
    console.log(`✓ Found model in standard field: ${standardModel}`);
    return standardModel;
  }
  
  // For GM Global, check the config description field for model info
  const configDesc = row['GM Stored Config Description'] || row['Config Description'];
  if (configDesc) {
    const configStr = String(configDesc).trim();
    // Extract model from config description (often contains make + model)
    const words = configStr.split(/\s+/);
    if (words.length >= 2) {
      // Skip first word (likely make) and take second word as model
      const potentialModel = words[1];
      if (potentialModel && potentialModel.length > 1) {
        console.log(`✓ Extracted model from config description: ${potentialModel}`);
        return potentialModel;
      }
    }
  }
  
  console.log('✗ No valid model found');
  return '';
};

// Smart year detection with validation
export const findYearInRow = (row: Record<string, any>): string => {
  console.log('=== SMART YEAR DETECTION ===');
  
  const yearFields = [
    'Year', 'Model Year', 'MY', 'Vehicle Year',
    'Model_Year', 'Yr'
  ];
  
  // Try standard year fields first
  for (const field of yearFields) {
    const value = getFieldValue(row, [field]);
    if (value && isValidYear(value)) {
      console.log(`✓ Found valid year in field "${field}": ${value}`);
      return value;
    }
  }
  
  // Scan all columns for 4-digit year pattern
  console.log('Standard year fields failed, scanning all columns...');
  for (const [key, value] of Object.entries(row)) {
    if (value) {
      const strValue = String(value).trim();
      if (isValidYear(strValue)) {
        console.log(`✓ Found valid year in column "${key}": ${strValue}`);
        return strValue;
      }
    }
  }
  
  console.log('✗ No valid year found');
  return '';
};

// Validate year (4 digits, reasonable range)
export const isValidYear = (year: string): boolean => {
  if (!year) return false;
  const yearNum = parseInt(year);
  return yearNum >= 1900 && yearNum <= new Date().getFullYear() + 2 && year.length === 4;
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
