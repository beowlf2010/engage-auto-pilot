
import * as XLSX from 'xlsx';

export interface DealRecord {
  age?: number;
  stockNumber?: string;
  yearModel?: string;
  buyerName?: string;
  saleAmount?: number;
  costAmount?: number;
  grossProfit?: number;
  fiProfit?: number;
  totalProfit?: number;
  dealType?: 'new' | 'used';
  vin?: string;
  vehicle?: string;
  tradeValue?: number;
  saleDate?: string;
}

export interface FinancialSummary {
  totalUnits: number;
  totalSales: number;
  totalGross: number;
  totalFiProfit: number;
  totalProfit: number;
  newUnits: number;
  newGross: number;
  usedUnits: number;
  usedGross: number;
}

interface DmsColumns {
  date?: string;
  age?: string;
  stockNumber?: string;
  vin6?: string;
  vehicle?: string;
  trade?: string;
  slp?: string; // SLP instead of Sale
  customer?: string;
  gross?: string;
  fi?: string;
  total?: string;
}

export const parseDmsFile = async (file: File) => {
  console.log('=== DMS FILE PARSING ===');
  console.log('File name:', file.name);
  console.log('File size:', file.size);
  
  try {
    const data = await parseExcelFile(file);
    console.log('Raw data rows:', data.length);
    
    // Detect column mapping
    const columnMapping = detectDmsColumns(data);
    console.log('Column mapping:', columnMapping);
    
    if (!columnMapping) {
      throw new Error('Could not detect DMS Sales Analysis Detail format. Please ensure you are uploading the correct DMS report with columns: Date, Age, Stock, Vin6, Vehicle, Trade, SLP, Customer, Gross, FI, Total');
    }
    
    // Extract deal records
    const deals = extractDealsFromData(data, columnMapping);
    console.log(`Extracted ${deals.length} deals`);
    
    if (deals.length === 0) {
      throw new Error('No valid deals found in the file. Please check that the report contains transaction data with the expected columns.');
    }
    
    // Calculate summary
    const summary = calculateSummaryFromDeals(deals);
    console.log('Summary:', summary);
    
    return {
      deals,
      summary,
      fileName: file.name,
      totalRows: data.length
    };
  } catch (error) {
    console.error('DMS parsing error:', error);
    throw error;
  }
};

const parseExcelFile = async (file: File): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        console.log('Excel parsed, rows:', jsonData.length);
        resolve(jsonData as any[]);
      } catch (error) {
        reject(new Error(`Error parsing Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    };
    
    reader.onerror = () => reject(new Error('Error reading file'));
    reader.readAsArrayBuffer(file);
  });
};

const detectDmsColumns = (data: any[]): DmsColumns | null => {
  // Look for header row with your specific DMS column names
  for (let i = 0; i < Math.min(10, data.length); i++) {
    const row = data[i];
    if (!Array.isArray(row)) continue;
    
    const columns: DmsColumns = {};
    
    // Look for exact matches with your column headers
    for (let j = 0; j < row.length; j++) {
      const cell = String(row[j] || '').trim();
      
      if (cell === 'Date') {
        columns.date = cell;
      } else if (cell === 'Age') {
        columns.age = cell;
      } else if (cell === 'Stock') {
        columns.stockNumber = cell;
      } else if (cell === 'Vin6') {
        columns.vin6 = cell;
      } else if (cell === 'Vehicle') {
        columns.vehicle = cell;
      } else if (cell === 'Trade') {
        columns.trade = cell;
      } else if (cell === 'SLP') {
        columns.slp = cell;
      } else if (cell === 'Customer') {
        columns.customer = cell;
      } else if (cell === 'Gross') {
        columns.gross = cell;
      } else if (cell === 'FI') {
        columns.fi = cell;
      } else if (cell === 'Total') {
        columns.total = cell;
      }
    }
    
    // Check if we found the core required columns
    const foundColumns = Object.keys(columns).length;
    console.log(`Row ${i}: Found ${foundColumns} DMS columns`);
    
    if (foundColumns >= 6) { // Need at least 6 core columns
      console.log('DMS format detected at row', i);
      return columns;
    }
  }
  
  return null;
};

const extractDealsFromData = (data: any[], columnMapping: DmsColumns): DealRecord[] => {
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
      deal.saleAmount = parseNumeric(row[columnIndices.slp]);
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
    
    // Determine deal type based on age or year
    deal.dealType = determineDealType(deal);
    
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
  
  const numericValue = typeof value === 'number' ? value : parseFloat(String(value).replace(/[,$]/g, ''));
  return isNaN(numericValue) ? undefined : numericValue;
};

const determineDealType = (deal: DealRecord): 'new' | 'used' => {
  // Default to used
  let dealType: 'new' | 'used' = 'used';
  
  // Check age (less than 365 days typically means new)
  if (deal.age !== undefined && deal.age <= 365) {
    dealType = 'new';
  }
  
  // Check year model (current year or previous year typically means new)
  if (deal.yearModel) {
    const currentYear = new Date().getFullYear();
    const modelYear = parseInt(String(deal.yearModel));
    if (!isNaN(modelYear) && modelYear >= currentYear - 1) {
      dealType = 'new';
    }
  }
  
  return dealType;
};

const isValidDeal = (deal: DealRecord): boolean => {
  // A valid deal should have at least a sale amount, gross profit, or total profit
  return !!(deal.saleAmount || deal.grossProfit || deal.totalProfit);
};

const calculateSummaryFromDeals = (deals: DealRecord[]): FinancialSummary => {
  const summary: FinancialSummary = {
    totalUnits: deals.length,
    totalSales: 0,
    totalGross: 0,
    totalFiProfit: 0,
    totalProfit: 0,
    newUnits: 0,
    newGross: 0,
    usedUnits: 0,
    usedGross: 0
  };

  for (const deal of deals) {
    summary.totalSales += deal.saleAmount || 0;
    summary.totalGross += deal.grossProfit || 0;
    summary.totalFiProfit += deal.fiProfit || 0;
    summary.totalProfit += deal.totalProfit || 0;

    if (deal.dealType === 'new') {
      summary.newUnits++;
      summary.newGross += deal.grossProfit || 0;
    } else {
      summary.usedUnits++;
      summary.usedGross += deal.grossProfit || 0;
    }
  }

  return summary;
};
