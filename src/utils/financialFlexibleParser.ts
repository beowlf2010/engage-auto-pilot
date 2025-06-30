
import { parseCSVFile, parseExcelFile } from './dms/fileReaders';
import { extractDealDate } from './dms/dateParser';
import { FinancialFieldMapping } from '@/components/financial/FinancialCSVFieldMapper';
import { DealRecord, FinancialSummary } from './dms/types';

export interface FlexibleParseResult {
  deals: DealRecord[];
  summary: FinancialSummary;
  fileName: string;
  totalRows: number;
  mapping: FinancialFieldMapping;
}

export const parseFinancialFileWithMapping = async (
  file: File,
  mapping: FinancialFieldMapping
): Promise<FlexibleParseResult> => {
  console.log('=== FLEXIBLE FINANCIAL FILE PARSING ===');
  console.log('File name:', file.name);
  console.log('Field mapping:', mapping);
  
  try {
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    let data: any[];
    
    if (fileExtension === '.csv') {
      data = await parseCSVFile(file);
    } else {
      data = await parseExcelFile(file);
    }
    
    console.log('Raw data rows:', data.length);
    
    // Find header row
    let headerRowIndex = -1;
    for (let i = 0; i < Math.min(10, data.length); i++) {
      const row = data[i];
      if (Array.isArray(row)) {
        // Check if this row contains our mapped headers
        const headerCount = Object.values(mapping).filter(header => 
          header && row.includes(header)
        ).length;
        
        if (headerCount >= 4) { // Need at least 4 mapped headers to be considered header row
          headerRowIndex = i;
          break;
        }
      }
    }
    
    if (headerRowIndex === -1) {
      throw new Error('Could not find header row with mapped columns');
    }
    
    const headerRow = data[headerRowIndex];
    console.log('Header row found at index:', headerRowIndex);
    console.log('Headers:', headerRow);
    
    // Create column index mapping
    const columnIndexes: Record<string, number> = {};
    Object.entries(mapping).forEach(([key, headerName]) => {
      if (headerName) {
        const index = headerRow.indexOf(headerName);
        if (index !== -1) {
          columnIndexes[key] = index;
        }
      }
    });
    
    console.log('Column indexes:', columnIndexes);
    
    // Extract deals from data
    const deals: DealRecord[] = [];
    const dataRows = data.slice(headerRowIndex + 1);
    
    for (const row of dataRows) {
      if (!Array.isArray(row) || row.every(cell => !cell || String(cell).trim() === '')) {
        continue; // Skip empty rows
      }
      
      // Extract values using mapping
      const getValue = (key: string): string => {
        const index = columnIndexes[key];
        return index !== undefined && row[index] !== undefined 
          ? String(row[index]).trim() 
          : '';
      };
      
      const dateStr = getValue('date');
      const stockNumber = getValue('stockNumber');
      const vehicle = getValue('vehicle');
      const customer = getValue('customer');
      
      // Skip rows without required data
      if (!dateStr || !stockNumber || !vehicle || !customer) {
        continue;
      }
      
      // Parse the date using the existing date parser
      const parsedDate = extractDealDate(dateStr);
      if (!parsedDate) {
        console.warn(`Skipping deal with unparseable date: "${dateStr}"`);
        continue; // Skip deals with invalid dates
      }
      
      // Parse numeric values
      const parseNumeric = (value: string): number => {
        const cleaned = value.replace(/[$,\s]/g, '').replace(/[()]/g, '-');
        const num = parseFloat(cleaned);
        return isNaN(num) ? 0 : num;
      };
      
      // Parse age as number
      const parseAge = (value: string): number => {
        const num = parseInt(value) || 0;
        return num;
      };
      
      const deal: DealRecord = {
        saleDate: parsedDate, // Use the parsed date instead of raw string
        age: parseAge(getValue('age') || '0'),
        stockNumber,
        vin: getValue('vin6') || '',
        vehicle,
        tradeValue: parseNumeric(getValue('trade') || '0'),
        saleAmount: parseNumeric(getValue('salePrice') || '0'),
        buyerName: customer,
        grossProfit: parseNumeric(getValue('grossProfit') || '0'),
        fiProfit: parseNumeric(getValue('financeProfit') || '0'),
        totalProfit: parseNumeric(getValue('totalProfit') || '0')
      };
      
      deals.push(deal);
    }
    
    console.log(`Extracted ${deals.length} deals with flexible mapping`);
    
    if (deals.length === 0) {
      throw new Error('No valid deals found. Please check that your file contains transaction data in the mapped columns.');
    }
    
    // Calculate summary using correct property names
    const summary: FinancialSummary = {
      totalUnits: deals.length,
      totalSales: deals.reduce((sum, deal) => sum + (deal.saleAmount || 0), 0),
      totalGross: deals.reduce((sum, deal) => sum + (deal.grossProfit || 0), 0),
      totalFiProfit: deals.reduce((sum, deal) => sum + (deal.fiProfit || 0), 0),
      totalProfit: deals.reduce((sum, deal) => sum + (deal.totalProfit || 0), 0),
      newUnits: 0, // Will be calculated based on deal classification
      newGross: 0,
      usedUnits: deals.length, // Assuming all are used for now
      usedGross: deals.reduce((sum, deal) => sum + (deal.grossProfit || 0), 0),
      retailUnits: deals.length, // Assuming all are retail for now
      retailGross: deals.reduce((sum, deal) => sum + (deal.grossProfit || 0), 0),
      dealerTradeUnits: 0,
      dealerTradeGross: 0,
      wholesaleUnits: 0,
      wholesaleGross: 0
    };
    
    console.log('Summary:', summary);
    
    return {
      deals,
      summary,
      fileName: file.name,
      totalRows: data.length,
      mapping
    };
    
  } catch (error) {
    console.error('Flexible financial parsing error:', error);
    throw error;
  }
};

// Function to analyze file structure and suggest mappings
export const analyzeFileStructure = async (file: File) => {
  console.log('=== ANALYZING FILE STRUCTURE ===');
  
  try {
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    let data: any[];
    
    if (fileExtension === '.csv') {
      data = await parseCSVFile(file);
    } else {
      data = await parseExcelFile(file);
    }
    
    // Find potential header rows
    const potentialHeaders: Array<{index: number, headers: string[], confidence: number}> = [];
    
    for (let i = 0; i < Math.min(10, data.length); i++) {
      const row = data[i];
      if (Array.isArray(row) && row.length > 0) {
        const headers = row.map(cell => String(cell || '').trim()).filter(h => h);
        
        if (headers.length >= 3) {
          // Calculate confidence based on header-like content
          let confidence = 0;
          headers.forEach(header => {
            const lower = header.toLowerCase();
            if (lower.includes('date') || lower.includes('stock') || 
                lower.includes('vehicle') || lower.includes('customer') ||
                lower.includes('gross') || lower.includes('total') ||
                lower.includes('profit') || lower.includes('sale')) {
              confidence += 10;
            }
          });
          
          potentialHeaders.push({ index: i, headers, confidence });
        }
      }
    }
    
    // Sort by confidence and pick the best header row
    potentialHeaders.sort((a, b) => b.confidence - a.confidence);
    const bestHeader = potentialHeaders[0];
    
    if (!bestHeader) {
      throw new Error('Could not detect header row in the file');
    }
    
    // Get sample data from the row after headers
    const sampleRowIndex = bestHeader.index + 1;
    const sampleRow = data[sampleRowIndex];
    const sampleData: Record<string, string> = {};
    
    if (Array.isArray(sampleRow)) {
      bestHeader.headers.forEach((header, index) => {
        sampleData[header] = sampleRow[index] ? String(sampleRow[index]).trim() : '';
      });
    }
    
    return {
      headers: bestHeader.headers,
      sampleData,
      headerRowIndex: bestHeader.index,
      totalRows: data.length,
      confidence: bestHeader.confidence
    };
    
  } catch (error) {
    console.error('File structure analysis error:', error);
    throw error;
  }
};
