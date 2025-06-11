
import * as XLSX from 'xlsx';

export interface ParsedInventoryData {
  headers: string[];
  rows: any[];
  sample: Record<string, string>;
  fileType: 'csv' | 'excel';
  formatType?: 'new_car_main_view' | 'merch_inv_view' | 'orders_all' | 'gm_orders' | 'gm_global' | 'unknown';
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

const detectFormatType = (headers: string[]): 'new_car_main_view' | 'merch_inv_view' | 'orders_all' | 'gm_orders' | 'gm_global' | 'unknown' => {
  const headerStr = headers.join('|').toLowerCase();
  
  // Check for GM Global format (comprehensive GM identifiers)
  if (headerStr.includes('gm config id') || 
      headerStr.includes('order #') && headerStr.includes('division') ||
      headerStr.includes('current event') && headerStr.includes('gm') ||
      headerStr.includes('dealer code') && headerStr.includes('order status')) {
    return 'gm_global';
  }
  
  // Check for GM orders format (legacy detection)
  if (headerStr.includes('order #') && headerStr.includes('gm config id') && headerStr.includes('current event')) {
    return 'gm_orders';
  }
  
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

// Enhanced mapping function that handles GM Global specific fields
export const mapRowToInventoryItem = (row: Record<string, any>, condition: 'new' | 'used' | 'gm_global', uploadHistoryId: string) => {
  console.log('=== FIELD MAPPING DEBUG ===');
  console.log('Row data received:', row);
  console.log('Available column names:', Object.keys(row));
  console.log('Number of columns:', Object.keys(row).length);
  console.log('Condition:', condition);
  
  // Enhanced field mapping with exact matches and comprehensive alternatives
  const getFieldValue = (possibleFields: string[]): string => {
    console.log(`Looking for field from options: [${possibleFields.join(', ')}]`);
    
    for (const field of possibleFields) {
      // Try exact match first
      if (row[field] !== undefined && row[field] !== null && row[field] !== '') {
        const value = String(row[field]).trim();
        console.log(`✓ Found exact match for "${field}": "${value}"`);
        return value;
      }
    }
    
    // Try case-insensitive and partial matches
    for (const field of possibleFields) {
      const lowerField = field.toLowerCase();
      for (const key of Object.keys(row)) {
        const lowerKey = key.toLowerCase();
        if (lowerKey === lowerField || lowerKey.includes(lowerField) || lowerField.includes(lowerKey)) {
          if (row[key] !== undefined && row[key] !== null && row[key] !== '') {
            const value = String(row[key]).trim();
            console.log(`✓ Found fuzzy match "${key}" for "${field}": "${value}"`);
            return value;
          }
        }
      }
    }
    
    console.log(`✗ No match found for any of: [${possibleFields.join(', ')}]`);
    return '';
  };

  // GM Global specific field mapping
  if (condition === 'gm_global') {
    const vinFields = [
      'VIN', 'vin', 'Vin', 'Vehicle VIN', 'Unit VIN',
      'VIN Number', 'Vehicle Identification Number'
    ];
    
    const makeFields = [
      'Division', 'Make', 'Brand', 'Manufacturer',
      'GM Division', 'Vehicle Make', 'Auto Make'
    ];
    
    const modelFields = [
      'Model', 'Vehicle Model', 'Product',
      'Model Name', 'Series Model', 'Product Name'
    ];
    
    const yearFields = [
      'Year', 'Model Year', 'MY', 'Vehicle Year',
      'Model_Year', 'Yr'
    ];
    
    const stockFields = [
      'Order #', 'Order Number', 'Stock Number', 'Stock',
      'Dealer Stock', 'Unit Number', 'Order ID'
    ];

    const vin = getFieldValue(vinFields);
    const make = getFieldValue(makeFields);
    const model = getFieldValue(modelFields);
    const year = getFieldValue(yearFields);
    const stockNumber = getFieldValue(stockFields);

    console.log('=== GM GLOBAL MAPPED VALUES ===');
    console.log('VIN:', vin);
    console.log('Make:', make);
    console.log('Model:', model);
    console.log('Year:', year);
    console.log('Stock Number:', stockNumber);
    console.log('================================');

    return {
      vin: vin || '',
      stock_number: stockNumber || undefined,
      year: year ? parseInt(year) : undefined,
      make: make || '',
      model: model || '',
      trim: getFieldValue(['Trim', 'Series', 'Level', 'Grade']) || undefined,
      body_style: getFieldValue(['Body Style', 'Body', 'Style', 'Body Type']) || undefined,
      color_exterior: getFieldValue(['Exterior Color', 'ExtColor', 'Color', 'Paint Code']) || undefined,
      color_interior: getFieldValue(['Interior Color', 'IntColor', 'Interior', 'Trim Color']) || undefined,
      engine: getFieldValue(['Engine', 'Engine Description', 'Motor', 'Engine Code']) || undefined,
      transmission: getFieldValue(['Transmission', 'Trans', 'Transmission Type']) || undefined,
      drivetrain: getFieldValue(['Drivetrain', 'Drive', 'DriveTrain', 'Drive Type']) || undefined,
      fuel_type: getFieldValue(['Fuel Type', 'Fuel', 'Fuel System']) || undefined,
      mileage: parseInt(getFieldValue(['Mileage', 'Odometer', 'Miles', 'Current Mileage'])) || undefined,
      price: parseFloat(getFieldValue(['Price', 'MSRP', 'Selling Price', 'Retail Price'])) || undefined,
      msrp: parseFloat(getFieldValue(['MSRP', 'Retail Price', 'List Price', 'Suggested Retail'])) || undefined,
      invoice: parseFloat(getFieldValue(['Invoice', 'Invoice Price', 'Dealer Cost'])) || undefined,
      condition: 'new', // GM Global orders are typically new vehicles
      status: 'available',
      source_report: 'gm_orders' as any,
      full_option_blob: row,
      first_seen_at: new Date().toISOString(),
      last_seen_at: new Date().toISOString(),
      upload_history_id: uploadHistoryId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }

  // Standard field mapping for regular uploads (existing logic)
  const vinFields = [
    'VIN', 'vin', 'Vin', 
    'Vehicle_VIN', 'VehicleVIN', 'Vehicle VIN',
    'Stock VIN', 'Unit VIN'
  ];
  
  const makeFields = [
    'Make', 'make', 'MAKE', 
    'Vehicle_Make', 'VehicleMake', 'Vehicle Make',
    'Manufacturer', 'Brand', 'Division',
    'GM Division', 'Auto Make'
  ];
  
  const modelFields = [
    'Model', 'model', 'MODEL', 
    'Vehicle_Model', 'VehicleModel', 'Vehicle Model',
    'Model Name', 'Product', 'Series Model'
  ];
  
  const yearFields = [
    'Year', 'year', 'YEAR', 
    'Model_Year', 'ModelYear', 'Model Year',
    'Vehicle_Year', 'VehicleYear', 'Vehicle Year',
    'MY', 'Yr'
  ];
  
  const stockFields = [
    'Stock', 'stock', 'StockNumber', 'Stock_Number', 'Stock Number', 'Stock No.',
    'VehicleStockNumber', 'Dealer Stock', 'Unit Number',
    'Inventory Number', 'Stock #'
  ];

  const vin = getFieldValue(vinFields);
  const make = getFieldValue(makeFields);
  const model = getFieldValue(modelFields);
  const year = getFieldValue(yearFields);
  const stockNumber = getFieldValue(stockFields);

  console.log('=== FINAL MAPPED VALUES ===');
  console.log('VIN:', vin);
  console.log('Make:', make);
  console.log('Model:', model);
  console.log('Year:', year);
  console.log('Stock Number:', stockNumber);
  console.log('===============================');

  // Extract RPO codes from various possible fields
  const extractRPOCodes = (row: Record<string, any>): string[] => {
    const rpoFields = [
      'rpo_codes', 'option_codes', 'options', 'rpo', 'accessories', 'RPO_Codes', 'OptionCodes',
      'Ordered Options', 'Options', 'Equipment', 'Features'
    ];
    let rpoCodes: string[] = [];
    
    for (const field of rpoFields) {
      const value = getFieldValue([field]);
      if (value) {
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

  // For GM orders, try to extract make from other fields if not found directly
  let finalMake = make;
  if (!finalMake && row['Division']) {
    finalMake = String(row['Division']).trim();
    console.log('Using Division as Make:', finalMake);
  }
  if (!finalMake && row['GM Config ID']) {
    // Could potentially derive make from GM Config ID patterns
    finalMake = 'GM'; // Default for GM orders
    console.log('Defaulting to GM for GM orders');
  }

  // Map gm_global condition to database-compatible condition
  const dbCondition = condition === 'gm_global' ? 'new' : condition;

  return {
    vin: vin || '',
    stock_number: stockNumber || undefined,
    year: year ? parseInt(year) : undefined,
    make: finalMake || '',
    model: model || '',
    trim: getFieldValue(['Trim', 'trim', 'TRIM', 'Series', 'series', 'Level']) || undefined,
    body_style: getFieldValue(['BodyStyle', 'Body_Style', 'body_style', 'Body', 'body', 'Style']) || undefined,
    color_exterior: getFieldValue(['ExteriorColor', 'Exterior_Color', 'color_exterior', 'ExtColor', 'ext_color', 'Color', 'Exterior']) || undefined,
    color_interior: getFieldValue(['InteriorColor', 'Interior_Color', 'color_interior', 'IntColor', 'int_color', 'Interior']) || undefined,
    engine: getFieldValue(['Engine', 'engine', 'ENGINE', 'Engine_Description', 'Motor']) || undefined,
    transmission: getFieldValue(['Transmission', 'transmission', 'TRANSMISSION', 'Trans', 'trans']) || undefined,
    drivetrain: getFieldValue(['Drivetrain', 'drivetrain', 'DRIVETRAIN', 'Drive', 'drive', 'DriveTrain']) || undefined,
    fuel_type: getFieldValue(['FuelType', 'Fuel_Type', 'fuel_type', 'Fuel', 'fuel']) || undefined,
    mileage: parseInt(getFieldValue(['Mileage', 'mileage', 'MILEAGE', 'Odometer', 'odometer', 'Miles'])) || undefined,
    price: parseFloat(getFieldValue(['Price', 'price', 'PRICE', 'SellingPrice', 'Selling_Price', 'MSRP'])) || undefined,
    msrp: parseFloat(getFieldValue(['MSRP', 'msrp', 'MSRP w/DFC†', 'RetailPrice', 'Retail_Price', 'Retail'])) || undefined,
    invoice: parseFloat(getFieldValue(['Invoice', 'invoice', 'INVOICE', 'InvoicePrice', 'Invoice_Price'])) || undefined,
    rebates: parseFloat(getFieldValue(['Rebates', 'rebates', 'REBATES', 'Incentives', 'incentives'])) || undefined,
    pack: parseFloat(getFieldValue(['Pack', 'pack', 'PACK', 'DealerPack', 'Dealer_Pack'])) || undefined,
    condition: dbCondition,
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
