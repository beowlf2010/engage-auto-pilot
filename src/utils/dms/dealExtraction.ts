
import { DealRecord, DmsColumns } from './types';

export const extractDealsFromData = (data: any[], columnMapping: DmsColumns): DealRecord[] => {
  const deals: DealRecord[] = [];
  
  // Find the header row index
  let headerRowIndex = -1;
  for (let i = 0; i < Math.min(10, data.length); i++) {
    const row = data[i];
    if (Array.isArray(row)) {
      const hasDate = row.some(cell => String(cell || '') === 'Date');
      const hasAge = row.some(cell => String(cell || '') === 'Age');
      const hasStock = row.some(cell => String(cell || '') === 'Stock');
      
      if (hasDate && hasAge && hasStock) {
        headerRowIndex = i;
        break;
      }
    }
  }
  
  if (headerRowIndex === -1) {
    console.error('Could not find header row');
    return deals;
  }
  
  const headers = data[headerRowIndex];
  console.log('Headers found at row', headerRowIndex, ':', headers);
  
  // Find the column indices
  const columnIndices: Record<string, number> = {};
  for (const [key, columnName] of Object.entries(columnMapping)) {
    if (columnName) {
      const index = headers.findIndex((h: any) => String(h || '').trim() === columnName);
      if (index !== -1) {
        columnIndices[key] = index;
      }
    }
  }
  
  console.log('Column indices:', columnIndices);
  
  // Process data rows (skip header row and any rows before it)
  for (let i = headerRowIndex + 1; i < data.length; i++) {
    const row = data[i];
    if (!Array.isArray(row) || row.length === 0) continue;
    
    // Skip summary/total rows
    const firstCell = String(row[0] || '').toLowerCase().trim();
    if (firstCell.includes('total') || firstCell.includes('summary') || firstCell.includes('grand') || firstCell === '') {
      continue;
    }
    
    const deal = extractDealFromRow(row, columnIndices);
    if (deal && isValidDeal(deal)) {
      deals.push(deal);
    }
  }
  
  return deals;
};

const extractDealFromRow = (row: any[], columnIndices: Record<string, number>): DealRecord | null => {
  try {
    const deal: DealRecord = {};
    
    // Extract values using column indices
    if (columnIndices.date !== undefined) {
      deal.saleDate = parseString(row[columnIndices.date]);
    }
    
    if (columnIndices.age !== undefined) {
      deal.age = parseNumeric(row[columnIndices.age]);
    }
    
    if (columnIndices.stockNumber !== undefined) {
      deal.stockNumber = parseString(row[columnIndices.stockNumber]);
    }
    
    if (columnIndices.vin6 !== undefined) {
      deal.vin = parseString(row[columnIndices.vin6]);
    }
    
    if (columnIndices.vehicle !== undefined) {
      deal.vehicle = parseString(row[columnIndices.vehicle]);
      // Extract year/model from vehicle field if available
      deal.yearModel = deal.vehicle;
    }
    
    if (columnIndices.trade !== undefined) {
      deal.tradeValue = parseNumeric(row[columnIndices.trade]);
    }
    
    if (columnIndices.slp !== undefined) {
      const slpValue = row[columnIndices.slp];
      deal.saleAmount = parseNumeric(slpValue);
      console.log('SLP value for deal:', slpValue, '-> parsed as:', deal.saleAmount);
    }
    
    if (columnIndices.customer !== undefined) {
      deal.buyerName = parseString(row[columnIndices.customer]);
    }
    
    if (columnIndices.gross !== undefined) {
      deal.grossProfit = parseNumeric(row[columnIndices.gross]);
    }
    
    if (columnIndices.fi !== undefined) {
      deal.fiProfit = parseNumeric(row[columnIndices.fi]);
    }
    
    if (columnIndices.total !== undefined) {
      deal.totalProfit = parseNumeric(row[columnIndices.total]);
    }
    
    // Calculate total profit if not provided
    if (deal.totalProfit === undefined && (deal.grossProfit !== undefined || deal.fiProfit !== undefined)) {
      deal.totalProfit = (deal.grossProfit || 0) + (deal.fiProfit || 0);
    }
    
    // Determine deal type based on stock number prefix
    deal.dealType = determineDealTypeByStock(deal.stockNumber);
    
    return deal;
  } catch (error) {
    console.error('Error extracting deal from row:', error);
    return null;
  }
};

const parseString = (value: any): string | undefined => {
  if (value === null || value === undefined || value === '') return undefined;
  return String(value).trim();
};

const parseNumeric = (value: any): number | undefined => {
  if (value === null || value === undefined || value === '') return undefined;
  
  // Handle different number formats
  let stringValue = String(value);
  
  // Remove common currency symbols and formatting
  stringValue = stringValue.replace(/[$,\s]/g, '');
  
  // Handle parentheses for negative numbers (accounting format)
  if (stringValue.startsWith('(') && stringValue.endsWith(')')) {
    stringValue = '-' + stringValue.slice(1, -1);
  }
  
  const numericValue = typeof value === 'number' ? value : parseFloat(stringValue);
  const result = isNaN(numericValue) ? undefined : numericValue;
  
  console.log('Parsing numeric:', value, '-> cleaned:', stringValue, '-> result:', result);
  return result;
};

const determineDealTypeByStock = (stockNumber?: string): 'new' | 'used' => {
  if (!stockNumber || stockNumber.trim().length === 0) {
    return 'used';
  }
  
  const firstChar = stockNumber.trim().toUpperCase().charAt(0);
  
  if (firstChar === 'C') {
    return 'new';
  } else if (firstChar === 'B' || firstChar === 'X') {
    return 'used';
  } else {
    // Default to used for unknown patterns
    return 'used';
  }
};

const isValidDeal = (deal: DealRecord): boolean => {
  // A valid deal should have at least a sale amount, gross profit, or total profit
  return !!(deal.saleAmount || deal.grossProfit || deal.totalProfit);
};
