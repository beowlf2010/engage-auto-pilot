
import { getFieldValue, parseDate } from './core';

// Extract GM Global status from various status fields
export const extractGMGlobalStatus = (row: Record<string, any>): string => {
  console.log('=== GM GLOBAL STATUS EXTRACTION ===');
  
  const statusFields = [
    'Status', 'OrderStatus', 'GM Status', 'GMStatus',
    'Production Status', 'ProductionStatus', 'Order_Status'
  ];
  
  const status = getFieldValue(row, statusFields);
  console.log(`Found GM Global status: ${status}`);
  
  return status || 'unknown';
};

// Extract GM Global order data
export const extractGMGlobalOrderData = (row: Record<string, any>): any => {
  console.log('=== GM GLOBAL ORDER DATA EXTRACTION ===');
  
  const result: any = {};
  
  // Order number
  const orderFields = ['Order Number', 'OrderNumber', 'GM Order Number', 'GMOrderNumber'];
  result.gm_order_number = getFieldValue(row, orderFields);
  
  // Customer name
  const customerFields = ['Customer', 'CustomerName', 'Customer Name', 'Buyer'];
  result.customer_name = getFieldValue(row, customerFields);
  
  // Delivery dates
  const estimatedDeliveryFields = ['Estimated Delivery', 'EstimatedDelivery', 'ETA', 'Estimated_Delivery_Date'];
  const estimatedDeliveryStr = getFieldValue(row, estimatedDeliveryFields);
  if (estimatedDeliveryStr) {
    result.estimated_delivery_date = parseDate(estimatedDeliveryStr);
  }
  
  const actualDeliveryFields = ['Actual Delivery', 'ActualDelivery', 'Delivered', 'Actual_Delivery_Date'];
  const actualDeliveryStr = getFieldValue(row, actualDeliveryFields);
  if (actualDeliveryStr) {
    result.actual_delivery_date = parseDate(actualDeliveryStr);
  }
  
  // Order date
  const orderDateFields = ['Order Date', 'OrderDate', 'Placed', 'Order_Date'];
  const orderDateStr = getFieldValue(row, orderDateFields);
  if (orderDateStr) {
    result.order_date = parseDate(orderDateStr);
  }
  
  console.log('Extracted GM Global order data:', result);
  return result;
};
