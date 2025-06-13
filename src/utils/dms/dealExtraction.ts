
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
        console.log(`Row ${i}: Extracted deal with date ${deal.saleDate}, stock ${deal.stockNumber}`);
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
  
  // Determine deal type based on stock number
  const dealType = classifyDealByStock(stockNumber);
  
  // Extract individual deal date with better parsing
  const dateValue = getValue(columnMapping.date);
  const dealDate = extractDealDate(dateValue);
  
  console.log(`Deal extraction - Stock: ${stockNumber}, Raw date: "${dateValue}", Parsed date: ${dealDate}`);
  
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
  
  // Try different date formats more aggressively
  const formats = [
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, // MM/DD/YYYY or M/D/YYYY
    /^(\d{1,2})\/(\d{1,2})\/(\d{2})$/, // MM/DD/YY or M/D/YY
    /^(\d{4})-(\d{1,2})-(\d{1,2})$/, // YYYY-MM-DD
    /^(\d{1,2})-(\d{1,2})-(\d{4})$/, // MM-DD-YYYY
    /^(\d{1,2})-(\d{1,2})-(\d{2})$/, // MM-DD-YY
  ];
  
  for (let i = 0; i < formats.length; i++) {
    const format = formats[i];
    const match = dateStr.match(format);
    if (match) {
      console.log(`Matched format ${i}:`, match);
      
      if (i === 0) { // MM/DD/YYYY
        const [, month, day, year] = match;
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      } else if (i === 1) { // MM/DD/YY
        const [, month, day, year] = match;
        const fullYear = parseInt(year) > 50 ? `19${year}` : `20${year}`;
        return `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      } else if (i === 2) { // YYYY-MM-DD
        return match[0];
      } else if (i === 3) { // MM-DD-YYYY
        const [, month, day, year] = match;
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      } else if (i === 4) { // MM-DD-YY
        const [, month, day, year] = match;
        const fullYear = parseInt(year) > 50 ? `19${year}` : `20${year}`;
        return `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
    }
  }
  
  // Try to parse as a number (Excel serial date)
  const numericDate = parseFloat(dateStr);
  if (!isNaN(numericDate) && numericDate > 40000 && numericDate < 50000) {
    // Excel date serial number (days since 1900-01-01)
    const excelEpoch = new Date(1900, 0, 1);
    const date = new Date(excelEpoch.getTime() + (numericDate - 2) * 24 * 60 * 60 * 1000);
    return date.toISOString().split('T')[0];
  }
  
  console.warn(`Could not parse date: "${dateStr}"`);
  return null;
};

const classifyDealByStock = (stockNumber?: string): 'new' | 'used' => {
  if (!stockNumber) return 'used';
  const firstChar = stockNumber.trim().toUpperCase().charAt(0);
  return firstChar === 'C' ? 'new' : 'used';
};
