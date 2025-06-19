
import { getCustomerSafeVehicleDescription, isCustomerReadyModel, extractModelFromGMData } from './gmModelCodeLookupService';

export const formatVehicleTitle = (vehicle: any): string => {
  console.log('=== VEHICLE TITLE FORMATTING WITH SAFETY VALIDATION ===');
  console.log('Vehicle data:', { 
    year: vehicle.year, 
    make: vehicle.make, 
    model: vehicle.model, 
    trim: vehicle.trim,
    source_report: vehicle.source_report,
    gm_order_number: vehicle.gm_order_number
  });
  
  // Use the new customer-safe description function
  const safeDescription = getCustomerSafeVehicleDescription(vehicle);
  
  console.log('Customer-safe description:', safeDescription);
  
  // Double-check that we're not returning any raw GM codes
  if (safeDescription.includes('Contact dealer')) {
    console.warn('Could not resolve vehicle to customer-safe description');
    return safeDescription;
  }
  
  // Final safety check - make sure no GM codes slip through
  const words = safeDescription.split(' ');
  const hasUnsafeWords = words.some(word => {
    const gmCodePattern = /^[0-9][A-Z0-9]{2,5}$/;
    return gmCodePattern.test(word);
  });
  
  if (hasUnsafeWords) {
    console.warn('Unsafe GM codes detected in description, using fallback');
    return 'Contact dealer for vehicle details';
  }
  
  return safeDescription;
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
  try {
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
  } catch (error) {
    console.error('Error calculating data completeness:', error);
    return 0;
  }
};

export const getVehicleStatusDisplay = (vehicle: any) => {
  try {
    if (vehicle.source_report === 'orders_all') {
      const statusNum = parseInt(vehicle.status);
      
      if (statusNum === 6000) {
        return { label: 'CTP', color: 'bg-green-100 text-green-800' };
      } else if (statusNum >= 5000 && statusNum <= 5999) {
        return { label: 'Available', color: 'bg-green-100 text-green-800' };
      } else if (statusNum >= 3800 && statusNum <= 4999) {
        return { label: 'In Transit', color: 'bg-blue-100 text-blue-800' };
      } else if (statusNum >= 2500 && statusNum <= 3799) {
        return { label: 'In Production', color: 'bg-yellow-100 text-yellow-800' };
      } else if (statusNum >= 2000 && statusNum <= 2499) {
        return { label: 'Placed/Waiting', color: 'bg-orange-100 text-orange-800' };
      } else {
        return { label: vehicle.status || 'Unknown', color: 'bg-gray-100 text-gray-800' };
      }
    }
    
    switch (vehicle.status) {
      case 'available':
        return { label: 'Available', color: 'bg-green-100 text-green-800' };
      case 'sold':
        return { label: 'Sold', color: 'bg-blue-100 text-blue-800' };
      case 'pending':
        return { label: 'Pending', color: 'bg-yellow-100 text-yellow-800' };
      default:
        return { label: vehicle.status || 'Unknown', color: 'bg-gray-100 text-gray-800' };
    }
  } catch (error) {
    console.error('Error getting vehicle status display:', error);
    return { label: 'Unknown', color: 'bg-gray-100 text-gray-800' };
  }
};
