
import { getFileType } from './fileDetection';
import { parseExcelFileEnhanced, parseCSVFileEnhanced, getSheetInfo, type ParsedInventoryData, type SheetInfo } from './fileParser';
import { mapRowToInventoryItem } from './inventoryMapper';

// Re-export types and functions for backward compatibility
export type { ParsedInventoryData, SheetInfo };
export { getSheetInfo, mapRowToInventoryItem };

// Enhanced parsing that detects GM/Vauto specific formats and uses unified CSV parsing
export const parseEnhancedInventoryFile = async (file: File, selectedSheet?: string): Promise<ParsedInventoryData> => {
  const fileType = getFileType(file);
  
  console.log(`Parsing ${fileType} file: ${file.name}`);
  
  if (fileType === 'excel') {
    return parseExcelFileEnhanced(file, selectedSheet);
  } else {
    return parseCSVFileEnhanced(file);
  }
};
