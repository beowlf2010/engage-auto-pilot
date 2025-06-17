
import { parseDate } from './core';

// Enhanced GM Global field extraction with comprehensive column mapping
export const extractGMGlobalFields = (row: any) => {
  console.log('Extracting GM Global fields from row:', Object.keys(row));
  
  const result: any = {
    // Core vehicle information
    year: null,
    make: null,
    model: null,
    trim: null,
    vin: null,
    stock_number: null,
    color_exterior: null,
    color_interior: null,
    engine: null,
    transmission: null,
    drivetrain: null,
    fuel_type: null,
    body_style: null,
    
    // Pricing information
    msrp: null,
    invoice: null,
    price: null,
    rebates: null,
    pack: null,
    
    // GM Global specific fields
    estimated_delivery_date: null,
    actual_delivery_date: null,
    order_date: null,
    gm_order_number: null,
    customer_name: null,
    dealer_order_code: null,
    build_week: null,
    production_sequence: null,
    gm_status_description: null,
    delivery_method: null,
    priority_code: null,
    order_type: null,
    plant_code: null,
    ship_to_dealer_code: null,
    selling_dealer_code: null,
    order_priority: null,
    special_equipment: null,
    customer_order_number: null,
    trade_hold_status: null,
    allocation_code: null,
    gm_model_code: null,
    order_source: null,
    original_order_date: null,
    revised_delivery_date: null,
    
    // Set defaults for GM Global records
    condition: 'new',
    status: 'available',
    source_report: 'orders_all'
  };

  // Field mapping patterns - comprehensive list of possible column names
  const fieldMappings = {
    // Vehicle basics
    year: ['Model Year', 'Year', 'MY', 'model_year'],
    make: ['Make', 'Brand', 'Manufacturer'],
    model: ['Model', 'Model Name', 'Vehicle Model'],
    trim: ['Trim', 'Trim Level', 'Series', 'Package'],
    vin: ['VIN', 'Vehicle Identification Number', 'Vin Number'],
    stock_number: ['Stock Number', 'Stock #', 'Stock', 'Dealer Stock Number'],
    
    // Colors and styling
    color_exterior: ['Exterior Color', 'Ext Color', 'Outside Color', 'Paint Color'],
    color_interior: ['Interior Color', 'Int Color', 'Inside Color', 'Upholstery'],
    
    // Technical specs
    engine: ['Engine', 'Engine Type', 'Motor', 'Power Plant'],
    transmission: ['Transmission', 'Trans', 'Gearbox'],
    drivetrain: ['Drive', 'Drivetrain', 'Drive Type', 'AWD/FWD/RWD'],
    fuel_type: ['Fuel Type', 'Fuel', 'Engine Fuel'],
    body_style: ['Body Style', 'Body Type', 'Style'],
    
    // Pricing
    msrp: ['MSRP', 'List Price', 'Retail Price', 'Manufacturer Suggested Retail Price'],
    invoice: ['Invoice', 'Invoice Price', 'Dealer Cost', 'Cost'],
    price: ['Price', 'Selling Price', 'Current Price', 'Sale Price'],
    rebates: ['Rebates', 'Incentives', 'Rebate Amount', 'Factory Incentives'],
    pack: ['Pack', 'Dealer Pack', 'Pack Amount'],
    
    // GM Global Order Information
    estimated_delivery_date: [
      'Estimated Delivery Date', 'EDD', 'Est Delivery', 'Delivery Date Est',
      'Expected Delivery', 'Projected Delivery', 'Target Delivery'
    ],
    actual_delivery_date: [
      'Actual Delivery Date', 'Delivered Date', 'Delivery Date', 'Date Delivered',
      'Actual Arrival', 'Received Date'
    ],
    order_date: [
      'Order Date', 'Date Ordered', 'Original Order Date', 'Placed Date',
      'Order Placement Date'
    ],
    gm_order_number: [
      'GM Order Number', 'Order Number', 'GM Order #', 'Order #',
      'GM Order ID', 'Factory Order Number'
    ],
    customer_name: [
      'Customer Name', 'Buyer Name', 'Customer', 'Purchaser',
      'Customer Full Name', 'Ordered By'
    ],
    dealer_order_code: [
      'Dealer Order Code', 'DOC', 'Dealer Code', 'Order Code'
    ],
    build_week: [
      'Build Week', 'Production Week', 'Scheduled Build Week', 'BW'
    ],
    production_sequence: [
      'Production Sequence', 'Sequence', 'Build Sequence', 'Production Order'
    ],
    gm_status_description: [
      'Status Description', 'Order Status', 'GM Status', 'Current Status',
      'Status', 'Order State'
    ],
    delivery_method: [
      'Delivery Method', 'Ship Method', 'Transportation', 'Delivery Type'
    ],
    priority_code: [
      'Priority Code', 'Priority', 'Order Priority Code', 'Rush Code'
    ],
    order_type: [
      'Order Type', 'Type', 'Order Category', 'Sales Type'
    ],
    plant_code: [
      'Plant Code', 'Manufacturing Plant', 'Factory Code', 'Plant'
    ],
    ship_to_dealer_code: [
      'Ship To Dealer', 'Destination Dealer', 'Ship To Code', 'Delivery Dealer'
    ],
    selling_dealer_code: [
      'Selling Dealer', 'Dealer Code', 'Selling Dealer Code', 'Sales Dealer'
    ],
    order_priority: [
      'Order Priority', 'Priority Level', 'Rush Priority'
    ],
    special_equipment: [
      'Special Equipment', 'Special Options', 'Custom Equipment', 'Add-ons'
    ],
    customer_order_number: [
      'Customer Order Number', 'Customer Order #', 'Customer Reference'
    ],
    trade_hold_status: [
      'Trade Hold Status', 'Hold Status', 'Trade Hold', 'Hold Reason'
    ],
    allocation_code: [
      'Allocation Code', 'Allocation', 'Alloc Code'
    ],
    gm_model_code: [
      'GM Model Code', 'Model Code', 'Factory Model Code', 'GM Code'
    ],
    order_source: [
      'Order Source', 'Source', 'Origin', 'Channel'
    ],
    original_order_date: [
      'Original Order Date', 'First Order Date', 'Initial Order Date'
    ],
    revised_delivery_date: [
      'Revised Delivery Date', 'Updated Delivery', 'New Delivery Date'
    ]
  };

  // Extract all fields using the mapping patterns
  Object.entries(fieldMappings).forEach(([fieldName, patterns]) => {
    const value = findFieldValue(row, patterns);
    if (value !== null && value !== undefined && value !== '') {
      if (fieldName.includes('date')) {
        result[fieldName] = parseDate(value);
      } else if (['year', 'msrp', 'invoice', 'price', 'rebates', 'pack'].includes(fieldName)) {
        const numValue = parseFloat(String(value).replace(/[$,]/g, ''));
        if (!isNaN(numValue)) {
          result[fieldName] = numValue;
        }
      } else {
        result[fieldName] = String(value).trim();
      }
    }
  });

  // Log what we extracted for debugging
  console.log('GM Global extraction result:', {
    gm_order_number: result.gm_order_number,
    customer_name: result.customer_name,
    estimated_delivery_date: result.estimated_delivery_date,
    order_date: result.order_date,
    make: result.make,
    model: result.model,
    vin: result.vin
  });

  return result;
};

// Helper function to find field value using multiple possible column names
const findFieldValue = (row: any, patterns: string[]) => {
  for (const pattern of patterns) {
    // Exact match first
    if (row[pattern] !== undefined) {
      return row[pattern];
    }
    
    // Case-insensitive search
    const keys = Object.keys(row);
    const matchingKey = keys.find(key => 
      key.toLowerCase() === pattern.toLowerCase()
    );
    
    if (matchingKey) {
      return row[matchingKey];
    }
    
    // Partial match search
    const partialMatch = keys.find(key => 
      key.toLowerCase().includes(pattern.toLowerCase()) ||
      pattern.toLowerCase().includes(key.toLowerCase())
    );
    
    if (partialMatch) {
      return row[partialMatch];
    }
  }
  
  return null;
};

// Enhanced date parsing specifically for GM Global formats
export const parseGMDate = (dateStr: string | number | Date): string | null => {
  if (!dateStr) return null;
  
  try {
    // Handle various GM date formats
    let date: Date;
    
    if (typeof dateStr === 'number') {
      // Excel serial date
      date = new Date((dateStr - 25569) * 86400 * 1000);
    } else if (typeof dateStr === 'string') {
      // Clean the string
      const cleaned = dateStr.trim();
      
      // Common GM date formats
      if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(cleaned)) {
        // MM/DD/YYYY
        date = new Date(cleaned);
      } else if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
        // YYYY-MM-DD
        date = new Date(cleaned);
      } else if (/^\d{2}\/\d{2}\/\d{2}$/.test(cleaned)) {
        // MM/DD/YY - assume 20xx
        const parts = cleaned.split('/');
        date = new Date(`20${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`);
      } else {
        date = new Date(cleaned);
      }
    } else {
      date = new Date(dateStr);
    }
    
    if (isNaN(date.getTime())) {
      return null;
    }
    
    return date.toISOString().split('T')[0];
  } catch (error) {
    console.error('Error parsing GM date:', dateStr, error);
    return null;
  }
};
