
import { getSheetInfo, type SheetInfo } from "@/utils/enhancedFileParsingUtils";

export interface FileUploadResult {
  shouldShowSheetSelector: boolean;
  sheets?: SheetInfo[];
  shouldProcess: boolean;
}

export const handleFileSelection = async (file: File): Promise<FileUploadResult> => {
  const validExtensions = ['.csv', '.xlsx', '.xls'];
  const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
  
  if (!validExtensions.includes(fileExtension)) {
    throw new Error("Please upload a CSV or Excel file (.csv, .xlsx, .xls)");
  }

  // Check if it's an Excel file with multiple sheets
  if (fileExtension === '.xlsx' || fileExtension === '.xls') {
    try {
      const sheets = await getSheetInfo(file);
      if (sheets.length > 1) {
        return {
          shouldShowSheetSelector: true,
          sheets,
          shouldProcess: false
        };
      }
    } catch (error) {
      console.error('Error getting sheet info:', error);
    }
  }

  return {
    shouldShowSheetSelector: false,
    shouldProcess: true
  };
};
