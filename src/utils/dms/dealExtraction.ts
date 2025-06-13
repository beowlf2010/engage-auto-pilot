
import { DealRecord, DmsColumns } from './types';

export const extractDealsFromData = (data: any[], columnMapping: DmsColumns): DealRecord[] => {
  console.log('=== DEAL EXTRACTION ===');
  console.log('Column mapping:', columnMapping);
  
  const deals: DealRecord[] = [];
  
  // Find the header row index
  let headerRowIndex = -1;
  for (let i = 0; i < Math.min(10, data.length); i++) {
    const row = data[i];
    if (Array.isArray(row)) {
      for (let j = 0; j < row.length; j++) {
        const cell = String(row[j] || '').trim();
        if (Object.values(columnMapping).includes(cell)) {
          headerRowIndex = i;
          break;
        }
      }
      if (headerRowIndex !== -1) break;
    }
  }
  
  console.log('Header row found at index:', headerRowIndex);
  
  // Process data rows starting after header
  if (headerRowIndex === -1) {
    console.log('No header row found, cannot process deals');
    return deals;
  }
  
  const headerRow = data[headerRowIndex];
  console.log('Processing deals starting from row:', headerRowIndex + 1);
  
  for (let i = headerRowIndex + 1; i < data.length; i++) {
    const row = data[i];
    if (!Array.isArray(row)) continue;
    
    // Skip empty rows
    if (row.every(cell => !cell || String(cell).trim() === '')) continue;
    
    try {
      const deal = extractDealFromRow(row, headerRow, columnMapping);
      if (deal) {
        console.log(`Row ${i}: Extracted deal with date ${deal.saleDate}, stock ${deal.stockNumber}, type ${deal.dealType}`);
        deals.push(deal);
      }
    } catch (error) {
      console.warn(`Error processing row ${i}:`, error);
    }
  }
  
  console.log(`Extracted ${deals.length} deals`);
  return deals;
};

const getColumnIndex = (headerRow: any[], columnName?: string): number => {
  if (!columnName || !Array.isArray(headerRow)) return -1;
  
  for (let i = 0; i < headerRow.length; i++) {
    if (String(headerRow[i] || '').trim() === columnName) {
      return i;
    }
  }
  return -1;
};

const extractDealFromRow = (row: any[], headerRow: any[], columnMapping: DmsColumns): DealRecord | null => {
  const getValue = (columnName?: string): string => {
    const index = getColumnIndex(headerRow, columnName);
    return index !== -1 ? String(row[index] || '').trim() : '';
  };
  
  const getNumberValue = (columnName?: string): number | undefined => {
    const value = getValue(columnName);
    if (!value) return undefined;
    
    // Remove currency symbols and commas, handle parentheses for negative numbers
    const cleanValue = value.replace(/[$,]/g, '').replace(/[()]/g, match => match === '(' ? '-' : '');
    const num = parseFloat(cleanValue);
    return !isNaN(num) ? num : undefined;
  };
  
  // Get basic deal information
  const stockNumber = getValue(columnMapping.stockNumber);
  const grossProfit = getNumberValue(columnMapping.gross);
  const fiProfit = getNumberValue(columnMapping.fi) || 0;
  
  // Skip rows without essential data
  if (!stockNumber && grossProfit === undefined) {
    return null;
  }
  
  // Calculate total profit (gross + FI)
  const totalProfit = (grossProfit || 0) + fiProfit;
  
  // All deals start as retail by default (can be changed in UI)
  const dealType: 'retail' | 'dealer_trade' | 'wholesale' = 'retail';
  
  // Extract individual deal date with enhanced parsing
  const dateValue = getValue(columnMapping.date);
  const dealDate = extractDealDate(dateValue);
  
  console.log(`Deal extraction - Stock: ${stockNumber}, Raw date: "${dateValue}", Parsed date: ${dealDate}, Deal type: ${dealType}`);
  
  if (!dealDate) {
    console.warn(`Failed to parse date "${dateValue}" for stock ${stockNumber}`);
  }
  
  const deal: DealRecord = {
    stockNumber: stockNumber || undefined,
    grossProfit,
    fiProfit,
    totalProfit,
    dealType,
    age: getNumberValue(columnMapping.age),
    yearModel: getValue(columnMapping.vehicle) || undefined,
    buyerName: getValue(columnMapping.customer) || undefined,
    saleAmount: getNumberValue(columnMapping.slp),
    vin: getValue(columnMapping.vin6) || undefined,
    vehicle: getValue(columnMapping.vehicle) || undefined,
    tradeValue: getNumberValue(columnMapping.trade),
    saleDate: dealDate || new Date().toISOString().split('T')[0] // fallback to today if no date found
  };
  
  return deal;
};

const extractDealDate = (dateValue: string): string | null => {
  if (!dateValue) return null;
  
  const dateStr = dateValue.trim();
  console.log(`Parsing date: "${dateStr}"`);
  
  // First, try to parse as Excel serial number (most common in DMS exports)
  const numericDate = parseFloat(dateStr);
  if (!isNaN(numericDate) && numericDate > 25000 && numericDate < 60000) {
    // Excel date serial number (days since 1900-01-01, accounting for Excel's leap year bug)
    const excelEpoch = new Date(1900, 0, 1);
    const date = new Date(excelEpoch.getTime() + (numericDate - 2) * 24 * 60 * 60 * 1000);
    const result = date.toISOString().split('T')[0];
    console.log(`Excel serial ${numericDate} -> ${result}`);
    return result;
  }
  
  // Try different common date formats with proper 2-digit year handling
  const currentYear = new Date().getFullYear();
  const currentCentury = Math.floor(currentYear / 100) * 100;
  
  const formats = [
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, // MM/DD/YYYY or M/D/YYYY
    /^(\d{1,2})\/(\d{1,2})\/(\d{2})$/, // MM/DD/YY or M/D/YY
    /^(\d{4})-(\d{1,2})-(\d{1,2})$/, // YYYY-MM-DD
    /^(\d{1,2})-(\d{1,2})-(\d{4})$/, // MM-DD-YYYY
    /^(\d{1,2})-(\d{1,2})-(\d{2})$/, // MM-DD-YY
    /^(\d{2})(\d{2})(\d{4})$/, // MMDDYYYY
    /^(\d{2})(\d{2})(\d{2})$/, // MMDDYY
  ];
  
  for (let i = 0; i < formats.length; i++) {
    const format = formats[i];
    const match = dateStr.match(format);
    if (match) {
      console.log(`Matched format ${i}:`, match);
      
      let month, day, year;
      
      if (i === 0) { // MM/DD/YYYY
        [, month, day, year] = match;
      } else if (i === 1) { // MM/DD/YY
        [, month, day, year] = match;
        // Improved 2-digit year logic: 00-30 = 2000s, 31-99 = 1900s
        const twoDigitYear = parseInt(year);
        if (twoDigitYear <= 30) {
          year = String(currentCentury + twoDigitYear);
        } else {
          year = String(currentCentury - 100 + twoDigitYear);
        }
      } else if (i === 2) { // YYYY-MM-DD
        return match[0]; // Already in correct format
      } else if (i === 3) { // MM-DD-YYYY
        [, month, day, year] = match;
      } else if (i === 4) { // MM-DD-YY
        [, month, day, year] = match;
        const twoDigitYear = parseInt(year);
        if (twoDigitYear <= 30) {
          year = String(currentCentury + twoDigitYear);
        } else {
          year = String(currentCentury - 100 + twoDigitYear);
        }
      } else if (i === 5) { // MMDDYYYY
        [, month, day, year] = match;
      } else if (i === 6) { // MMDDYY
        [, month, day, year] = match;
        const twoDigitYear = parseInt(year);
        if (twoDigitYear <= 30) {
          year = String(currentCentury + twoDigitYear);
        } else {
          year = String(currentCentury - 100 + twoDigitYear);
        }
      }
      
      if (month && day && year) {
        const result = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        console.log(`Formatted date: ${result}`);
        return result;
      }
    }
  }
  
  // Try parsing as a standard JavaScript date
  try {
    const jsDate = new Date(dateStr);
    if (!isNaN(jsDate.getTime())) {
      const result = jsDate.toISOString().split('T')[0];
      console.log(`JS Date parse: ${result}`);
      return result;
    }
  } catch (e) {
    // Ignore parsing errors
  }
  
  console.warn(`Could not parse date: "${dateStr}"`);
  return null;
};
