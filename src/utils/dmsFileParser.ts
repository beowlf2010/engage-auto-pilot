
import { parseCSVFile, parseExcelFile } from './dms/fileReaders';
import { detectDmsColumns } from './dms/columnDetection';
import { extractDealsFromData } from './dms/dealExtraction';
import { calculateSummaryFromDeals } from './dms/summaryCalculation';

// Re-export types for backward compatibility
export type { DealRecord, FinancialSummary } from './dms/types';

export const parseDmsFile = async (file: File) => {
  console.log('=== DMS FILE PARSING ===');
  console.log('File name:', file.name);
  console.log('File size:', file.size);
  
  try {
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    let data: any[];
    
    if (fileExtension === '.csv') {
      data = await parseCSVFile(file);
    } else {
      data = await parseExcelFile(file);
    }
    
    console.log('Raw data rows:', data.length);
    console.log('First few rows:');
    data.slice(0, 10).forEach((row, index) => {
      console.log(`Row ${index}:`, row);
    });
    
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
      console.error('=== DIAGNOSTIC INFO ===');
      console.error('Total data rows:', data.length);
      console.error('Column mapping found:', columnMapping);
      console.error('Sample of data rows:');
      data.slice(0, 15).forEach((row, index) => {
        console.error(`  Row ${index}:`, row);
      });
      throw new Error(`No valid deals found in the file. Found ${data.length} total rows but could not extract any deals. Check the console for detailed parsing information.`);
    }
    
    // Log sample deal for debugging
    console.log('Sample deal:', deals[0]);
    
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
