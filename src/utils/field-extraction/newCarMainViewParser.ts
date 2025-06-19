export interface NewCarMainViewData {
  make: string;
  model: string;
  year?: number;
  stock_number?: string;
  vin?: string;
  price?: number;
  msrp?: number;
  invoice?: number;
  color_exterior?: string;
  color_interior?: string;
  trim?: string;
  engine?: string;
  transmission?: string;
  fuel_type?: string;
  mileage?: number;
  condition: 'new' | 'used';
  status: 'available' | 'sold' | 'pending';
}

export const parseNewCarMainView = (row: any): NewCarMainViewData => {
  console.log('Parsing NEW CAR MAIN VIEW row:', Object.keys(row));
  
  // Handle the combined "Vehicle" field (e.g., "2024 Chevrolet Silverado 1500")
  let make = 'Unknown';
  let model = 'Unknown';
  let year: number | undefined;
  
  const vehicleField = row['Vehicle'] || row['vehicle'] || '';
  if (vehicleField) {
    const vehicleParts = vehicleField.trim().split(/\s+/);
    if (vehicleParts.length >= 3) {
      // First part should be year
      const yearStr = vehicleParts[0];
      if (yearStr && /^\d{4}$/.test(yearStr)) {
        year = parseInt(yearStr);
        make = vehicleParts[1] || 'Unknown';
        model = vehicleParts.slice(2).join(' ') || 'Unknown';
      } else {
        // If first part isn't a year, treat whole thing as make/model
        make = vehicleParts[0] || 'Unknown';
        model = vehicleParts.slice(1).join(' ') || 'Unknown';
      }
    } else if (vehicleParts.length === 2) {
      make = vehicleParts[0] || 'Unknown';
      model = vehicleParts[1] || 'Unknown';
    } else if (vehicleParts.length === 1) {
      make = vehicleParts[0] || 'Unknown';
    }
  }

  // Extract other fields with various possible column names
  const stockNumber = row['Stock #'] || row['Stock'] || row['StockNumber'] || row['stock_number'] || '';
  const vin = row['VIN'] || row['vin'] || '';
  
  // Price fields
  const price = parseFloat(row['Price'] || row['price'] || row['Selling Price'] || '0') || undefined;
  const msrp = parseFloat(row['MSRP'] || row['msrp'] || row['List Price'] || '0') || undefined;
  const invoice = parseFloat(row['Invoice'] || row['invoice'] || row['Cost'] || '0') || undefined;
  
  // Color fields
  const colorExterior = row['Ext Color'] || row['Exterior Color'] || row['Color Ext'] || row['color_exterior'] || '';
  const colorInterior = row['Int Color'] || row['Interior Color'] || row['Color Int'] || row['color_interior'] || '';
  
  // Other vehicle details
  const trim = row['Trim'] || row['trim'] || row['Style'] || '';
  const engine = row['Engine'] || row['engine'] || '';
  const transmission = row['Trans'] || row['Transmission'] || row['transmission'] || '';
  const fuelType = row['Fuel'] || row['Fuel Type'] || row['fuel_type'] || '';
  const mileage = parseInt(row['Miles'] || row['Mileage'] || row['mileage'] || '0') || undefined;
  
  // Determine condition (NEW CAR MAIN VIEW implies new vehicles)
  const condition: 'new' | 'used' = 'new';
  
  // Status determination
  let status: 'available' | 'sold' | 'pending' = 'available';
  const statusField = (row['Status'] || row['status'] || '').toLowerCase();
  if (statusField.includes('sold')) {
    status = 'sold';
  } else if (statusField.includes('pending') || statusField.includes('hold')) {
    status = 'pending';
  }

  const result: NewCarMainViewData = {
    make: make.trim(),
    model: model.trim(),
    year,
    stock_number: stockNumber.trim() || undefined,
    vin: vin.trim() || undefined,
    price,
    msrp,
    invoice,
    color_exterior: colorExterior.trim() || undefined,
    color_interior: colorInterior.trim() || undefined,
    trim: trim.trim() || undefined,
    engine: engine.trim() || undefined,
    transmission: transmission.trim() || undefined,
    fuel_type: fuelType.trim() || undefined,
    mileage,
    condition,
    status
  };

  console.log('Parsed NEW CAR MAIN VIEW result:', {
    original_vehicle: vehicleField,
    parsed_make: result.make,
    parsed_model: result.model,
    parsed_year: result.year,
    stock_number: result.stock_number
  });

  return result;
};
