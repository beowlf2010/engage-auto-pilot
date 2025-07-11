
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
  console.log('Header row content:', headerRow);
  console.log('Processing deals starting from row:', headerRowIndex + 1);
  console.log(`Total data rows to process: ${data.length - headerRowIndex - 1}`);
  
  for (let i = headerRowIndex + 1; i < data.length; i++) {
    const row = data[i];
    if (!Array.isArray(row)) continue;
    
    // Skip empty rows
    if (row.every(cell => !cell || String(cell).trim() === '')) {
      console.log(`Row ${i}: Skipping empty row`);
      continue;
    }
    
    console.log(`Row ${i}: Processing row with ${row.length} columns:`, row.slice(0, 5), '...');
    
    try {
      const deal = extractDealFromRow(row, headerRow, columnMapping);
      if (deal) {
        console.log(`Row ${i}: ✅ Extracted deal - Stock: ${deal.stockNumber}, Date: ${deal.saleDate}, Gross: ${deal.grossProfit}, FI: ${deal.fiProfit}`);
        deals.push(deal);
      } else {
        console.log(`Row ${i}: ❌ No deal extracted (likely insufficient data)`);
      }
    } catch (error) {
      console.error(`Row ${i}: ⚠️ Error processing row:`, error);
      console.log(`Row ${i}: Raw row data:`, row);
    }
  }
  
  console.log(`Extracted ${deals.length} deals`);
  return deals;
};
