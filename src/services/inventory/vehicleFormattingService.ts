
export const formatVehicleTitle = (vehicle: any): string => {
  console.log('=== VEHICLE TITLE FORMATTING ===');
  console.log('Vehicle data:', { 
    year: vehicle.year, 
    make: vehicle.make, 
    model: vehicle.model, 
    trim: vehicle.trim,
    source_report: vehicle.source_report
  });
  
  // Handle vAuto data where vehicle info might be in full_option_blob
  if (vehicle.full_option_blob && typeof vehicle.full_option_blob === 'object') {
    const blob = vehicle.full_option_blob;
    console.log('Checking vAuto blob for vehicle info...');
    
    // Look for vAuto Vehicle field
    const vehicleField = blob.Vehicle || blob.vehicle || blob['Vehicle:'];
    if (vehicleField && typeof vehicleField === 'string') {
      console.log('Found vAuto vehicle field:', vehicleField);
      
      // Parse vAuto format: "2022 Chevrolet Silverado 1500 LT"
      const parts = vehicleField.trim().split(/\s+/);
      if (parts.length >= 3) {
        const yearPart = parts.find(p => /^\d{4}$/.test(p));
        const yearIndex = yearPart ? parts.indexOf(yearPart) : -1;
        
        if (yearIndex !== -1 && yearIndex < parts.length - 2) {
          const extractedYear = parts[yearIndex];
          const extractedMake = parts[yearIndex + 1];
          const extractedModel = parts.slice(yearIndex + 2).join(' ');
          
          console.log('Extracted from vAuto:', { year: extractedYear, make: extractedMake, model: extractedModel });
          return `${extractedYear} ${extractedMake} ${extractedModel}`;
        }
      }
    }
  }
  
  // Fallback to database fields with improved logic
  const year = vehicle.year ? String(vehicle.year) : '';
  const make = vehicle.make || '';
  const model = vehicle.model || '';
  const trim = vehicle.trim || '';

  // Handle cases where make/model might contain year
  const makeContainsYear = year && make.toLowerCase().includes(year);
  const modelContainsYear = year && model.toLowerCase().includes(year);
  const modelContainsMake = make && model.toLowerCase().includes(make.toLowerCase()) && make.length > 2;

  console.log('Database field analysis:', { 
    year, make, model, trim, 
    makeContainsYear, modelContainsYear, modelContainsMake 
  });

  let parts: string[] = [];

  // Add year if not already included in make/model
  if (year && !makeContainsYear && !modelContainsYear) {
    parts.push(year);
  }

  // Add make if it's not redundant with model
  if (make && !modelContainsMake) {
    parts.push(make);
  }

  // Always add model if available
  if (model) {
    parts.push(model);
  } else if (make && !model) {
    // If no model but we have make, ensure make is included
    if (!parts.includes(make)) {
      parts.push(make);
    }
  }

  // Add trim if available and not already included
  if (trim && !parts.some(part => part.toLowerCase().includes(trim.toLowerCase()))) {
    parts.push(trim);
  }

  const result = parts.filter(Boolean).join(' ');
  console.log('Final formatted title:', result);
  
  return result || 'Unknown Vehicle';
};

export const getVehicleDescription = (vehicle: any): string | null => {
  if (vehicle.full_option_blob && typeof vehicle.full_option_blob === 'object') {
    const blob = vehicle.full_option_blob;
    
    // Look for vAuto-specific rich data
    const overallScore = blob.Overall || blob.overall;
    const priceRank = blob['Price Rank'] || blob.priceRank;
    const daysOnMarket = blob['Days on Market'] || blob.daysOnMarket;
    
    if (overallScore || priceRank || daysOnMarket) {
      const metrics = [];
      if (overallScore) metrics.push(`Overall: ${overallScore}`);
      if (priceRank) metrics.push(`Price Rank: ${priceRank}`);
      if (daysOnMarket) metrics.push(`${daysOnMarket} days on market`);
      return metrics.join(' • ');
    }
    
    // Fallback to description fields
    const description = blob.Description || blob.description || blob.Details || blob.details;
    if (description && typeof description === 'string' && description.length > 10) {
      return description.substring(0, 80) + '...';
    }
  }
  
  // Use regular description if available
  if (vehicle.description && vehicle.description.length > 10) {
    return vehicle.description.substring(0, 80) + '...';
  }
  
  return null;
};

export const formatPrice = (price: number | null | undefined): string => {
  if (!price || price <= 0) return 'Price not available';
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
};

export const getDataCompletenessScore = (vehicle: any): number => {
  let score = 0;
  const fields = [
    'vin', 'stock_number', 'year', 'make', 'model', 
    'price', 'mileage', 'color_exterior', 'condition'
  ];
  
  fields.forEach(field => {
    if (vehicle[field] && String(vehicle[field]).trim() !== '') {
      score += 1;
    }
  });
  
  return Math.round((score / fields.length) * 100);
};
