
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
  
  // Extract individual deal date
  const dealDate = extractDealDate(getValue(columnMapping.date));
  
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
  
  // Try different date formats
  const formats = [
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, // MM/DD/YYYY or M/D/YYYY
    /^(\d{4})-(\d{1,2})-(\d{1,2})$/, // YYYY-MM-DD
    /^(\d{1,2})-(\d{1,2})-(\d{4})$/, // MM-DD-YYYY
  ];
  
  for (const format of formats) {
    const match = dateStr.match(format);
    if (match) {
      if (format === formats[0]) { // MM/DD/YYYY
        const [, month, day, year] = match;
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      } else if (format === formats[1]) { // YYYY-MM-DD
        return match[0];
      } else if (format === formats[2]) { // MM-DD-YYYY
        const [, month, day, year] = match;
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
    }
  }
  
  return null;
};

const classifyDealByStock = (stockNumber?: string): 'new' | 'used' => {
  if (!stockNumber) return 'used';
  const firstChar = stockNumber.trim().toUpperCase().charAt(0);
  return firstChar === 'C' ? 'new' : 'used';
};
