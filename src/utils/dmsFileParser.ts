
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
  age?: string;
  stockNumber?: string;
  yearModel?: string;
  buyerName?: string;
  saleAmount?: string;
  costAmount?: string;
  grossProfit?: string;
  fiProfit?: string;
  totalProfit?: string;
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
      throw new Error('Could not detect DMS Sales Analysis Detail format. Please ensure you are uploading the correct DMS report.');
    }
    
    // Extract deal records
    const deals = extractDealsFromData(data, columnMapping);
    console.log(`Extracted ${deals.length} deals`);
    
    if (deals.length === 0) {
      throw new Error('No valid deals found in the file. Please check that the report contains transaction data.');
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
  // Look for header row with DMS column names
  for (let i = 0; i < Math.min(10, data.length); i++) {
    const row = data[i];
    if (!Array.isArray(row)) continue;
    
    const columns: DmsColumns = {};
    const rowStr = row.map(cell => String(cell || '').toLowerCase().trim());
    
    // Look for common DMS column patterns
    for (let j = 0; j < rowStr.length; j++) {
      const cell = rowStr[j];
      
      if (cell.includes('age') || cell.includes('days')) {
        columns.age = String(row[j]);
      } else if (cell.includes('stock') && (cell.includes('#') || cell.includes('number'))) {
        columns.stockNumber = String(row[j]);
      } else if (cell.includes('yr') && cell.includes('model') || cell.includes('year')) {
        columns.yearModel = String(row[j]);
      } else if (cell.includes('buyer') || cell.includes('customer')) {
        columns.buyerName = String(row[j]);
      } else if (cell.includes('sale') && !cell.includes('person')) {
        columns.saleAmount = String(row[j]);
      } else if (cell.includes('cost') || cell.includes('invoice')) {
        columns.costAmount = String(row[j]);
      } else if (cell.includes('gross') && !cell.includes('total')) {
        columns.grossProfit = String(row[j]);
      } else if (cell.includes('f&i') || cell.includes('fi') || cell.includes('finance')) {
        columns.fiProfit = String(row[j]);
      } else if (cell.includes('total') && (cell.includes('profit') || cell.includes('gross'))) {
        columns.totalProfit = String(row[j]);
      }
    }
    
    // Check if we found enough columns to proceed
    const foundColumns = Object.keys(columns).length;
    console.log(`Row ${i}: Found ${foundColumns} DMS columns`);
    
    if (foundColumns >= 4) { // Need at least 4 key columns
      console.log('DMS format detected at row', i);
      return columns;
    }
  }
  
  return null;
};

const extractDealsFromData = (data: any[], columnMapping: DmsColumns): DealRecord[] => {
  const deals: DealRecord[] = [];
  const headers = data[0];
  
  // Find the column indices
  const columnIndices: Record<string, number> = {};
  for (const [key, columnName] of Object.entries(columnMapping)) {
    if (columnName) {
      const index = headers.findIndex((h: any) => String(h || '') === columnName);
      if (index !== -1) {
        columnIndices[key] = index;
      }
    }
  }
  
  console.log('Column indices:', columnIndices);
  
  // Process data rows (skip header rows)
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!Array.isArray(row) || row.length === 0) continue;
    
    // Skip summary/total rows
    const firstCell = String(row[0] || '').toLowerCase();
    if (firstCell.includes('total') || firstCell.includes('summary') || firstCell.includes('grand')) {
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
    if (columnIndices.age !== undefined) {
      deal.age = parseNumeric(row[columnIndices.age]);
    }
    
    if (columnIndices.stockNumber !== undefined) {
      deal.stockNumber = parseString(row[columnIndices.stockNumber]);
    }
    
    if (columnIndices.yearModel !== undefined) {
      deal.yearModel = parseString(row[columnIndices.yearModel]);
    }
    
    if (columnIndices.buyerName !== undefined) {
      deal.buyerName = parseString(row[columnIndices.buyerName]);
    }
    
    if (columnIndices.saleAmount !== undefined) {
      deal.saleAmount = parseNumeric(row[columnIndices.saleAmount]);
    }
    
    if (columnIndices.costAmount !== undefined) {
      deal.costAmount = parseNumeric(row[columnIndices.costAmount]);
    }
    
    if (columnIndices.grossProfit !== undefined) {
      deal.grossProfit = parseNumeric(row[columnIndices.grossProfit]);
    }
    
    if (columnIndices.fiProfit !== undefined) {
      deal.fiProfit = parseNumeric(row[columnIndices.fiProfit]);
    }
    
    if (columnIndices.totalProfit !== undefined) {
      deal.totalProfit = parseNumeric(row[columnIndices.totalProfit]);
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
