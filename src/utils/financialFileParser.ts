
import { parseEnhancedInventoryFile } from './enhancedFileParsingUtils';

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

export const parseFinancialFile = async (file: File) => {
  console.log('=== FINANCIAL FILE PARSING ===');
  
  const parsed = await parseEnhancedInventoryFile(file);
  const deals: DealRecord[] = [];
  let summary: FinancialSummary = {
    totalUnits: 0,
    totalSales: 0,
    totalGross: 0,
    totalFiProfit: 0,
    totalProfit: 0,
    newUnits: 0,
    newGross: 0,
    usedUnits: 0,
    usedGross: 0
  };

  // Process each row to extract deal data
  for (const row of parsed.rows) {
    const deal = extractDealFromRow(row);
    if (deal && isValidDeal(deal)) {
      deals.push(deal);
    }
  }

  // Calculate summary from deals
  summary = calculateSummaryFromDeals(deals);

  console.log(`Parsed ${deals.length} deals from financial file`);
  console.log('Summary:', summary);

  return {
    deals,
    summary,
    fileName: file.name,
    totalRows: parsed.rows.length
  };
};

const extractDealFromRow = (row: Record<string, any>): DealRecord | null => {
  try {
    // Map common field variations for financial data
    const ageFields = ['age', 'Age', 'AGE', 'days', 'Days'];
    const stockFields = ['stock', 'Stock', 'STOCK', 'stock_number', 'Stock Number', 'Stock #', 'stock#'];
    const yearModelFields = ['year_model', 'Year Model', 'Yr Model', 'year', 'Year', 'model_year'];
    const buyerFields = ['buyer', 'Buyer', 'BUYER', 'buyer_name', 'Buyer Name', 'customer', 'Customer'];
    const saleFields = ['sale', 'Sale', 'SALE', 'sale_amount', 'Sale Amount', 'sales_price', 'price'];
    const costFields = ['cost', 'Cost', 'COST', 'cost_amount', 'Cost Amount', 'wholesale', 'book'];
    const grossFields = ['gross', 'Gross', 'GROSS', 'gross_profit', 'Gross Profit'];
    const fiFields = ['fi', 'FI', 'F&I', 'f_i', 'fi_profit', 'FI Profit', 'finance'];

    const age = findNumericValue(row, ageFields);
    const stockNumber = findStringValue(row, stockFields);
    const yearModel = findStringValue(row, yearModelFields);
    const buyerName = findStringValue(row, buyerFields);
    const saleAmount = findNumericValue(row, saleFields);
    const costAmount = findNumericValue(row, costFields);
    const grossProfit = findNumericValue(row, grossFields);
    const fiProfit = findNumericValue(row, fiFields);

    // Calculate total profit if not provided
    const totalProfit = (grossProfit || 0) + (fiProfit || 0);

    // Determine deal type based on age or year
    let dealType: 'new' | 'used' = 'used';
    if (age !== undefined && age <= 365) { // Less than a year old
      dealType = 'new';
    } else if (yearModel) {
      const currentYear = new Date().getFullYear();
      const modelYear = parseInt(yearModel.toString());
      if (modelYear >= currentYear - 1) {
        dealType = 'new';
      }
    }

    return {
      age,
      stockNumber,
      yearModel,
      buyerName,
      saleAmount,
      costAmount,
      grossProfit,
      fiProfit,
      totalProfit,
      dealType
    };
  } catch (error) {
    console.error('Error extracting deal from row:', error);
    return null;
  }
};

const findStringValue = (row: Record<string, any>, fields: string[]): string | undefined => {
  for (const field of fields) {
    if (row[field] !== undefined && row[field] !== null && row[field] !== '') {
      return String(row[field]).trim();
    }
  }
  return undefined;
};

const findNumericValue = (row: Record<string, any>, fields: string[]): number | undefined => {
  for (const field of fields) {
    if (row[field] !== undefined && row[field] !== null && row[field] !== '') {
      const value = parseFloat(String(row[field]).replace(/[,$]/g, ''));
      if (!isNaN(value)) {
        return value;
      }
    }
  }
  return undefined;
};

const isValidDeal = (deal: DealRecord): boolean => {
  // A valid deal should have at least a sale amount or gross profit
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
