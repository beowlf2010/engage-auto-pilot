
import * as XLSX from 'xlsx';
import { detectFormatType } from './fileDetection';

export interface SheetInfo {
  name: string;
  rowCount: number;
}

export interface ParsedInventoryData {
  headers: string[];
  rows: any[];
  sample: Record<string, string>;
  fileType: 'csv' | 'excel';
  formatType?: 'new_car_main_view' | 'merch_inv_view' | 'orders_all' | 'gm_orders' | 'gm_global' | 'unknown';
}

export const getSheetInfo = async (file: File): Promise<SheetInfo[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        const sheets = workbook.SheetNames.map(name => {
          const worksheet = workbook.Sheets[name];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          return {
            name,
            rowCount: jsonData.length
          };
        });
        
        resolve(sheets);
      } catch (error) {
        reject(new Error(`Error reading Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    };
    
    reader.onerror = () => reject(new Error('Error reading Excel file'));
    reader.readAsArrayBuffer(file);
  });
};

export const parseExcelFileEnhanced = async (file: File, selectedSheet?: string): Promise<ParsedInventoryData> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Use selected sheet or first sheet
        const sheetName = selectedSheet || workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (jsonData.length < 2) {
          throw new Error('Excel file must have at least a header row and one data row');
        }
        
        const headers = (jsonData[0] as any[]).map(h => String(h || '').trim());
        const formatType = detectFormatType(headers);
        
        const dataRows = jsonData.slice(1).filter(row => 
          Array.isArray(row) && row.some(cell => cell !== null && cell !== undefined && cell !== '')
        );
        
        const rows = dataRows.map(row => {
          const rowObj: Record<string, any> = {};
          headers.forEach((header, index) => {
            const cellValue = (row as any[])[index];
            rowObj[header] = cellValue !== null && cellValue !== undefined ? cellValue : '';
          });
          return rowObj;
        });
        
        const sample = rows[0] || {};
        
        resolve({
          headers,
          rows,
          sample,
          fileType: 'excel',
          formatType
        });
      } catch (error) {
        reject(new Error(`Error parsing Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    };
    
    reader.onerror = () => reject(new Error('Error reading Excel file'));
    reader.readAsArrayBuffer(file);
  });
};

export const parseCSVFileEnhanced = async (file: File): Promise<ParsedInventoryData> => {
  const text = await file.text();
  const lines = text.split('\n').filter(line => line.trim());
  
  if (lines.length < 2) {
    throw new Error('CSV must have at least a header and one data row');
  }
  
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  const formatType = detectFormatType(headers);
  
  const rows = lines.slice(1).map(line => {
    const values = line.split(',');
    const row: Record<string, any> = {};
    headers.forEach((header, index) => {
      const value = values[index]?.trim().replace(/"/g, '') || '';
      row[header] = value;
    });
    return row;
  });

  const sample = rows[0] || {};
  
  return {
    headers,
    rows,
    sample,
    fileType: 'csv',
    formatType
  };
};
