
export interface ReportDetection {
  reportType: 'gm_global' | 'new_car_main_view' | 'merch_inv_view' | 'sales_report' | 'vauto' | 'unknown';
  confidence: number;
  recommendedCondition: 'new' | 'used' | 'gm_global';
  sourceReport: string;
  indicators: string[];
}

export const detectReportType = (fileName: string, headers: string[]): ReportDetection => {
  const fileNameLower = fileName.toLowerCase();
  const headerSet = new Set(headers.map(h => h.toLowerCase()));
  
  // vAuto indicators (check first to prevent misclassification)
  const vautoIndicators = [
    'vehicle',
    'price',
    'mileage',
    'stock #',
    'stock_number',
    'asking_price',
    'list_price',
    'days_in_inventory',
    'cost to market'
  ];
  
  // vAuto filename patterns
  const vautoFilePatterns = ['vauto', 'v-auto', 'vanto', 'inventory', 'used', 'preowned'];
  const hasVautoFilePattern = vautoFilePatterns.some(pattern => fileNameLower.includes(pattern));
  
  // Strong indicators for GM Global orders
  const gmGlobalIndicators = [
    'gm_order_number',
    'customer_name',
    'estimated_delivery_date',
    'dealer_order_code',
    'build_week',
    'production_sequence',
    'order_date',
    'plant_code',
    'allocation_code'
  ];
  
  // Strong indicators for regular inventory
  const regularInventoryIndicators = [
    'days_in_inventory',
    'acquisition_date',
    'wholesale_cost',
    'reconditioning_cost',
    'book_value',
    'trade_value'
  ];
  
  // Sales report indicators
  const salesReportIndicators = [
    'sale_amount',
    'gross_profit',
    'buyer_name',
    'fi_profit',
    'total_profit'
  ];
  
  const foundIndicators: string[] = [];
  let confidence = 0;
  
  // Check for vAuto patterns first (to prevent GM Global misclassification)
  const vautoMatches = vautoIndicators.filter(indicator => {
    const found = headerSet.has(indicator) || 
                  headers.some(h => h.toLowerCase().includes(indicator.replace('_', ' ')));
    if (found) foundIndicators.push(indicator);
    return found;
  });
  
  // Check for combined vehicle field (strong vAuto indicator)
  const hasCombinedVehicleField = headers.some(h => 
    h.toLowerCase() === 'vehicle' || 
    h.toLowerCase().includes('vehicle description') ||
    h.toLowerCase() === 'vehicle:'
  );
  
  // Detect vAuto if we have enough indicators
  if (vautoMatches.length >= 4 || (vautoMatches.length >= 3 && hasCombinedVehicleField) || 
      (vautoMatches.length >= 2 && hasVautoFilePattern)) {
    confidence = Math.min(95, 70 + (vautoMatches.length * 8) + (hasCombinedVehicleField ? 10 : 0) + (hasVautoFilePattern ? 15 : 0));
    return {
      reportType: 'vauto',
      confidence,
      recommendedCondition: 'used',
      sourceReport: 'merch_inv_view',
      indicators: foundIndicators
    };
  }
  
  // Check for GM Global patterns
  const gmGlobalMatches = gmGlobalIndicators.filter(indicator => {
    const found = headerSet.has(indicator) || 
                  headers.some(h => h.toLowerCase().includes(indicator.replace('_', ' ')));
    if (found) foundIndicators.push(indicator);
    return found;
  });
  
  // Check filename patterns for GM Global
  const gmFilePatterns = ['gm', 'global', 'order', 'allocation', 'pipeline'];
  const hasGmFilePattern = gmFilePatterns.some(pattern => fileNameLower.includes(pattern));
  
  if (gmGlobalMatches.length >= 3 || (gmGlobalMatches.length >= 2 && hasGmFilePattern)) {
    confidence = Math.min(95, 60 + (gmGlobalMatches.length * 10) + (hasGmFilePattern ? 15 : 0));
    return {
      reportType: 'gm_global',
      confidence,
      recommendedCondition: 'gm_global',
      sourceReport: 'orders_all',
      indicators: foundIndicators
    };
  }
  
  // Check for sales reports
  const salesMatches = salesReportIndicators.filter(indicator => {
    const found = headerSet.has(indicator);
    if (found) foundIndicators.push(indicator);
    return found;
  });
  
  if (salesMatches.length >= 2) {
    confidence = Math.min(90, 50 + (salesMatches.length * 15));
    return {
      reportType: 'sales_report',
      confidence,
      recommendedCondition: 'used', // Most sales are used vehicles
      sourceReport: 'sales_report',
      indicators: foundIndicators
    };
  }
  
  // Check for regular inventory indicators
  const inventoryMatches = regularInventoryIndicators.filter(indicator => {
    const found = headerSet.has(indicator);
    if (found) foundIndicators.push(indicator);
    return found;
  });
  
  // Check filename patterns for inventory type
  if (fileNameLower.includes('new') || fileNameLower.includes('factory')) {
    confidence = Math.min(85, 60 + (inventoryMatches.length * 10));
    return {
      reportType: 'new_car_main_view',
      confidence,
      recommendedCondition: 'new',
      sourceReport: 'new_car_main_view',
      indicators: foundIndicators
    };
  } else if (fileNameLower.includes('used') || fileNameLower.includes('merch')) {
    confidence = Math.min(85, 60 + (inventoryMatches.length * 10));
    return {
      reportType: 'merch_inv_view',
      confidence,
      recommendedCondition: 'used',
      sourceReport: 'merch_inv_view',
      indicators: foundIndicators
    };
  }
  
  // Default fallback based on available data
  if (inventoryMatches.length > 0) {
    return {
      reportType: 'merch_inv_view',
      confidence: Math.min(70, 40 + (inventoryMatches.length * 10)),
      recommendedCondition: 'used',
      sourceReport: 'merch_inv_view',
      indicators: foundIndicators
    };
  }
  
  // Ultimate fallback
  return {
    reportType: 'unknown',
    confidence: 20,
    recommendedCondition: 'used',
    sourceReport: 'merch_inv_view',
    indicators: foundIndicators
  };
};
