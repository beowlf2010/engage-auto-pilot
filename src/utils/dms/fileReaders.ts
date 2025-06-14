
import * as XLSX from 'xlsx';
import { parseCSVFile as parseCSVWithUnifiedParser } from '@/utils/csvParser';

export const parseCSVFile = async (file: File): Promise<any[]> => {
  try {
    const parsed = await parseCSVWithUnifiedParser(file);
    console.log('CSV parsed with unified parser, rows:', parsed.rows.length);
    
    // Convert to array format for backward compatibility
    const result = [parsed.headers, ...parsed.rows.map(row => 
      parsed.headers.map(header => row[header] || '')
    )];
    
    return result;
  } catch (error) {
    throw new Error(`Error parsing CSV file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export const parseExcelFile = async (file: File): Promise<any[]> => {
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
