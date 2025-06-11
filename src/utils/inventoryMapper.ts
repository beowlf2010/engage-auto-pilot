
import { getFieldValue, extractRPOCodes, findVINInRow, findMakeInRow, findModelInRow, findYearInRow, extractGMGlobalStatus, extractOptionDescriptions } from './fieldExtractor';

// Enhanced mapping function that handles GM Global specific fields with smart detection
export const mapRowToInventoryItem = (
  row: Record<string, any>, 
  condition: 'new' | 'used' | 'gm_global', 
  uploadHistoryId: string
) => {
  console.log('=== ENHANCED FIELD MAPPING DEBUG ===');
  console.log('Row data received:', row);
  console.log('Available column names:', Object.keys(row));
  console.log('Number of columns:', Object.keys(row).length);
  console.log('Condition:', condition);
  console.log('Sample values from first few columns:');
  Object.keys(row).slice(0, 5).forEach(key => {
    console.log(`  "${key}": "${row[key]}"`);
  });

  // Use smart detection for critical fields
  const detectedVin = findVINInRow(row);
  const make = findMakeInRow(row);
  const model = findModelInRow(row);
  const year = findYearInRow(row);

  // For VIN, set to null if not found (instead of empty string to avoid constraint violations)
  const vin = detectedVin && detectedVin.length >= 10 ? detectedVin : null;

  // For stock number, try multiple approaches
  let stockNumber = '';
  if (condition === 'gm_global') {
    stockNumber = getFieldValue(row, [
      'Order #', 'Order Number', 'GM Order Number',
      'Stock Number', 'Stock', 'Dealer Stock', 'Unit Number', 'Order ID'
    ]);
  } else {
    stockNumber = getFieldValue(row, [
      'Stock', 'stock', 'StockNumber', 'Stock_Number', 'Stock Number', 'Stock No.',
      'VehicleStockNumber', 'Dealer Stock', 'Unit Number',
      'Inventory Number', 'Stock #'
    ]);
  }

  console.log('=== SMART DETECTION RESULTS ===');
  console.log('VIN:', vin);
  console.log('Make:', make);
  console.log('Model:', model);
  console.log('Year:', year);
  console.log('Stock Number:', stockNumber);
  console.log('=================================');

  // Enhanced field extraction for other properties
  const trim = getFieldValue(row, ['Trim', 'Series', 'Level', 'Grade', 'Style Level']);
  const bodyStyle = getFieldValue(row, ['Body Style', 'Body', 'Style', 'Body Type', 'Body Code']);
  const colorExterior = getFieldValue(row, ['Exterior Color', 'ExtColor', 'Color', 'Paint Code', 'Ext Color Code']);
  const colorInterior = getFieldValue(row, ['Interior Color', 'IntColor', 'Interior', 'Trim Color', 'Int Color Code']);
  const engine = getFieldValue(row, ['Engine', 'Engine Description', 'Motor', 'Engine Code', 'Engine Type']);
  const transmission = getFieldValue(row, ['Transmission', 'Trans', 'Transmission Type', 'Trans Code']);
  const drivetrain = getFieldValue(row, ['Drivetrain', 'Drive', 'DriveTrain', 'Drive Type', 'Drive Code']);
  const fuelType = getFieldValue(row, ['Fuel Type', 'Fuel', 'Fuel System', 'Fuel Code']);

  // Enhanced price extraction
  const price = parseFloat(getFieldValue(row, [
    'Price', 'MSRP', 'Selling Price', 'Retail Price', 'List Price'
  ])) || undefined;

  const msrp = parseFloat(getFieldValue(row, [
    'MSRP', 'MSRP w/DFC†', 'Retail Price', 'List Price', 'Suggested Retail'
  ])) || undefined;

  const invoice = parseFloat(getFieldValue(row, [
    'Invoice', 'Invoice Price', 'Dealer Cost', 'Cost'
  ])) || undefined;

  const mileage = parseInt(getFieldValue(row, [
    'Mileage', 'Odometer', 'Miles', 'Current Mileage', 'Odo'
  ])) || undefined;

  // Enhanced RPO and option extraction
  const rpoCodes = extractRPOCodes(row);
  const optionDescriptions = extractOptionDescriptions(row);

  // CRITICAL FIX: Extract actual GM Global status instead of hardcoding
  let status = 'available'; // Default for regular inventory
  if (condition === 'gm_global') {
    const gmStatus = extractGMGlobalStatus(row);
    if (gmStatus) {
      status = gmStatus; // Use actual GM status code (5000, 4200, etc.)
      console.log(`✓ Using GM Global status: ${status}`);
    } else {
      console.log('⚠ No GM Global status found, defaulting to available');
    }
  }

  // Map condition to database-compatible condition
  const dbCondition: 'new' | 'used' = condition === 'used' ? 'used' : 'new';

  console.log('=== FINAL MAPPED INVENTORY ITEM ===');
  console.log('VIN:', vin);
  console.log('Make:', make);
  console.log('Model:', model);
  console.log('Year:', year);
  console.log('Stock Number:', stockNumber);
  console.log('Condition:', dbCondition);
  console.log('Status:', status);
  console.log('RPO Codes:', rpoCodes);
  console.log('Option Descriptions:', optionDescriptions);
  console.log('===================================');

  return {
    vin: vin, // This will be null if no valid VIN found, preventing constraint violations
    stock_number: stockNumber || undefined,
    year: year ? parseInt(year) : undefined,
    make: make || '',
    model: model || '',
    trim: trim || undefined,
    body_style: bodyStyle || undefined,
    color_exterior: colorExterior || undefined,
    color_interior: colorInterior || undefined,
    engine: engine || undefined,
    transmission: transmission || undefined,
    drivetrain: drivetrain || undefined,
    fuel_type: fuelType || undefined,
    mileage: mileage,
    price: price,
    msrp: msrp,
    invoice: invoice,
    rebates: parseFloat(getFieldValue(row, ['Rebates', 'rebates', 'REBATES', 'Incentives', 'incentives'])) || undefined,
    pack: parseFloat(getFieldValue(row, ['Pack', 'pack', 'PACK', 'DealerPack', 'Dealer_Pack'])) || undefined,
    condition: dbCondition,
    status: status, // Now uses actual GM Global status codes
    rpo_codes: rpoCodes.length > 0 ? rpoCodes : undefined,
    rpo_descriptions: optionDescriptions.length > 0 ? optionDescriptions : undefined, // Store option descriptions
    source_report: condition === 'gm_global' ? 'orders_all' as any : undefined,
    full_option_blob: row, // Store complete raw data for future analysis
    first_seen_at: new Date().toISOString(),
    last_seen_at: new Date().toISOString(),
    upload_history_id: uploadHistoryId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
};
