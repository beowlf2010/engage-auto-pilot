
import { getFieldValue } from './core';

// ENHANCED: Extract GM Global status codes with standardized mapping
export const extractGMGlobalStatus = (row: Record<string, any>): string => {
  console.log('=== GM GLOBAL STATUS EXTRACTION ===');
  
  const statusFields = [
    'Current Event', 'Status Code', 'Event Code', 'Order Status',
    'Event Status', 'Current Status', 'Order Event', 'Event'
  ];
  
  const status = getFieldValue(row, statusFields);
  if (status) {
    const cleanStatus = status.trim();
    console.log(`Found Current Event value: "${cleanStatus}"`);
    
    // Map GM Global Current Event codes to standardized status codes
    const gmStatusMapping: Record<string, string> = {
      // Available on Lot (Dealer codes) -> 5000
      'CHDCRW': '5000',  // Chevrolet Heavy Duty Crew Cab
      'CLDCRW': '5000',  // Chevrolet Light Duty Crew Cab  
      'CHDDBL': '5000',  // Chevrolet Heavy Duty Double Cab
      'CLDREG': '5000',  // Chevrolet Light Duty Regular Cab
      
      // Ordered/In Transit (BAC) -> 4200
      '307156': '4200',  // BAC (Broadcast Available for Commitment)
      
      // In Production -> 3000
      '1': '3000',       // Production status
      'EQUINX': '3000',  // Equinox production
      'SUBURB': '3000',  // Suburban production
      'TAHOE': '3000'    // Tahoe production
    };
    
    const mappedStatus = gmStatusMapping[cleanStatus.toUpperCase()];
    if (mappedStatus) {
      console.log(`✓ Mapped GM Global event "${cleanStatus}" to status "${mappedStatus}"`);
      return mappedStatus;
    }
    
    // If it's already a 4-digit status code, validate and return
    if (/^\d{4}$/.test(cleanStatus)) {
      console.log(`✓ Found existing GM Global status code: ${cleanStatus}`);
      return cleanStatus;
    }
  }
  
  console.log('✗ No valid GM Global status found, defaulting to available');
  return 'available'; // Fallback for non-GM Global inventory
};
