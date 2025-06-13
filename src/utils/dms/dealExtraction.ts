
import { DealRecord, DmsColumns } from './types';

export const extractDealsFromData = (data: any[], columnMapping: DmsColumns): DealRecord[] => {
  console.log('=== DEAL EXTRACTION ===');
  console.log('Column mapping:', columnMapping);
  
  const deals: DealRecord[] = [];
  let reportDate: string | null = null;
  
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
  
  // Extract report date from the data (look for date patterns in early rows)
  for (let i = 0; i < Math.min(headerRowIndex + 1, data.length); i++) {
    const row = data[i];
    if (Array.isArray(row)) {
      for (const cell of row) {
        const cellStr = String(cell || '').trim();
        // Look for date patterns like "01/01/2024", "2024-01-01", etc.
        const dateMatch = cellStr.match(/(\d{1,2}\/\d{1,2}\/\d{4})|(\d{4}-\d{1,2}-\d{1,2})/);
        if (dateMatch) {
          const foundDate = dateMatch[0];
          // Convert to standard format
          if (foundDate.includes('/')) {
            const [month, day, year] = foundDate.split('/');
            reportDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
          } else {
            reportDate = foundDate;
          }
          console.log('Found report date:', reportDate);
          break;
        }
      }
      if (reportDate) break;
    }
  }
  
  // If no date found in header, use the first date from data rows
  if (!reportDate && headerRowIndex !== -1) {
    for (let i = headerRowIndex + 1; i < data.length; i++) {
      const row = data[i];
      if (Array.isArray(row)) {
        const dateIndex = getColumnIndex(data[headerRowIndex], columnMapping.date);
        if (dateIndex !== -1) {
          const dateValue = row[dateIndex];
          if (dateValue) {
            const parsedDate = parseDate(dateValue);
            if (parsedDate) {
              reportDate = parsedDate;
              console.log('Using first transaction date as report date:', reportDate);
              break;
            }
          }
        }
      }
    }
  }
  
  // Fallback to today's date if no date found
  if (!reportDate) {
    reportDate = new Date().toISOString().split('T')[0];
    console.log('No date found in report, using today:', reportDate);
  }
  
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
      const deal = extractDealFromRow(row, headerRow, columnMapping, reportDate);
      if (deal) {
        deals.push(deal);
      }
    } catch (error) {
      console.warn(`Error processing row ${i}:`, error);
    }
  }
  
  console.log(`Extracted ${deals.length} deals with report date: ${reportDate}`);
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

const extractDealFromRow = (row: any[], headerRow: any[], columnMapping: DmsColumns, reportDate: string): DealRecord | null => {
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
    saleDate: reportDate
  };
  
  return deal;
};

const classifyDealByStock = (stockNumber?: string): 'new' | 'used' => {
  if (!stockNumber) return 'used';
  const firstChar = stockNumber.trim().toUpperCase().charAt(0);
  return firstChar === 'C' ? 'new' : 'used';
};

const parseDate = (dateValue: any): string | null => {
  if (!dateValue) return null;
  
  const dateStr = String(dateValue).trim();
  
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
