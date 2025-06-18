
import { getFieldValue, parseDate, parseNumber, parseInteger } from './core';
import { findMakeInRow, findModelInRow, findYearInRow } from './vehicle';
import { findVINInRow } from './vin';
import { extractRPOCodes, extractOptionDescriptions } from './options';
import { translateDivisionCode, translateColorCode, translateTrimCode } from '@/services/inventory/gmCodeLookupService';
import { extractModelFromGMData } from '@/services/inventory/gmModelCodeLookupService';

// Enhanced GM Global field extraction with CORRECT field mappings and model lookup
export const extractGMGlobalFields = (row: Record<string, any>): any => {
  console.log('=== ENHANCED GM GLOBAL EXTRACTION WITH MODEL LOOKUP ===');
  console.log('Available fields:', Object.keys(row));
  console.log('Sample row data:', row);
  
  const result: any = {
    condition: 'new',
    status: 'available',
    source_report: 'orders_all'
  };
  
  // Year: Extract from "Model Year" field
  const modelYearFields = ['Model Year', 'model year', 'ModelYear', 'model_year', 'MY'];
  const yearValue = getFieldValue(row, modelYearFields);
  console.log('Year extraction - trying fields:', modelYearFields, 'found:', yearValue);
  if (yearValue) {
    const year = parseInteger(yearValue);
    if (year && year >= 1900 && year <= 2030) {
      result.year = year;
      console.log('Successfully extracted year:', year);
    }
  }
  
  // Make: Extract from "Division" field and translate the code
  const divisionFields = ['Division', 'division', 'DIVISION', 'DIV'];
  const divisionCode = getFieldValue(row, divisionFields);
  console.log('Make extraction - trying fields:', divisionFields, 'found:', divisionCode);
  if (divisionCode) {
    result.make = translateDivisionCode(divisionCode);
    console.log('Successfully extracted make:', result.make, 'from code:', divisionCode);
  }
  
  // Model: Use the new GM model lookup service
  const extractedModel = extractModelFromGMData(row);
  console.log('Model extraction using GM lookup service - found:', extractedModel);
  if (extractedModel && extractedModel !== 'Unknown') {
    result.model = extractedModel;
    console.log('Successfully extracted model:', extractedModel);
  } else {
    // Fallback to original method
    const modelFields = ['Model', 'model', 'MODEL', 'Vehicle Model', 'VehicleModel'];
    const modelValue = getFieldValue(row, modelFields);
    console.log('Model fallback extraction - trying fields:', modelFields, 'found:', modelValue);
    if (modelValue && !modelValue.includes('/') && !modelValue.includes('-') && modelValue.length < 50) {
      result.model = modelValue;
      console.log('Successfully extracted model via fallback:', modelValue);
    }
  }
  
  // Trim: Extract from "Allocation Group", "PEG", or similar trim identifiers
  const trimFields = ['Allocation Group', 'allocation group', 'AllocationGroup', 'Peg', 'peg', 'PEG', 'Trim Level', 'TrimLevel'];
  const trimValue = getFieldValue(row, trimFields);
  console.log('Trim extraction - trying fields:', trimFields, 'found:', trimValue);
  if (trimValue) {
    result.trim = trimValue;
    console.log('Successfully extracted trim:', trimValue);
  }
  
  // Body Style: Extract from "Body Style" or "Style" field
  const bodyStyleFields = ['Body Style', 'body style', 'BodyStyle', 'Style', 'style', 'STYLE'];
  const bodyStyle = getFieldValue(row, bodyStyleFields);
  if (bodyStyle) {
    result.body_style = bodyStyle;
  }
  
  // Exterior Color: Extract from "Color" field and translate if needed
  const colorFields = ['Color', 'color', 'COLOR', 'Exterior Color', 'ExteriorColor'];
  const colorCode = getFieldValue(row, colorFields);
  if (colorCode) {
    result.color_exterior = translateColorCode(colorCode);
  }
  
  // Interior Color: Extract from "Trim" field and translate if needed
  const interiorFields = ['Trim', 'trim', 'TRIM', 'Interior Color', 'InteriorColor', 'Interior'];
  const trimCode = getFieldValue(row, interiorFields);
  if (trimCode) {
    result.color_interior = translateTrimCode(trimCode);
  }
  
  // VIN extraction
  result.vin = findVINInRow(row);
  
  // Stock Number - for GM Global this might be in various fields
  const stockFields = ['Stock Number', 'StockNumber', 'Stock_Number', 'Stock#', 'StockNo', 'Stock', 'Unit#'];
  result.stock_number = getFieldValue(row, stockFields);
  
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
  
  // Store full row data for reference
  result.full_option_blob = row;
  
  console.log('=== FINAL EXTRACTION RESULT WITH MODEL LOOKUP ===');
  console.log('Year:', result.year);
  console.log('Make:', result.make);
  console.log('Model:', result.model);
  console.log('Trim:', result.trim);
  console.log('VIN:', result.vin);
  console.log('Stock Number:', result.stock_number);
  console.log('GM Order Number:', result.gm_order_number);
  
  return result;
};
