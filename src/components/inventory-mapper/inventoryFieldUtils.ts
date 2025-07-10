import { InventoryFieldMapping } from './types';
import { parseVehicleField } from '@/utils/field-extraction/vehicle';

// Enhanced patterns for inventory field detection
const inventoryFieldPatterns: Record<keyof InventoryFieldMapping, string[]> = {
  // Vehicle Information - prioritize combined vehicle fields (enhanced for vAuto)
  vehicle: ['vehicle', 'vehicle_description', 'full_vehicle', 'description', 'vehicle desc', 'unit', 'automobile', 'auto', 'vehicle:'],
  year: ['year', 'model_year', 'yr', 'vehicle_year', 'model year', 'year built', 'my', 'model yr'],
  make: ['make', 'manufacturer', 'brand', 'vehicle_make', 'mfr', 'mfg', 'oem', 'division', 'make_name'],
  model: ['model', 'vehicle_model', 'car_model', 'model name', 'vehicle model', 'model description', 'model_name'],
  trim: ['trim', 'trim_level', 'grade', 'trim_description', 'style', 'body style', 'body'],

  // Identifiers  
  stockNumber: ['stock #', 'stock_number', 'stock no', 'stock_no', 'inventory_number', 'unit_number', 'stocknumber', 'inventory #', 'inv #', 'stock'],
  vin: ['vin', 'vin_number', 'vehicle_identification_number', 'vin number', 'vehicle vin'],

  // Vehicle Details
  odometer: ['odometer', 'mileage', 'miles', 'milo', 'km'],
  color: ['color', 'exterior_color', 'ext_color'],
  exteriorColor: ['exterior_color', 'ext_color', 'outside_color'],
  interiorColor: ['interior_color', 'int_color', 'inside_color'],
  status: ['status', 'vehicle_status', 'inventory_status'],
  condition: ['condition', 'vehicle_condition', 'new_used'],
  certified: ['certified', 'cpo', 'certified_pre_owned'],
  age: ['age', 'days_in_inventory', 'inventory_age'],

  // Pricing
  price: ['price', 'list_price', 'asking_price', 'retail_price'],
  listPrice: ['list_price', 'asking_price', 'retail_price'],
  msrp: ['msrp', 'manufacturer_suggested_retail_price', 'sticker_price'],
  cost: ['cost', 'dealer_cost', 'invoice_cost'],
  bookValue: ['book', 'book_value', 'trade_value'],
  costToMarket: ['cost to market', 'cost_to_market'],
  markup: ['markup', 'profit', 'margin'],
  mmrWholesale: ['mmr wholesale', 'mmr_wholesale', 'manheim_market_report'],

  // Marketing
  autowriterDescription: ['autowriter description', 'autowriter_description', 'description'],
  photos: ['photos', 'photo_count', 'image_count', 'pictures'],
  defaultPercentOfMarket: ['default % of market', 'default_percent_of_market', 'market_percentage'],
  lastDollarChange: ['last $ change', 'last_dollar_change', 'price_change'],
  priceRankDescription: ['price rank description', 'price_rank_description'],
  vRankDescription: ['vrank description', 'vrank_description', 'v_rank_description'],

  // AutoTrader
  autoTraderListPrice: ['autotrader.com list price', 'autotrader_list_price', 'at_list_price'],
  autoTraderOdometer: ['autotrader.com odometer', 'autotrader_odometer', 'at_odometer'],
  autoTraderImageCount: ['autotrader.com image count', 'autotrader_image_count', 'at_image_count'],
  autoTraderSRP: ['autotrader.com srp', 'autotrader_srp', 'at_srp'],
  autoTraderVDP: ['autotrader.com vdp', 'autotrader_vdp', 'at_vdp'],
  autoTraderVDPPercent: ['autotrader.com % vdp', 'autotrader_vdp_percent', 'at_vdp_percent'],

  // Cars.com
  carsComListPrice: ['cars.com list price', 'cars_com_list_price', 'cars_list_price'],
  carsComOdometer: ['cars.com odometer', 'cars_com_odometer', 'cars_odometer'],
  carsComImageCount: ['cars.com image count', 'cars_com_image_count', 'cars_image_count'],
  carsComSRP: ['cars.com srp', 'cars_com_srp', 'cars_srp'],
  carsComVDP: ['cars.com vdp', 'cars_com_vdp', 'cars_vdp'],
  carsComVDPPercent: ['cars.com % vdp', 'cars_com_vdp_percent', 'cars_vdp_percent'],

  // CarGurus
  carGurusListPrice: ['cargurus list price', 'cargurus_list_price', 'cg_list_price'],
  carGurusOdometer: ['cargurus odometer', 'cargurus_odometer', 'cg_odometer'],
  carGurusImageCount: ['cargurus image count', 'cargurus_image_count', 'cg_image_count'],
  carGurusSRP: ['cargurus srp', 'cargurus_srp', 'cg_srp'],
  carGurusVDP: ['cargurus vdp', 'cargurus_vdp', 'cg_vdp'],
  carGurusVDPPercent: ['cargurus % vdp', 'cargurus_vdp_percent', 'cg_vdp_percent'],

  // Dealer Site
  dealerSiteListPrice: ['your dealer site list price', 'dealer_site_list_price', 'ds_list_price'],
  dealerSiteOdometer: ['your dealer site odometer', 'dealer_site_odometer', 'ds_odometer'],
  dealerSiteImageCount: ['your dealer site image count', 'dealer_site_image_count', 'ds_image_count'],
  dealerSiteSRP: ['your dealer site srp', 'dealer_site_srp', 'ds_srp'],
  dealerSiteVDP: ['your dealer site vdp', 'dealer_site_vdp', 'ds_vdp'],
  dealerSiteVDPPercent: ['your dealer site % vdp', 'dealer_site_vdp_percent', 'ds_vdp_percent'],

  // Carfax
  carfaxHasReport: ['carfax has report', 'carfax_has_report', 'carfax_report'],
  carfaxHasManufacturerRecall: ['carfax has manufacturer recall', 'carfax_has_manufacturer_recall', 'carfax_recall'],
  carfaxHasWarnings: ['carfax has warnings', 'carfax_has_warnings', 'carfax_warnings'],
  carfaxHasProblems: ['carfax has problems', 'carfax_has_problems', 'carfax_problems'],

  // Analytics
  water: ['water', 'water_damage', 'flood'],
  overall: ['overall', 'overall_rank', 'overall_rating'],
  likeMine: ['like mine', 'like_mine', 'similar_vehicles'],
  vinLeads: ['vin leads', 'vin_leads', 'leads_count'],
  redBlack: ['red/black', 'red_black', 'profit_loss'],

  // Other
  deletedDate: ['deleted date', 'deleted_date', 'removal_date']
};


export const performInventoryAutoDetection = (headers: string[]): InventoryFieldMapping => {
  const mapping: Partial<InventoryFieldMapping> = {};
  
  // Convert headers to lowercase for comparison, but preserve original case
  const lowerHeaders = headers.map(h => h.toLowerCase());
  
  console.log('🔍 [INVENTORY MAPPING] Headers found:', headers);
  console.log('🔍 [INVENTORY MAPPING] Lowercase headers:', lowerHeaders);
  
  // Auto-detect each field with improved pattern matching
  Object.entries(inventoryFieldPatterns).forEach(([fieldKey, patterns]) => {
    console.log(`🔍 [INVENTORY MAPPING] Checking field: ${fieldKey} with patterns:`, patterns);
    
    for (const pattern of patterns) {
      const lowerPattern = pattern.toLowerCase();
      console.log(`  🔍 Testing pattern: "${pattern}" (lowercase: "${lowerPattern}")`);
      
      const headerIndex = lowerHeaders.findIndex(h => {
        console.log(`    🔍 Testing against header: "${h}"`);
        
        // Exact match first (highest priority)
        if (h === lowerPattern) {
          console.log(`      ✅ Exact match found`);
          return true;
        }
        
        // Direct contains match
        if (h.includes(lowerPattern)) {
          console.log(`      ✅ Contains match found (header contains pattern)`);
          return true;
        }
        
        // Reverse contains for cases like "Year" matching "Model Year"
        if (lowerPattern.includes(h) && h.length > 2) {
          console.log(`      ✅ Reverse contains match found (pattern contains header)`);
          return true;
        }
        
        // Handle special characters and spaces
        const normalizedHeader = h.replace(/[^a-z0-9]/g, '');
        const normalizedPattern = lowerPattern.replace(/[^a-z0-9]/g, '');
        if (normalizedHeader === normalizedPattern) {
          console.log(`      ✅ Normalized match found (${normalizedHeader} === ${normalizedPattern})`);
          return true;
        }
        
        console.log(`      ❌ No match`);
        return false;
      });
      
      if (headerIndex !== -1) {
        mapping[fieldKey as keyof InventoryFieldMapping] = headers[headerIndex];
        console.log(`✅ [INVENTORY MAPPING] Auto-detected ${fieldKey}: ${headers[headerIndex]} (pattern: ${pattern})`);
        break;
      } else {
        console.log(`  ❌ No header matched pattern: ${pattern}`);
      }
    }
    
    if (!mapping[fieldKey as keyof InventoryFieldMapping]) {
      console.log(`❌ [INVENTORY MAPPING] Field ${fieldKey} could not be auto-detected`);
    }
  });

  console.log('🎯 [INVENTORY MAPPING] Final mapping result:', mapping);
  return mapping as InventoryFieldMapping;
};

export const validateInventoryMapping = (mapping: InventoryFieldMapping): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  // At minimum, we need either a combined vehicle field OR separate year/make/model
  const hasCombinedVehicle = !!mapping.vehicle;
  const hasSeparateFields = !!(mapping.year && mapping.make && mapping.model);
  
  if (!hasCombinedVehicle && !hasSeparateFields) {
    errors.push('Vehicle information is required (either combined Vehicle field or separate Year/Make/Model fields)');
  }
  
  // Identifier is critical for inventory tracking
  const hasIdentifier = !!(mapping.stockNumber || mapping.vin);
  if (!hasIdentifier) {
    errors.push('At least one identifier (Stock Number or VIN) is required for inventory tracking');
  }
  
  // Price is recommended but not critical
  if (!mapping.price && !mapping.listPrice && !mapping.msrp) {
    errors.push('Price information is recommended (Price, List Price, or MSRP)');
  }
  
  // Consider mapping valid if we have vehicle info and at least one identifier
  const isMinimallyValid = (hasCombinedVehicle || hasSeparateFields) && hasIdentifier;
  
  return {
    isValid: isMinimallyValid,
    errors
  };
};

// Transform inventory mapping to the format expected by the inventory system
export const transformInventoryData = (rowData: Record<string, any>, mapping: InventoryFieldMapping): Record<string, any> => {
  const result: Record<string, any> = {};
  
  console.log('🔄 [INVENTORY TRANSFORM] Starting transformation');
  console.log('🔄 [INVENTORY TRANSFORM] Input mapping:', mapping);
  console.log('🔄 [INVENTORY TRANSFORM] Input row data keys:', Object.keys(rowData));
  console.log('🔄 [INVENTORY TRANSFORM] Sample row data:', rowData);
  
  // Handle combined vehicle field parsing
  if (mapping.vehicle && rowData[mapping.vehicle]) {
    const parsed = parseVehicleField(rowData[mapping.vehicle]);
    if (parsed.year) result.year = parsed.year;
    if (parsed.make) result.make = parsed.make;
    if (parsed.model) result.model = parsed.model;
    if (parsed.trim) result.trim = parsed.trim;
  }
  
  // Handle individual field mappings
  Object.entries(mapping).forEach(([fieldKey, headerName]) => {
    if (headerName && rowData[headerName] !== undefined && fieldKey !== 'vehicle') {
      const value = rowData[headerName];
      
      // Map to appropriate database field names
      switch (fieldKey) {
        case 'stockNumber':
          result.stock_number = value;
          break;
        case 'odometer':
          result.mileage = parseInt(value) || 0;
          break;
        case 'exteriorColor':
          result.color_exterior = value;
          break;
        case 'interiorColor':
          result.color_interior = value;
          break;
        case 'autowriterDescription':
          result.vehicle_description = value;
          break;
        default:
          // For most fields, use the fieldKey as-is (converted to snake_case if needed)
          const dbField = fieldKey.replace(/([A-Z])/g, '_$1').toLowerCase();
          result[dbField] = value;
      }
    }
  });
  
  console.log('🔄 [INVENTORY TRANSFORM] Transformed data:', result);
  return result;
};
