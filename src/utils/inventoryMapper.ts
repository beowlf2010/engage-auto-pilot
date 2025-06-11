
import { getFieldValue, extractRPOCodes } from './fieldExtractor';

// Enhanced mapping function that handles GM Global specific fields
export const mapRowToInventoryItem = (
  row: Record<string, any>, 
  condition: 'new' | 'used' | 'gm_global', 
  uploadHistoryId: string
) => {
  console.log('=== FIELD MAPPING DEBUG ===');
  console.log('Row data received:', row);
  console.log('Available column names:', Object.keys(row));
  console.log('Number of columns:', Object.keys(row).length);
  console.log('Condition:', condition);

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

    const vin = getFieldValue(row, vinFields);
    const make = getFieldValue(row, makeFields);
    const model = getFieldValue(row, modelFields);
    const year = getFieldValue(row, yearFields);
    const stockNumber = getFieldValue(row, stockFields);

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
      trim: getFieldValue(row, ['Trim', 'Series', 'Level', 'Grade']) || undefined,
      body_style: getFieldValue(row, ['Body Style', 'Body', 'Style', 'Body Type']) || undefined,
      color_exterior: getFieldValue(row, ['Exterior Color', 'ExtColor', 'Color', 'Paint Code']) || undefined,
      color_interior: getFieldValue(row, ['Interior Color', 'IntColor', 'Interior', 'Trim Color']) || undefined,
      engine: getFieldValue(row, ['Engine', 'Engine Description', 'Motor', 'Engine Code']) || undefined,
      transmission: getFieldValue(row, ['Transmission', 'Trans', 'Transmission Type']) || undefined,
      drivetrain: getFieldValue(row, ['Drivetrain', 'Drive', 'DriveTrain', 'Drive Type']) || undefined,
      fuel_type: getFieldValue(row, ['Fuel Type', 'Fuel', 'Fuel System']) || undefined,
      mileage: parseInt(getFieldValue(row, ['Mileage', 'Odometer', 'Miles', 'Current Mileage'])) || undefined,
      price: parseFloat(getFieldValue(row, ['Price', 'MSRP', 'Selling Price', 'Retail Price'])) || undefined,
      msrp: parseFloat(getFieldValue(row, ['MSRP', 'Retail Price', 'List Price', 'Suggested Retail'])) || undefined,
      invoice: parseFloat(getFieldValue(row, ['Invoice', 'Invoice Price', 'Dealer Cost'])) || undefined,
      condition: 'new' as const, // GM Global orders are typically new vehicles
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

  // Standard field mapping for regular uploads
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

  const vin = getFieldValue(row, vinFields);
  const make = getFieldValue(row, makeFields);
  const model = getFieldValue(row, modelFields);
  const year = getFieldValue(row, yearFields);
  const stockNumber = getFieldValue(row, stockFields);

  console.log('=== FINAL MAPPED VALUES ===');
  console.log('VIN:', vin);
  console.log('Make:', make);
  console.log('Model:', model);
  console.log('Year:', year);
  console.log('Stock Number:', stockNumber);
  console.log('===============================');

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

  // Map condition to database-compatible condition
  const dbCondition: 'new' | 'used' = condition === 'used' ? 'used' : 'new';

  return {
    vin: vin || '',
    stock_number: stockNumber || undefined,
    year: year ? parseInt(year) : undefined,
    make: finalMake || '',
    model: model || '',
    trim: getFieldValue(row, ['Trim', 'trim', 'TRIM', 'Series', 'series', 'Level']) || undefined,
    body_style: getFieldValue(row, ['BodyStyle', 'Body_Style', 'body_style', 'Body', 'body', 'Style']) || undefined,
    color_exterior: getFieldValue(row, ['ExteriorColor', 'Exterior_Color', 'color_exterior', 'ExtColor', 'ext_color', 'Color', 'Exterior']) || undefined,
    color_interior: getFieldValue(row, ['InteriorColor', 'Interior_Color', 'color_interior', 'IntColor', 'int_color', 'Interior']) || undefined,
    engine: getFieldValue(row, ['Engine', 'engine', 'ENGINE', 'Engine_Description', 'Motor']) || undefined,
    transmission: getFieldValue(row, ['Transmission', 'transmission', 'TRANSMISSION', 'Trans', 'trans']) || undefined,
    drivetrain: getFieldValue(row, ['Drivetrain', 'drivetrain', 'DRIVETRAIN', 'Drive', 'drive', 'DriveTrain']) || undefined,
    fuel_type: getFieldValue(row, ['FuelType', 'Fuel_Type', 'fuel_type', 'Fuel', 'fuel']) || undefined,
    mileage: parseInt(getFieldValue(row, ['Mileage', 'mileage', 'MILEAGE', 'Odometer', 'odometer', 'Miles'])) || undefined,
    price: parseFloat(getFieldValue(row, ['Price', 'price', 'PRICE', 'SellingPrice', 'Selling_Price', 'MSRP'])) || undefined,
    msrp: parseFloat(getFieldValue(row, ['MSRP', 'msrp', 'MSRP w/DFC†', 'RetailPrice', 'Retail_Price', 'Retail'])) || undefined,
    invoice: parseFloat(getFieldValue(row, ['Invoice', 'invoice', 'INVOICE', 'InvoicePrice', 'Invoice_Price'])) || undefined,
    rebates: parseFloat(getFieldValue(row, ['Rebates', 'rebates', 'REBATES', 'Incentives', 'incentives'])) || undefined,
    pack: parseFloat(getFieldValue(row, ['Pack', 'pack', 'PACK', 'DealerPack', 'Dealer_Pack'])) || undefined,
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
