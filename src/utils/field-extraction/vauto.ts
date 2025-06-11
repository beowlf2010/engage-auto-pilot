
// Enhanced vAuto vehicle parsing that extracts components from combined vehicle field
export const parseVautoVehicleField = (vehicleString: string): { year?: string, make?: string, model?: string } => {
  if (!vehicleString) return {};
  
  console.log('=== VAUTO VEHICLE PARSING ===');
  console.log('Input:', vehicleString);
  
  // Remove common prefixes and clean the string
  const cleaned = vehicleString.replace(/^(Vehicle:\s*|Vehicle\s*)/i, '').trim();
  
  // Split by spaces and analyze
  const parts = cleaned.split(/\s+/);
  
  if (parts.length >= 3) {
    // Try to identify year (4 digits), make, and model
    const yearPattern = /^\d{4}$/;
    let year, make, model;
    
    // Look for year pattern
    const yearIndex = parts.findIndex(part => yearPattern.test(part));
    
    if (yearIndex !== -1) {
      year = parts[yearIndex];
      
      // Take the next parts as make and model
      if (yearIndex + 1 < parts.length) {
        make = parts[yearIndex + 1];
      }
      if (yearIndex + 2 < parts.length) {
        // Join remaining parts as model (in case model has multiple words)
        model = parts.slice(yearIndex + 2).join(' ');
      }
    } else {
      // No clear year, assume first part is make, rest is model
      make = parts[0];
      model = parts.slice(1).join(' ');
    }
    
    console.log(`✓ Parsed vAuto vehicle: Year=${year}, Make=${make}, Model=${model}`);
    return { year, make, model };
  }
  
  console.log('✗ Could not parse vAuto vehicle field');
  return {};
};
