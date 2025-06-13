
import { getFieldValue } from './core';

// ENHANCED: Extract GM Global status codes with standardized mapping based on Current Event
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
    
    // Convert to number for range checking
    const statusNum = parseInt(cleanStatus);
    
    if (!isNaN(statusNum)) {
      console.log(`Parsed Current Event as number: ${statusNum}`);
      
      // Map Current Event ranges to status codes
      if (statusNum === 6000) {
        console.log(`✓ Mapped Current Event ${statusNum} to CTP/Available (6000)`);
        return '6000'; // CTP - Customer Take Possession/Available
      } else if (statusNum >= 5000 && statusNum <= 5999) {
        console.log(`✓ Mapped Current Event ${statusNum} to Available (5000-5999 range)`);
        return statusNum.toString(); // Available for delivery
      } else if (statusNum >= 3800 && statusNum <= 4999) {
        console.log(`✓ Mapped Current Event ${statusNum} to In Transit (3800-4999 range)`);
        return statusNum.toString(); // In transit
      } else if (statusNum >= 2500 && statusNum <= 3799) {
        console.log(`✓ Mapped Current Event ${statusNum} to In Production (2500-3799 range)`);
        return statusNum.toString(); // In production
      } else if (statusNum >= 2000 && statusNum <= 2499) {
        console.log(`✓ Mapped Current Event ${statusNum} to Placed/Waiting (2000-2499 range)`);
        return statusNum.toString(); // Placed but not accepted
      }
    }
    
    // If it's already a 4-digit status code, validate and return
    if (/^\d{4}$/.test(cleanStatus)) {
      console.log(`✓ Found existing GM Global status code: ${cleanStatus}`);
      return cleanStatus;
    }
    
    // Handle legacy string mappings that might still exist
    const legacyMappings: Record<string, string> = {
      'CHDCRW': '6000',  // Chevrolet Heavy Duty Crew Cab -> CTP
      'CLDCRW': '6000',  // Chevrolet Light Duty Crew Cab -> CTP
      'CHDDBL': '6000',  // Chevrolet Heavy Duty Double Cab -> CTP
      'CLDREG': '6000',  // Chevrolet Light Duty Regular Cab -> CTP
      '307156': '4200',  // BAC (Broadcast Available for Commitment) -> Transit
    };
    
    const mappedStatus = legacyMappings[cleanStatus.toUpperCase()];
    if (mappedStatus) {
      console.log(`✓ Mapped legacy GM Global event "${cleanStatus}" to status "${mappedStatus}"`);
      return mappedStatus;
    }
  }
  
  console.log('✗ No valid GM Global Current Event found, defaulting to available');
  return 'available'; // Fallback for non-GM Global inventory
};
