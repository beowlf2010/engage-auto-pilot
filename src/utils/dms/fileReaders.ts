
import * as XLSX from 'xlsx';

export const parseCSVFile = async (file: File): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim());
        
        // Parse CSV lines into arrays
        const data = lines.map(line => {
          // Simple CSV parsing - handles basic cases
          const values = [];
          let current = '';
          let inQuotes = false;
          
          for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
              inQuotes = !inQuotes;
            } else if (char === '\t' && !inQuotes) {
              // Tab-separated values
              values.push(current.trim());
              current = '';
            } else if (char === ',' && !inQuotes) {
              // Comma-separated values
              values.push(current.trim());
              current = '';
            } else {
              current += char;
            }
          }
          
          // Add the last value
          values.push(current.trim());
          return values;
        });
        
        console.log('CSV parsed, rows:', data.length);
        resolve(data);
      } catch (error) {
        reject(new Error(`Error parsing CSV file: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    };
    
    reader.onerror = () => reject(new Error('Error reading CSV file'));
    reader.readAsText(file);
  });
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
