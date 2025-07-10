
export const getFileType = (file: File): 'csv' | 'excel' => {
  const extension = file.name.toLowerCase();
  if (extension.endsWith('.xlsx') || extension.endsWith('.xls')) {
    return 'excel';
  }
  return 'csv';
};

export const detectFormatType = (headers: string[]): 'new_car_main_view' | 'merch_inv_view' | 'orders_all' | 'gm_orders' | 'gm_global' | 'vauto' | 'unknown' => {
  const headerStr = headers.join('|').toLowerCase();
  
  // vAuto format detection (check first to prevent GM Global misclassification)
  const vautoPatterns = ['vehicle', 'stock #', 'price', 'mileage', 'cost to market', 'days in inventory'];
  const vautoMatches = vautoPatterns.filter(pattern => headerStr.includes(pattern));
  const hasVehicleField = headers.some(h => h.toLowerCase() === 'vehicle' || h.toLowerCase() === 'vehicle:');
  
  if (vautoMatches.length >= 4 || (vautoMatches.length >= 3 && hasVehicleField)) {
    console.log('✓ Detected vAuto format based on headers:', vautoMatches);
    return 'vauto';
  }
  
  // Enhanced GM Global format detection with more patterns (only after vAuto check)
  if (headerStr.includes('gm config id') || 
      headerStr.includes('gm stored config description') ||
      (headerStr.includes('order #') && headerStr.includes('division')) ||
      headerStr.includes('current event') && headerStr.includes('gm') ||
      headerStr.includes('dealer code') && headerStr.includes('order status') ||
      headerStr.includes('age of inventory') && headerStr.includes('division')) {
    console.log('✓ Detected GM Global format based on headers');
    return 'gm_global';
  }
  
  // Check for GM orders format (legacy detection)
  if (headerStr.includes('order #') && headerStr.includes('gm config id') && headerStr.includes('current event')) {
    console.log('✓ Detected GM Orders format');
    return 'gm_orders';
  }
  
  // Check for specific patterns that indicate each format
  if (headerStr.includes('new') && headerStr.includes('main')) {
    console.log('✓ Detected New Car Main View format');
    return 'new_car_main_view';
  }
  if (headerStr.includes('merch') && headerStr.includes('inv')) {
    console.log('✓ Detected Merch Inv View format');
    return 'merch_inv_view';
  }
  if (headerStr.includes('order')) {
    console.log('✓ Detected Orders All format');
    return 'orders_all';
  }
  
  console.log('⚠ Unknown format detected');
  return 'unknown';
};
