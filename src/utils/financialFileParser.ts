
import { parseDmsFile } from './dmsFileParser';

// Re-export types for backward compatibility
export type { DealRecord, FinancialSummary } from './dmsFileParser';

export const parseFinancialFile = async (file: File) => {
  console.log('=== FINANCIAL FILE PARSING ===');
  
  // Validate file type
  const validExtensions = ['.xlsx', '.xls'];
  const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
  
  if (!validExtensions.includes(fileExtension)) {
    throw new Error('Invalid file format. Please upload an Excel file (.xlsx or .xls)');
  }
  
  try {
    return await parseDmsFile(file);
  } catch (error) {
    console.error('Financial file parsing failed:', error);
    throw error;
  }
};
