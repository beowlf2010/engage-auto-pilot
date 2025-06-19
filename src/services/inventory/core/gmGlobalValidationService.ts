
export interface GMGlobalValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  correctedData?: any;
}

export const validateGMGlobalOrder = (data: any): GMGlobalValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];
  let correctedData = { ...data };

  // Critical validation: GM Global orders cannot be sold
  if (data.status === 'sold') {
    errors.push('GM Global orders cannot have status "sold"');
    correctedData.status = 'available';
    correctedData.sold_at = null;
  }

  // Validate required GM Global fields
  if (!data.gm_order_number) {
    errors.push('GM Global orders must have a GM Order Number');
  }

  // Validate condition for GM Global orders
  if (data.condition !== 'new') {
    warnings.push('GM Global orders should typically be new vehicles');
    correctedData.condition = 'new';
  }

  // Validate source report
  if (data.source_report !== 'orders_all') {
    warnings.push('GM Global orders should have source_report set to "orders_all"');
    correctedData.source_report = 'orders_all';
  }

  // Validate status codes for GM Global
  const validGMStatuses = ['2000', '2100', '2200', '3000', '3800', '4000', '5000', '5500', '6000'];
  if (data.status && !validGMStatuses.includes(data.status) && data.status !== 'available') {
    warnings.push(`Unusual status code for GM Global order: ${data.status}`);
  }

  // Validate delivery dates
  if (data.estimated_delivery_date) {
    try {
      const deliveryDate = new Date(data.estimated_delivery_date);
      if (isNaN(deliveryDate.getTime())) {
        warnings.push('Invalid estimated delivery date format');
      }
    } catch (error) {
      warnings.push('Error parsing estimated delivery date');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    correctedData: errors.length > 0 ? correctedData : undefined
  };
};

export const validateInventoryItem = (item: any, reportType: string): GMGlobalValidationResult => {
  if (reportType === 'gm_global' || item.source_report === 'orders_all') {
    return validateGMGlobalOrder(item);
  }

  // For non-GM Global items, just basic validation
  const warnings: string[] = [];
  
  if (!item.make || item.make === 'Unknown') {
    warnings.push('Missing vehicle make');
  }
  
  if (!item.model || item.model === 'Unknown') {
    warnings.push('Missing vehicle model');
  }

  return {
    isValid: true,
    errors: [],
    warnings,
    correctedData: undefined
  };
};
