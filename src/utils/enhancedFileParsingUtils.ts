
import * as XLSX from 'xlsx';

export interface ParsedInventoryData {
  headers: string[];
  rows: any[];
  sample: Record<string, string>;
  fileType: 'csv' | 'excel';
  formatType?: 'new_car_main_view' | 'merch_inv_view' | 'orders_all' | 'unknown';
}

export interface SheetInfo {
  name: string;
  rowCount: number;
}

// Enhanced parsing that detects GM/Vauto specific formats
export const parseEnhancedInventoryFile = async (file: File, selectedSheet?: string): Promise<ParsedInventoryData> => {
  const fileType = getFileType(file);
  
  if (fileType === 'excel') {
    return parseExcelFileEnhanced(file, selectedSheet);
  } else {
    return parseCSVFileEnhanced(file);
  }
};

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

const getFileType = (file: File): 'csv' | 'excel' => {
  const extension = file.name.toLowerCase();
  if (extension.endsWith('.xlsx') || extension.endsWith('.xls')) {
    return 'excel';
  }
  return 'csv';
};

const detectFormatType = (headers: string[]): 'new_car_main_view' | 'merch_inv_view' | 'orders_all' | 'unknown' => {
  const headerStr = headers.join('|').toLowerCase();
  
  // Check for specific patterns that indicate each format
  if (headerStr.includes('new') && headerStr.includes('main')) {
    return 'new_car_main_view';
  }
  if (headerStr.includes('merch') && headerStr.includes('inv')) {
    return 'merch_inv_view';
  }
  if (headerStr.includes('order')) {
    return 'orders_all';
  }
  
  return 'unknown';
};

const parseExcelFileEnhanced = async (file: File, selectedSheet?: string): Promise<ParsedInventoryData> => {
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

const parseCSVFileEnhanced = async (file: File): Promise<ParsedInventoryData> => {
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

// Enhanced mapping function that handles GM/Vauto specific fields
export const mapRowToInventoryItem = (row: Record<string, any>, condition: 'new' | 'used' | 'certified', uploadHistoryId: string) => {
  // Extract RPO codes from various possible fields
  const extractRPOCodes = (row: Record<string, any>): string[] => {
    const rpoFields = ['rpo_codes', 'option_codes', 'options', 'rpo', 'accessories'];
    let rpoCodes: string[] = [];
    
    for (const field of rpoFields) {
      const value = row[field];
      if (value && typeof value === 'string') {
        // Split by common delimiters and clean up
        const codes = value.split(/[,;|\s]+/).filter(code => 
          code.trim().length > 0 && /^[A-Z0-9]{2,5}$/.test(code.trim())
        );
        rpoCodes = [...rpoCodes, ...codes.map(code => code.trim().toUpperCase())];
      }
    }
    
    return [...new Set(rpoCodes)]; // Remove duplicates
  };

  const rpoCodes = extractRPOCodes(row);

  return {
    vin: String(row.vin || row.VIN || '').trim(),
    stock_number: String(row.stock_number || row.stock || row.stocknumber || '').trim() || undefined,
    year: parseInt(String(row.year || row.model_year || '')) || undefined,
    make: String(row.make || '').trim(),
    model: String(row.model || '').trim(),
    trim: String(row.trim || row.series || '').trim() || undefined,
    body_style: String(row.body_style || row.body || '').trim() || undefined,
    color_exterior: String(row.color_exterior || row.exterior_color || row.ext_color || '').trim() || undefined,
    color_interior: String(row.color_interior || row.interior_color || row.int_color || '').trim() || undefined,
    engine: String(row.engine || row.engine_description || '').trim() || undefined,
    transmission: String(row.transmission || row.trans || '').trim() || undefined,
    drivetrain: String(row.drivetrain || row.drive || '').trim() || undefined,
    fuel_type: String(row.fuel_type || row.fuel || '').trim() || undefined,
    mileage: parseInt(String(row.mileage || row.odometer || '')) || undefined,
    price: parseFloat(String(row.price || row.selling_price || '')) || undefined,
    msrp: parseFloat(String(row.msrp || row.retail_price || '')) || undefined,
    invoice: parseFloat(String(row.invoice || row.invoice_price || '')) || undefined,
    rebates: parseFloat(String(row.rebates || row.incentives || '')) || undefined,
    pack: parseFloat(String(row.pack || row.dealer_pack || '')) || undefined,
    condition,
    status: 'available',
    rpo_codes: rpoCodes.length > 0 ? rpoCodes : undefined,
    rpo_descriptions: undefined, // Will be populated later if available
    full_option_blob: row, // Store complete raw data
    first_seen_at: new Date().toISOString(),
    last_seen_at: new Date().toISOString(),
    upload_history_id: uploadHistoryId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
};
