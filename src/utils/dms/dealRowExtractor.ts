
import { DealRecord, DmsColumns } from './types';
import { getColumnIndex } from './headerDetection';
import { extractDealDate } from './dateParser';

export const extractDealFromRow = (row: any[], headerRow: any[], columnMapping: DmsColumns): DealRecord | null => {
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
  
  // Log raw row data for debugging
  console.log(`=== ROW EXTRACTION === Row data:`, {
    stockNumber,
    rawDate: getValue(columnMapping.date),
    grossProfit,
    fiProfit,
    rawGross: getValue(columnMapping.gross),
    rawFI: getValue(columnMapping.fi)
  });

  // Skip rows without essential data (more lenient - only require stock OR profit data)
  if (!stockNumber && grossProfit === undefined && fiProfit === 0) {
    console.log(`Skipping row - no stock number and no profit data`);
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
    console.warn(`Failed to parse date "${dateValue}" for stock ${stockNumber} - CONTINUING WITHOUT DATE`);
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
    saleDate: dealDate // NO FALLBACK - null if parsing fails
  };
  
  return deal;
};
