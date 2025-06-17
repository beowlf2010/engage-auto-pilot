
import { getFieldValue, parseDate, parseNumber, parseInteger } from './core';
import { findMakeInRow, findModelInRow, findYearInRow } from './vehicle';
import { findVINInRow } from './vin';
import { extractRPOCodes, extractOptionDescriptions } from './options';
import { translateDivisionCode, translateColorCode, translateTrimCode } from '@/services/inventory/gmCodeLookupService';

// Enhanced GM Global field extraction with correct field mappings
export const extractGMGlobalFields = (row: Record<string, any>): any => {
  console.log('=== ENHANCED GM GLOBAL EXTRACTION ===');
  console.log('Available fields:', Object.keys(row));
  
  const result: any = {
    // GM Global specific fields
    condition: 'new', // GM Global orders are always new
    status: 'available', // Default status
    source_report: 'orders_all'
  };
  
  // Apply GM Global field mappings based on user specification:
  // year = model year, make = division, model = allocation, trim = peg
  // body_style = model, exterior color = color, interior color = trim
  
  // Year mapping: model year → year
  const modelYearFields = ['Model Year', 'model year', 'ModelYear', 'model_year'];
  const yearStr = getFieldValue(row, modelYearFields);
  if (yearStr) {
    const year = parseInteger(yearStr);
    if (year !== null) {
      result.year = year;
    }
  }
  
  // Make mapping: division → make (with code translation)
  const divisionFields = ['Division', 'division', 'DIVISION'];
  const divisionCode = getFieldValue(row, divisionFields);
  if (divisionCode) {
    result.make = translateDivisionCode(divisionCode);
  }
  
  // Model mapping: allocation → model
  const allocationFields = ['Allocation', 'allocation', 'ALLOCATION'];
  const allocation = getFieldValue(row, allocationFields);
  if (allocation) {
    result.model = allocation;
  }
  
  // Trim mapping: peg → trim
  const pegFields = ['Peg', 'peg', 'PEG'];
  const peg = getFieldValue(row, pegFields);
  if (peg) {
    result.trim = peg;
  }
  
  // Body Style mapping: model → body_style
  const modelFields = ['Model', 'model', 'MODEL'];
  const model = getFieldValue(row, modelFields);
  if (model) {
    result.body_style = model;
  }
  
  // Exterior Color mapping: color → color_exterior (with code translation)
  const colorFields = ['Color', 'color', 'COLOR'];
  const colorCode = getFieldValue(row, colorFields);
  if (colorCode) {
    result.color_exterior = translateColorCode(colorCode);
  }
  
  // Interior Color mapping: trim → color_interior (with code translation)
  const trimFields = ['Trim', 'trim', 'TRIM'];
  const trimCode = getFieldValue(row, trimFields);
  if (trimCode) {
    result.color_interior = translateTrimCode(trimCode);
  }
  
  // VIN - try multiple field names
  result.vin = findVINInRow(row);
  
  // GM Order Number
  const orderNumberFields = [
    'Order Number', 'OrderNumber', 'GM Order Number', 'GMOrderNumber',
    'Order_Number', 'GM_Order_Number', 'OrderNo', 'Order No'
  ];
  result.gm_order_number = getFieldValue(row, orderNumberFields);
  
  // Customer Information
  const customerFields = [
    'Customer', 'CustomerName', 'Customer Name', 'Buyer Name',
    'Customer_Name', 'BuyerName', 'Purchaser'
  ];
  result.customer_name = getFieldValue(row, customerFields);
  
  // Delivery Dates
  const estimatedDeliveryFields = [
    'Estimated Delivery', 'EstimatedDelivery', 'ETA', 'Estimated_Delivery_Date',
    'Est Delivery', 'Est_Delivery', 'Delivery_ETA', 'Expected_Delivery'
  ];
  const estimatedDeliveryStr = getFieldValue(row, estimatedDeliveryFields);
  if (estimatedDeliveryStr) {
    const date = parseDate(estimatedDeliveryStr);
    if (date) {
      result.estimated_delivery_date = date.toISOString().split('T')[0];
    }
  }
  
  const actualDeliveryFields = [
    'Actual Delivery', 'ActualDelivery', 'Delivered Date', 'Actual_Delivery_Date',
    'Delivery_Date', 'DeliveryDate', 'Completed_Date'
  ];
  const actualDeliveryStr = getFieldValue(row, actualDeliveryFields);
  if (actualDeliveryStr) {
    const date = parseDate(actualDeliveryStr);
    if (date) {
      result.actual_delivery_date = date.toISOString().split('T')[0];
    }
  }
  
  // Order Dates
  const orderDateFields = [
    'Order Date', 'OrderDate', 'Placed Date', 'Order_Date',
    'Date_Placed', 'PlacedDate', 'Order_Placed'
  ];
  const orderDateStr = getFieldValue(row, orderDateFields);
  if (orderDateStr) {
    const date = parseDate(orderDateStr);
    if (date) {
      result.order_date = date.toISOString().split('T')[0];
    }
  }
  
  // GM Status
  const statusFields = [
    'Status', 'OrderStatus', 'GM Status', 'GMStatus',
    'Production Status', 'ProductionStatus',
    'Order_Status', 'GM_Status'
  ];
  const gmStatus = getFieldValue(row, statusFields);
  if (gmStatus) {
    result.gm_status_description = gmStatus;
    
    // Map GM status to our status values
    const statusLower = gmStatus.toLowerCase();
    if (statusLower.includes('delivered') || statusLower.includes('complete')) {
      result.status = 'available';
    } else if (statusLower.includes('transit') || statusLower.includes('shipping')) {
      result.status = 'pending';
    } else {
      result.status = 'pending';
    }
  }
  
  // Additional GM Global fields
  const dealerOrderCodeFields = ['Dealer Order Code', 'DealerOrderCode', 'Dealer_Order_Code'];
  result.dealer_order_code = getFieldValue(row, dealerOrderCodeFields);
  
  const sellingDealerFields = ['Selling Dealer', 'SellingDealer', 'Selling_Dealer_Code'];
  result.selling_dealer_code = getFieldValue(row, sellingDealerFields);
  
  const buildWeekFields = ['Build Week', 'BuildWeek', 'Build_Week'];
  result.build_week = getFieldValue(row, buildWeekFields);
  
  const productionSeqFields = ['Production Sequence', 'ProductionSequence', 'Production_Sequence'];
  result.production_sequence = getFieldValue(row, productionSeqFields);
  
  const deliveryMethodFields = ['Delivery Method', 'DeliveryMethod', 'Delivery_Method'];
  result.delivery_method = getFieldValue(row, deliveryMethodFields);
  
  const priorityCodeFields = ['Priority Code', 'PriorityCode', 'Priority_Code'];
  result.priority_code = getFieldValue(row, priorityCodeFields);
  
  const orderTypeFields = ['Order Type', 'OrderType', 'Order_Type'];
  result.order_type = getFieldValue(row, orderTypeFields);
  
  const plantCodeFields = ['Plant Code', 'PlantCode', 'Plant_Code'];
  result.plant_code = getFieldValue(row, plantCodeFields);
  
  // RPOs and options
  result.rpo_codes = extractRPOCodes(row);
  result.rpo_descriptions = extractOptionDescriptions(row);
  
  // Price information
  const priceFields = ['Price', 'MSRP', 'List Price', 'ListPrice', 'Invoice'];
  const priceStr = getFieldValue(row, priceFields);
  if (priceStr) {
    const price = parseNumber(priceStr);
    if (price !== null) {
      result.price = price;
    }
  }
  
  const msrpFields = ['MSRP', 'Retail Price', 'RetailPrice', 'Sticker Price'];
  const msrpStr = getFieldValue(row, msrpFields);
  if (msrpStr) {
    const msrp = parseNumber(msrpStr);
    if (msrp !== null) {
      result.msrp = msrp;
    }
  }
  
  // Stock number (might not be available for orders)
  const stockFields = ['Stock Number', 'StockNumber', 'Stock_Number', 'Stock#', 'StockNo'];
  result.stock_number = getFieldValue(row, stockFields);
  
  // Store full row data for reference
  result.full_option_blob = row;
  
  console.log('Enhanced GM Global extraction result:', {
    year: result.year,
    make: result.make,
    model: result.model,
    trim: result.trim,
    body_style: result.body_style,
    color_exterior: result.color_exterior,
    color_interior: result.color_interior,
    vin: result.vin,
    gm_order_number: result.gm_order_number
  });
  
  return result;
};
