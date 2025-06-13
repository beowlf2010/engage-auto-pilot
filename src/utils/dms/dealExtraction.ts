
import { DealRecord, DmsColumns } from './types';
import { findHeaderRowIndex } from './headerDetection';
import { extractDealFromRow } from './dealRowExtractor';

export const extractDealsFromData = (data: any[], columnMapping: DmsColumns): DealRecord[] => {
  console.log('=== DEAL EXTRACTION ===');
  console.log('Column mapping:', columnMapping);
  
  const deals: DealRecord[] = [];
  
  // Find the header row index
  const headerRowIndex = findHeaderRowIndex(data, columnMapping);
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
