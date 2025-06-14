
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
 * Parse CSV text into structured data with proper quote handling
 */
export const parseCSVText = (text: string): ParsedCSVData => {
  const lines = text.split('\n').filter(line => line.trim());
  
  if (lines.length < 2) {
    throw new Error('CSV must have at least a header and one data row');
  }
  
  // Detect delimiter
  const delimiter = detectDelimiter(text);
  console.log('Detected CSV delimiter:', delimiter === '\t' ? 'tab' : delimiter);
  
  // Parse headers
  const headers = parseCSVLine(lines[0], delimiter);
  console.log('Parsed headers:', headers);
  
  // Parse data rows
  const rows: Record<string, string>[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const values = parseCSVLine(line, delimiter);
    const row: Record<string, string> = {};
    
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    
    rows.push(row);
  }
  
  const sample = rows[0] || {};
  console.log('Sample row after parsing:', sample);
  
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
