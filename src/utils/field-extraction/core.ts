
// Core field mapping utilities for enhanced field extraction
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

// Enhanced date parsing for various date formats
export const parseDate = (dateStr: string | number | Date): string | null => {
  if (!dateStr) return null;
  
  try {
    let date: Date;
    
    if (typeof dateStr === 'number') {
      // Excel serial date
      date = new Date((dateStr - 25569) * 86400 * 1000);
    } else if (typeof dateStr === 'string') {
      // Clean the string
      const cleaned = dateStr.trim();
      
      // Common date formats
      if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(cleaned)) {
        // MM/DD/YYYY
        date = new Date(cleaned);
      } else if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
        // YYYY-MM-DD
        date = new Date(cleaned);
      } else if (/^\d{2}\/\d{2}\/\d{2}$/.test(cleaned)) {
        // MM/DD/YY - assume 20xx
        const parts = cleaned.split('/');
        date = new Date(`20${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`);
      } else {
        date = new Date(cleaned);
      }
    } else {
      date = new Date(dateStr);
    }
    
    if (isNaN(date.getTime())) {
      return null;
    }
    
    return date.toISOString().split('T')[0];
  } catch (error) {
    console.error('Error parsing date:', dateStr, error);
    return null;
  }
};
