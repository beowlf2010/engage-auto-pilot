
export const getFileType = (file: File): 'csv' | 'excel' => {
  const extension = file.name.toLowerCase();
  if (extension.endsWith('.xlsx') || extension.endsWith('.xls')) {
    return 'excel';
  }
  return 'csv';
};

export const detectFormatType = (headers: string[]): 'new_car_main_view' | 'merch_inv_view' | 'orders_all' | 'gm_orders' | 'gm_global' | 'unknown' => {
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
