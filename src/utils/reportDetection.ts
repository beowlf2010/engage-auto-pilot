
export type ReportType = 'new_car_main_view' | 'gm_global' | 'merch_inv_view' | 'sales_report' | 'unknown';

export interface ReportDetectionResult {
  reportType: ReportType;
  confidence: number;
  sourceReport: string;
  detectedColumns: string[];
  recommendedCondition: 'new' | 'used' | 'gm_global';
}

export const detectReportType = (
  filename: string, 
  headers: string[]
): ReportDetectionResult => {
  const normalizedFilename = filename.toLowerCase();
  const normalizedHeaders = headers.map(h => h.toLowerCase().trim());
  
  console.log('Detecting report type for:', { filename, headers: headers.slice(0, 10) });
  
  // NEW CAR MAIN VIEW detection
  if (
    normalizedFilename.includes('new car main view') ||
    normalizedFilename.includes('newcarmainview') ||
    normalizedFilename.includes('new_car_main') ||
    (normalizedHeaders.includes('vehicle') && normalizedHeaders.includes('stock #'))
  ) {
    return {
      reportType: 'new_car_main_view',
      confidence: 0.95,
      sourceReport: 'new_car_main_view',
      detectedColumns: headers.filter(h => 
        ['vehicle', 'stock #', 'price', 'msrp', 'vin', 'ext color'].includes(h.toLowerCase())
      ),
      recommendedCondition: 'new'
    };
  }
  
  // GM Global detection (enhanced)
  if (
    normalizedFilename.includes('gm global') ||
    normalizedFilename.includes('gmglobal') ||
    normalizedFilename.includes('orders') ||
    normalizedHeaders.some(h => h.includes('order number')) ||
    normalizedHeaders.some(h => h.includes('customer name')) ||
    normalizedHeaders.some(h => h.includes('delivery date'))
  ) {
    return {
      reportType: 'gm_global',
      confidence: 0.9,
      sourceReport: 'orders_all',
      detectedColumns: headers.filter(h => 
        h.toLowerCase().includes('order') || 
        h.toLowerCase().includes('customer') || 
        h.toLowerCase().includes('delivery')
      ),
      recommendedCondition: 'gm_global'
    };
  }
  
  // Sales/Financial report detection
  if (
    normalizedFilename.includes('sales') ||
    normalizedFilename.includes('financial') ||
    normalizedFilename.includes('deals') ||
    normalizedFilename.includes('profit') ||
    normalizedHeaders.some(h => h.includes('gross profit')) ||
    normalizedHeaders.some(h => h.includes('sale amount'))
  ) {
    return {
      reportType: 'sales_report',
      confidence: 0.85,
      sourceReport: 'sales_report',
      detectedColumns: headers.filter(h => 
        h.toLowerCase().includes('profit') || 
        h.toLowerCase().includes('sale') || 
        h.toLowerCase().includes('deal')
      ),
      recommendedCondition: 'used'
    };
  }
  
  // Merch Inventory View (used cars)
  if (
    normalizedFilename.includes('merch') ||
    normalizedFilename.includes('inventory') ||
    normalizedFilename.includes('used') ||
    normalizedHeaders.includes('make') && normalizedHeaders.includes('model')
  ) {
    return {
      reportType: 'merch_inv_view',
      confidence: 0.8,
      sourceReport: 'merch_inv_view',
      detectedColumns: headers.filter(h => 
        ['make', 'model', 'year', 'vin', 'stock', 'price'].includes(h.toLowerCase())
      ),
      recommendedCondition: 'used'
    };
  }
  
  // Default fallback
  return {
    reportType: 'unknown',
    confidence: 0.1,
    sourceReport: 'unknown',
    detectedColumns: [],
    recommendedCondition: 'used'
  };
};

export const getRecommendedParser = (reportType: ReportType) => {
  switch (reportType) {
    case 'new_car_main_view':
      return 'parseNewCarMainView';
    case 'gm_global':
      return 'extractGMGlobalFields';
    case 'merch_inv_view':
      return 'extractVehicleFields';
    case 'sales_report':
      return 'parseSalesReport';
    default:
      return 'extractVehicleFields';
  }
};
