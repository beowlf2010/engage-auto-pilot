
// Core utility functions for field extraction

// Smart field value getter that tries multiple possible field names
export const getFieldValue = (row: Record<string, any>, fieldNames: string[]): string => {
  for (const fieldName of fieldNames) {
    const value = row[fieldName];
    if (value !== null && value !== undefined && String(value).trim() !== '') {
      return String(value).trim();
    }
  }
  return '';
};

// Parse date from various formats
export const parseDate = (dateStr: string): Date | null => {
  if (!dateStr || typeof dateStr !== 'string') return null;
  
  // Try parsing common date formats
  const cleanDate = dateStr.trim();
  
  // Try ISO format first
  const isoDate = new Date(cleanDate);
  if (!isNaN(isoDate.getTime())) {
    return isoDate;
  }
  
  // Try MM/DD/YYYY format
  const mmddyyyy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
  const match = cleanDate.match(mmddyyyy);
  if (match) {
    const [, month, day, year] = match;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (!isNaN(date.getTime())) {
      return date;
    }
  }
  
  return null;
};

// Convert string to number with validation
export const parseNumber = (str: string): number | null => {
  if (!str || typeof str !== 'string') return null;
  
  // Remove non-numeric characters except decimal point and negative sign
  const cleaned = str.replace(/[^0-9.-]/g, '');
  const num = parseFloat(cleaned);
  
  return isNaN(num) ? null : num;
};

// Convert string to integer with validation
export const parseInteger = (str: string): number | null => {
  if (!str || typeof str !== 'string') return null;
  
  // Remove non-numeric characters except negative sign
  const cleaned = str.replace(/[^0-9-]/g, '');
  const num = parseInt(cleaned, 10);
  
  return isNaN(num) ? null : num;
};
