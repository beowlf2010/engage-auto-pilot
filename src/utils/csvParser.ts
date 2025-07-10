
/**
 * Unified CSV Parser - RFC 4180 Compliant
 * Handles quoted fields, escaped quotes, and edge cases properly
 * Removes surrounding quotes while preserving internal quotes
 */

export interface ParsedCSVData {
  headers: string[];
  rows: Record<string, string>[];
  sample: Record<string, string>;
}

/**
 * Parse a single CSV line respecting quotes and commas
 */
export const parseCSVLine = (line: string, delimiter: string = ','): string[] => {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote - add one quote to current field
        current += '"';
        i += 2; // Skip both quotes
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
        i++;
      }
    } else if (char === delimiter && !inQuotes) {
      // Field separator outside quotes
      result.push(cleanFieldValue(current));
      current = '';
      i++;
    } else {
      // Regular character
      current += char;
      i++;
    }
  }

  // Add the last field
  result.push(cleanFieldValue(current));
  return result;
};

/**
 * Clean field value by removing surrounding quotes and trimming whitespace
 */
export const cleanFieldValue = (value: string): string => {
  // Trim whitespace
  let cleaned = value.trim();
  
  // Remove surrounding quotes if they exist
  if (cleaned.length >= 2 && cleaned.startsWith('"') && cleaned.endsWith('"')) {
    cleaned = cleaned.slice(1, -1);
    // Handle escaped quotes within the field
    cleaned = cleaned.replace(/""/g, '"');
  }
  
  return cleaned;
};

/**
 * Detect CSV delimiter (comma, tab, semicolon)
 */
export const detectDelimiter = (text: string): string => {
  const lines = text.split('\n').slice(0, 5); // Check first 5 lines
  const delimiters = [',', '\t', ';', '|'];
  
  let bestDelimiter = ',';
  let maxCount = 0;
  
  for (const delimiter of delimiters) {
    let count = 0;
    for (const line of lines) {
      if (line.trim()) {
        count += (line.match(new RegExp(`\\${delimiter}`, 'g')) || []).length;
      }
    }
    if (count > maxCount) {
      maxCount = count;
      bestDelimiter = delimiter;
    }
  }
  
  return bestDelimiter;
};

/**
 * Check if a row contains only header-like data (column names, metadata)
 */
export const isHeaderRow = (values: string[], headers: string[]): boolean => {
  // Common header indicators
  const headerIndicators = [
    'photos', 'photo', 'vAuto Network', 'vAuto', 'network',
    'vin', 'stock #', 'year', 'make', 'model', 'trim', 'price',
    'mileage', 'condition', 'status', 'description', 'notes',
    'Color', 'Interior', 'Engine', 'Transmission', 'Body Style'
  ];
  
  // Check if most values match header indicators (case insensitive)
  let headerMatches = 0;
  for (const value of values) {
    if (value && typeof value === 'string') {
      const lowerValue = value.toLowerCase().trim();
      if (headerIndicators.some(indicator => 
        lowerValue.includes(indicator.toLowerCase()) || 
        indicator.toLowerCase().includes(lowerValue)
      )) {
        headerMatches++;
      }
    }
  }
  
  // If more than 50% of values look like headers, it's probably a header row
  const headerRatio = headerMatches / Math.max(values.length, 1);
  return headerRatio > 0.5;
};

/**
 * Check if a row contains actual vehicle data
 */
export const isVehicleDataRow = (row: Record<string, string>): boolean => {
  // Look for vehicle-specific data patterns
  const hasYear = Object.values(row).some(value => {
    if (!value) return false;
    const yearMatch = value.match(/\b(19|20)\d{2}\b/);
    return yearMatch && parseInt(yearMatch[0]) >= 1900 && parseInt(yearMatch[0]) <= new Date().getFullYear() + 2;
  });
  
  const hasVIN = Object.values(row).some(value => {
    return value && value.length === 17 && /^[A-HJ-NPR-Z0-9]{17}$/i.test(value);
  });
  
  const hasPrice = Object.values(row).some(value => {
    return value && /[\$,\d]{3,}/.test(value.replace(/[^\d$,]/g, ''));
  });
  
  const hasMakeModel = Object.values(row).some(value => {
    return value && value.length > 2 && 
           !['N/A', 'NULL', 'UNDEFINED', ''].includes(value.toUpperCase()) &&
           /^[A-Za-z\s\-\.]+$/.test(value);
  });
  
  // Must have at least 2 indicators for valid vehicle data
  const indicators = [hasYear, hasVIN, hasPrice, hasMakeModel].filter(Boolean).length;
  return indicators >= 2;
};

/**
 * Analyze CSV structure and identify data vs header rows
 */
export const analyzeCSVStructure = (lines: string[], delimiter: string): {
  headerRowIndex: number;
  dataStartIndex: number;
  skippedRows: string[];
} => {
  const skippedRows: string[] = [];
  let headerRowIndex = 0;
  let dataStartIndex = 1;
  
  console.log('🔍 [CSV ANALYSIS] Analyzing CSV structure...');
  
  // Parse first few rows to analyze structure
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const values = parseCSVLine(lines[i], delimiter);
    console.log(`🔍 [CSV ANALYSIS] Row ${i}:`, values.slice(0, 3));
    
    if (i === 0) {
      // First row is typically headers
      headerRowIndex = 0;
      continue;
    }
    
    // Check if this row is actually more headers or metadata
    if (isHeaderRow(values, [])) {
      console.log(`⚠️ [CSV ANALYSIS] Row ${i} appears to be additional headers/metadata:`, values.slice(0, 3));
      skippedRows.push(lines[i]);
      dataStartIndex = i + 1;
    } else {
      // Found actual data, stop analyzing
      console.log(`✅ [CSV ANALYSIS] Row ${i} appears to be actual data`);
      break;
    }
  }
  
  console.log(`📊 [CSV ANALYSIS] Structure analysis complete:`, {
    headerRowIndex,
    dataStartIndex,
    skippedRowsCount: skippedRows.length
  });
  
  return { headerRowIndex, dataStartIndex, skippedRows };
};

/**
 * Parse CSV text into structured data with proper quote handling and header detection
 */
export const parseCSVText = (text: string): ParsedCSVData => {
  const lines = text.split('\n').filter(line => line.trim());
  
  if (lines.length < 2) {
    throw new Error('CSV must have at least a header and one data row');
  }
  
  // Detect delimiter
  const delimiter = detectDelimiter(text);
  console.log('🔍 [CSV PARSER] Detected CSV delimiter:', delimiter === '\t' ? 'tab' : delimiter);
  
  // Analyze CSV structure to find real headers and data
  const { headerRowIndex, dataStartIndex, skippedRows } = analyzeCSVStructure(lines, delimiter);
  
  if (skippedRows.length > 0) {
    console.log(`⚠️ [CSV PARSER] Skipped ${skippedRows.length} non-data rows:`, 
      skippedRows.map(row => parseCSVLine(row, delimiter).slice(0, 3)));
  }
  
  // Parse headers from the identified header row
  const headers = parseCSVLine(lines[headerRowIndex], delimiter);
  console.log('📋 [CSV PARSER] Parsed headers:', headers);
  
  // Parse data rows starting from identified data start
  const rows: Record<string, string>[] = [];
  let validDataRows = 0;
  let skippedDataRows = 0;
  
  for (let i = dataStartIndex; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const values = parseCSVLine(line, delimiter);
    const row: Record<string, string> = {};
    
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    
    // Validate that this row contains actual vehicle data
    if (isVehicleDataRow(row)) {
      rows.push(row);
      validDataRows++;
    } else {
      console.log(`⚠️ [CSV PARSER] Skipping non-vehicle data row ${i}:`, 
        Object.entries(row).slice(0, 3).map(([k, v]) => `${k}=${v}`));
      skippedDataRows++;
    }
  }
  
  console.log(`📊 [CSV PARSER] Parsing complete:`, {
    totalLines: lines.length,
    headerRowIndex,
    dataStartIndex,
    validDataRows,
    skippedDataRows,
    skippedHeaderRows: skippedRows.length
  });
  
  if (rows.length === 0) {
    throw new Error(`No valid vehicle data found in CSV. Processed ${lines.length} lines but found no vehicle records. Check file format and content.`);
  }
  
  const sample = rows[0] || {};
  console.log('📋 [CSV PARSER] Sample valid data row:', 
    Object.entries(sample).slice(0, 3).map(([k, v]) => `${k}="${v}"`));
  
  return {
    headers,
    rows,
    sample
  };
};

/**
 * Parse CSV file with proper quote handling
 */
export const parseCSVFile = async (file: File): Promise<ParsedCSVData> => {
  const text = await file.text();
  return parseCSVText(text);
};
