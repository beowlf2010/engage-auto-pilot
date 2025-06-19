
// GM Model code lookup tables for translating codes to readable model names
export const GM_MODEL_CODES: Record<string, string> = {
  // Chevrolet Models
  '1PT26': 'Equinox',
  '1PT33': 'Equinox',
  '1PT34': 'Equinox',
  '14C43': 'Colorado',
  '14C53': 'Colorado',
  'CK10543': 'Silverado 1500',
  'CK10753': 'Silverado 1500',
  'CK20543': 'Silverado 2500HD',
  'CK30543': 'Silverado 3500HD',
  '1CT43': 'Traverse',
  '1CT53': 'Traverse',
  '1MD26': 'Tahoe',
  '1MD33': 'Tahoe',
  '1MT26': 'Suburban',
  '1MT33': 'Suburban',
  '1CA69': 'Camaro',
  '1FB37': 'Corvette',
  '1MF26': 'Blazer',
  '1MF33': 'Blazer',
  '1LT26': 'Trailblazer',
  '1TR26': 'Trax',
  '1TR56': 'Trax',
  '1TU56': 'Trailblazer',
  '1LS26': 'Trax',
  '1TT14': 'Spark',
  '1ZB69': 'Malibu',
  '1ZG69': 'Cruze',
  '1ZU58': 'Impala',
  
  // GMC Models
  '2PT26': 'Terrain',
  '2PT33': 'Terrain',
  '24C43': 'Canyon',
  '24C53': 'Canyon',
  'TK10543': 'Sierra 1500',
  'TK10753': 'Sierra 1500',
  'TK20543': 'Sierra 2500HD',
  'TK30543': 'Sierra 3500HD',
  '2CT43': 'Acadia',
  '2CT53': 'Acadia',
  '2MD26': 'Yukon',
  '2MD33': 'Yukon',
  '2MT26': 'Yukon XL',
  '2MT33': 'Yukon XL',
  '2GH26': 'Savana',
  
  // Buick Models
  '3PT26': 'Envision',
  '3PT33': 'Envision',
  '3CT43': 'Enclave',
  '3CT53': 'Enclave',
  '3MF26': 'Encore',
  '3MF33': 'Encore',
  '3LT26': 'Encore GX',
  '3ZG69': 'Regal',
  '3ZU58': 'LaCrosse',
  
  // Cadillac Models
  '6K26': 'Escalade',
  '6K33': 'Escalade',
  '6K53': 'Escalade ESV',
  '6PT26': 'XT5',
  '6PT33': 'XT5',
  '6PT34': 'XT5',
  '6MF26': 'XT4',
  '6MF33': 'XT4',
  '6LT26': 'XT6',
  '6LT33': 'XT6',
  '6ZG69': 'CT5',
  '6ZU58': 'CT4',
  '6CA69': 'CT5-V',
  '6FB37': 'CT5-V Blackwing',
  '6YF69': 'Lyriq'
};

export const GM_BODY_STYLE_CODES: Record<string, string> = {
  '26': 'SUV',
  '33': 'SUV',
  '34': 'SUV',
  '43': 'Pickup',
  '53': 'Pickup',
  '69': 'Sedan',
  '37': 'Coupe',
  '14': 'Hatchback',
  '58': 'Sedan'
};

export const translateGMModelCode = (modelCode: string): string => {
  if (!modelCode) return 'Unknown';
  
  // Try exact match first
  if (GM_MODEL_CODES[modelCode]) {
    return GM_MODEL_CODES[modelCode];
  }
  
  // Try pattern matching for variations
  for (const [code, model] of Object.entries(GM_MODEL_CODES)) {
    if (modelCode.includes(code) || code.includes(modelCode)) {
      return model;
    }
  }
  
  return 'Unknown'; // Return Unknown instead of the raw code
};

export const extractModelFromGMData = (row: Record<string, any>): string => {
  // Try various field names that might contain the model code
  const modelFields = [
    'Model Code', 'model_code', 'ModelCode', 'MODEL_CODE',
    'Model', 'model', 'MODEL',
    'Vehicle Model', 'VehicleModel', 'vehicle_model',
    'Product Code', 'ProductCode', 'product_code'
  ];
  
  for (const field of modelFields) {
    const value = row[field];
    if (value && typeof value === 'string') {
      const translated = translateGMModelCode(value);
      if (translated !== 'Unknown') {
        return translated;
      }
    }
  }
  
  // Try to extract from other fields if direct model lookup fails
  const allocationField = row['Allocation Group'] || row['allocation_group'] || row['AllocationGroup'];
  if (allocationField && typeof allocationField === 'string') {
    // Allocation groups sometimes contain model hints
    if (allocationField.includes('EQUINOX')) return 'Equinox';
    if (allocationField.includes('COLORADO')) return 'Colorado';
    if (allocationField.includes('SILVERADO')) return 'Silverado';
    if (allocationField.includes('TAHOE')) return 'Tahoe';
    if (allocationField.includes('SUBURBAN')) return 'Suburban';
    if (allocationField.includes('ESCALADE')) return 'Escalade';
    if (allocationField.includes('TERRAIN')) return 'Terrain';
    if (allocationField.includes('CANYON')) return 'Canyon';
    if (allocationField.includes('SIERRA')) return 'Sierra';
    if (allocationField.includes('ACADIA')) return 'Acadia';
    if (allocationField.includes('YUKON')) return 'Yukon';
    if (allocationField.includes('TRAILBLAZER')) return 'Trailblazer';
    if (allocationField.includes('TRAX')) return 'Trax';
  }
  
  return 'Unknown';
};

// Safety validation function to check if a model name is customer-ready
export const isCustomerReadyModel = (modelName: string): boolean => {
  if (!modelName || modelName === 'Unknown') return false;
  
  // Check if it's a raw GM code pattern (alphanumeric codes like 1TU56, 1TR56, etc.)
  const gmCodePattern = /^[0-9][A-Z0-9]{2,5}$/;
  if (gmCodePattern.test(modelName)) return false;
  
  // Check for other problematic patterns
  if (modelName.includes('/') || modelName.includes('-') || modelName.length < 3) return false;
  
  return true;
};

// Generate customer-safe vehicle description
export const getCustomerSafeVehicleDescription = (vehicle: any): string => {
  const year = vehicle.year ? String(vehicle.year) : '';
  const make = vehicle.make || '';
  const model = vehicle.model || '';
  const trim = vehicle.trim || '';
  
  // First try to get a proper model name
  let safeModel = model;
  if (!isCustomerReadyModel(model)) {
    // Try to extract from full_option_blob
    if (vehicle.full_option_blob) {
      const extractedModel = extractModelFromGMData(vehicle.full_option_blob);
      if (isCustomerReadyModel(extractedModel)) {
        safeModel = extractedModel;
      } else {
        // Can't resolve to a customer-safe name
        return 'Contact dealer for vehicle details';
      }
    } else {
      return 'Contact dealer for vehicle details';
    }
  }
  
  // Build customer-safe description
  const parts = [year, make, safeModel, trim].filter(part => 
    part && part !== 'Unknown' && part.trim() !== ''
  );
  
  if (parts.length >= 2) {
    return parts.join(' ');
  }
  
  return 'Contact dealer for vehicle details';
};
