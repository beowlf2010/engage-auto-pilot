
import * as XLSX from 'xlsx';

export interface EnhancedParsedFileData {
  headers: string[];
  rows: any[];
  sample: Record<string, string>;
  fileType: 'csv' | 'excel';
  sheetNames?: string[];
  selectedSheet?: string;
  formatType?: 'vauto_new' | 'vauto_used' | 'gm_global' | 'generic';
}

export interface SheetInfo {
  name: string;
  rowCount: number;
  hasHeaders: boolean;
  preview: string[];
}

// Enhanced column mapping for Vauto and GM Global formats
const VAUTO_NEW_COLUMNS = [
  'stock_number', 'vin', 'year', 'make', 'model', 'trim', 'body_style',
  'color_exterior', 'color_interior', 'engine', 'transmission', 'drivetrain',
  'fuel_type', 'mileage', 'msrp', 'invoice_cost', 'dealer_pack', 'holdback',
  'incentives', 'internet_price', 'finance_payment', 'lease_payment',
  'certification_type', 'warranty_type', 'warranty_months', 'warranty_miles',
  'window_sticker_url', 'photos_urls', 'lot_location', 'sales_rep'
];

const VAUTO_USED_COLUMNS = [
  'stock_number', 'vin', 'year', 'make', 'model', 'trim', 'body_style',
  'color_exterior', 'color_interior', 'engine', 'transmission', 'drivetrain',
  'fuel_type', 'mileage', 'price', 'wholesale_cost', 'reconditioning_cost',
  'book_value', 'trade_value', 'internet_price', 'finance_payment',
  'acquisition_date', 'days_in_inventory', 'turn_goal_days', 'age_group',
  'accidents_reported', 'previous_owners', 'service_records_available',
  'title_status', 'lien_holder', 'source_acquired', 'lot_location', 'sales_rep'
];

const GM_GLOBAL_COLUMNS = [
  'stock_number', 'vin', 'year', 'make', 'model', 'trim', 'body_style',
  'color_exterior', 'color_interior', 'engine', 'transmission', 'drivetrain',
  'fuel_type', 'mileage', 'msrp', 'invoice_cost', 'dealer_pack', 'holdback',
  'incentives', 'internet_price', 'certification_type', 'warranty_type',
  'warranty_months', 'warranty_miles', 'factory_warranty_remaining',
  'vehicle_history_report', 'window_sticker_url', 'photos_urls',
  'key_count', 'profit_margin', 'expected_sale_date', 'lot_location', 'sales_rep'
];

export const detectFileFormat = (headers: string[]): 'vauto_new' | 'vauto_used' | 'gm_global' | 'generic' => {
  const normalizedHeaders = headers.map(h => h.toLowerCase().replace(/[^a-z0-9]/g, '_'));
  
  // Check for Vauto New indicators
  const vautoNewMatches = VAUTO_NEW_COLUMNS.filter(col => 
    normalizedHeaders.some(h => h.includes(col.toLowerCase()))
  ).length;
  
  // Check for Vauto Used indicators
  const vautoUsedMatches = VAUTO_USED_COLUMNS.filter(col => 
    normalizedHeaders.some(h => h.includes(col.toLowerCase()))
  ).length;
  
  // Check for GM Global indicators
  const gmGlobalMatches = GM_GLOBAL_COLUMNS.filter(col => 
    normalizedHeaders.some(h => h.includes(col.toLowerCase()))
  ).length;
  
  // Determine format based on highest match count
  const maxMatches = Math.max(vautoNewMatches, vautoUsedMatches, gmGlobalMatches);
  
  if (maxMatches < 5) return 'generic'; // Not enough matches for any format
  
  if (vautoNewMatches === maxMatches) return 'vauto_new';
  if (vautoUsedMatches === maxMatches) return 'vauto_used';
  if (gmGlobalMatches === maxMatches) return 'gm_global';
  
  return 'generic';
};

export const getSheetInfo = async (file: File): Promise<SheetInfo[]> => {
  if (!file.name.toLowerCase().match(/\.(xlsx|xls)$/)) {
    return [];
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        const sheetsInfo: SheetInfo[] = workbook.SheetNames.map(sheetName => {
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          
          return {
            name: sheetName,
            rowCount: jsonData.length,
            hasHeaders: jsonData.length > 0 && Array.isArray(jsonData[0]),
            preview: jsonData.slice(0, 3).map(row => 
              Array.isArray(row) ? row.slice(0, 5).join(', ') : String(row)
            )
          };
        });
        
        resolve(sheetsInfo);
      } catch (error) {
        reject(new Error(`Error reading Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    };
    
    reader.onerror = () => reject(new Error('Error reading Excel file'));
    reader.readAsArrayBuffer(file);
  });
};

export const parseEnhancedInventoryFile = async (
  file: File, 
  selectedSheet?: string
): Promise<EnhancedParsedFileData> => {
  const fileType = getFileType(file);
  
  if (fileType === 'excel') {
    return parseEnhancedExcelFile(file, selectedSheet);
  } else {
    return parseEnhancedCSVFile(file);
  }
};

const getFileType = (file: File): 'csv' | 'excel' => {
  const extension = file.name.toLowerCase();
  if (extension.endsWith('.xlsx') || extension.endsWith('.xls')) {
    return 'excel';
  }
  return 'csv';
};

const parseEnhancedExcelFile = async (file: File, selectedSheet?: string): Promise<EnhancedParsedFileData> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Use selected sheet or first sheet
        const sheetName = selectedSheet || workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        if (!worksheet) {
          throw new Error(`Sheet "${sheetName}" not found`);
        }
        
        // Convert to JSON array
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (jsonData.length < 2) {
          throw new Error('Excel file must have at least a header row and one data row');
        }
        
        const headers = (jsonData[0] as any[]).map(h => String(h || '').trim());
        const dataRows = jsonData.slice(1).filter(row => 
          Array.isArray(row) && row.some(cell => cell !== null && cell !== undefined && cell !== '')
        );
        
        const rows = dataRows.map(row => {
          const rowObj: Record<string, string> = {};
          headers.forEach((header, index) => {
            const cellValue = (row as any[])[index];
            rowObj[header] = cellValue !== null && cellValue !== undefined ? String(cellValue).trim() : '';
          });
          return rowObj;
        });
        
        const sample = rows[0] || {};
        const formatType = detectFileFormat(headers);
        
        resolve({
          headers,
          rows,
          sample,
          fileType: 'excel',
          sheetNames: workbook.SheetNames,
          selectedSheet: sheetName,
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

const parseEnhancedCSVFile = async (file: File): Promise<EnhancedParsedFileData> => {
  const text = await file.text();
  const lines = text.split('\n').filter(line => line.trim());
  
  if (lines.length < 2) {
    throw new Error('CSV must have at least a header and one data row');
  }
  
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  const rows = lines.slice(1).map(line => {
    const values = line.split(',');
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index]?.trim().replace(/"/g, '') || '';
    });
    return row;
  });

  const sample = rows[0] || {};
  const formatType = detectFileFormat(headers);
  
  return {
    headers,
    rows,
    sample,
    fileType: 'csv',
    formatType
  };
};

// Enhanced mapping function for comprehensive field capture
export const mapRowToInventoryItem = (row: Record<string, string>, condition: string, uploadHistoryId: string) => {
  // Comprehensive field mapping with multiple possible column name variations
  const getFieldValue = (fieldNames: string[]) => {
    for (const fieldName of fieldNames) {
      const value = row[fieldName] || row[fieldName.toLowerCase()] || row[fieldName.toUpperCase()];
      if (value && value.trim()) return value.trim();
    }
    return null;
  };

  const getNumericValue = (fieldNames: string[]) => {
    const value = getFieldValue(fieldNames);
    if (!value) return null;
    const numeric = parseFloat(value.replace(/[^0-9.-]/g, ''));
    return isNaN(numeric) ? null : numeric;
  };

  const getIntegerValue = (fieldNames: string[]) => {
    const value = getFieldValue(fieldNames);
    if (!value) return null;
    const integer = parseInt(value.replace(/[^0-9]/g, ''));
    return isNaN(integer) ? null : integer;
  };

  const getBooleanValue = (fieldNames: string[]) => {
    const value = getFieldValue(fieldNames);
    if (!value) return false;
    return ['true', 'yes', '1', 'y'].includes(value.toLowerCase());
  };

  return {
    vin: getFieldValue(['VIN', 'vin', 'Vin', 'vehicle_id']) || '',
    stock_number: getFieldValue(['stock_number', 'stock', 'Stock', 'StockNumber', 'stock_no']),
    year: getIntegerValue(['year', 'Year', 'MODEL_YEAR', 'model_year']),
    make: getFieldValue(['make', 'Make', 'MAKE', 'manufacturer']) || '',
    model: getFieldValue(['model', 'Model', 'MODEL', 'model_name']) || '',
    trim: getFieldValue(['trim', 'Trim', 'TRIM', 'trim_level']),
    body_style: getFieldValue(['body_style', 'style', 'BodyStyle', 'BODY_STYLE', 'body_type']),
    color_exterior: getFieldValue(['color_exterior', 'exterior_color', 'ExteriorColor', 'EXTERIOR_COLOR', 'ext_color']),
    color_interior: getFieldValue(['color_interior', 'interior_color', 'InteriorColor', 'INTERIOR_COLOR', 'int_color']),
    mileage: getIntegerValue(['mileage', 'Mileage', 'MILEAGE', 'odometer', 'miles']),
    price: getNumericValue(['price', 'Price', 'PRICE', 'asking_price', 'retail_price']),
    msrp: getNumericValue(['msrp', 'MSRP', 'list_price', 'suggested_retail']),
    condition: condition,
    status: (getFieldValue(['status', 'Status', 'STATUS', 'inventory_status']) || 'available').toLowerCase(),
    fuel_type: getFieldValue(['fuel_type', 'fuel', 'FuelType', 'FUEL_TYPE', 'fuel_system']),
    transmission: getFieldValue(['transmission', 'trans', 'Transmission', 'TRANSMISSION', 'trans_type']),
    drivetrain: getFieldValue(['drivetrain', 'drive', 'Drivetrain', 'DRIVETRAIN', 'drive_type']),
    engine: getFieldValue(['engine', 'Engine', 'ENGINE', 'engine_desc']),
    description: getFieldValue(['description', 'Description', 'DESCRIPTION', 'comments']),
    location: getFieldValue(['location', 'Location', 'LOCATION', 'lot_location']) || 'lot',
    
    // Enhanced fields for comprehensive capture
    invoice_cost: getNumericValue(['invoice_cost', 'invoice', 'Invoice', 'INVOICE_COST', 'cost']),
    wholesale_cost: getNumericValue(['wholesale_cost', 'wholesale', 'Wholesale', 'WHOLESALE_COST']),
    reconditioning_cost: getNumericValue(['reconditioning_cost', 'recon_cost', 'reconditioning', 'RECON_COST']),
    dealer_pack: getNumericValue(['dealer_pack', 'pack', 'Pack', 'DEALER_PACK']),
    holdback: getNumericValue(['holdback', 'Holdback', 'HOLDBACK']),
    incentives: getNumericValue(['incentives', 'Incentives', 'INCENTIVES', 'rebates']),
    book_value: getNumericValue(['book_value', 'book', 'Book_Value', 'BOOK_VALUE']),
    trade_value: getNumericValue(['trade_value', 'trade', 'Trade_Value', 'TRADE_VALUE']),
    lot_location: getFieldValue(['lot_location', 'lot', 'Lot_Location', 'LOT_LOCATION']),
    sales_rep: getFieldValue(['sales_rep', 'salesperson', 'Sales_Rep', 'SALES_REP']),
    window_sticker_url: getFieldValue(['window_sticker_url', 'window_sticker', 'sticker_url']),
    certification_type: getFieldValue(['certification_type', 'certification', 'cert_type']),
    warranty_type: getFieldValue(['warranty_type', 'warranty', 'Warranty_Type']),
    warranty_months: getIntegerValue(['warranty_months', 'warranty_mo', 'Warranty_Months']),
    warranty_miles: getIntegerValue(['warranty_miles', 'warranty_mi', 'Warranty_Miles']),
    vehicle_history_report: getFieldValue(['vehicle_history_report', 'history_report', 'carfax']),
    accidents_reported: getIntegerValue(['accidents_reported', 'accidents', 'Accidents']),
    previous_owners: getIntegerValue(['previous_owners', 'owners', 'Previous_Owners']),
    service_records_available: getBooleanValue(['service_records_available', 'service_records', 'Service_Records']),
    factory_warranty_remaining: getBooleanValue(['factory_warranty_remaining', 'factory_warranty', 'Factory_Warranty']),
    key_count: getIntegerValue(['key_count', 'keys', 'Key_Count']),
    title_status: getFieldValue(['title_status', 'title', 'Title_Status']),
    lien_holder: getFieldValue(['lien_holder', 'lien', 'Lien_Holder']),
    profit_margin: getNumericValue(['profit_margin', 'margin', 'Profit_Margin']),
    internet_price: getNumericValue(['internet_price', 'web_price', 'Internet_Price']),
    finance_payment: getNumericValue(['finance_payment', 'payment', 'Finance_Payment']),
    lease_payment: getNumericValue(['lease_payment', 'lease', 'Lease_Payment']),
    cash_down_payment: getNumericValue(['cash_down_payment', 'down_payment', 'Cash_Down']),
    source_acquired: getFieldValue(['source_acquired', 'source', 'Source_Acquired']),
    upload_history_id: uploadHistoryId
  };
};
