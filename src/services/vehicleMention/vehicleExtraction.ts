
import { ExtractedVehicle } from './types';

// Extract vehicle details from text using regex patterns
export const extractVehicleFromText = (text: string): ExtractedVehicle[] => {
  // Pattern to match year, make, model (e.g., "2025 Cadillac Escalade")
  const vehiclePattern = /(?:(\d{4})\s+)?([A-Za-z]+)\s+([A-Za-z\s]+?)(?:\s|$|[,.!?])/g;
  
  const matches: ExtractedVehicle[] = [];
  let match;
  
  while ((match = vehiclePattern.exec(text)) !== null) {
    const year = match[1] ? parseInt(match[1]) : undefined;
    const make = match[2];
    const model = match[3].trim();
    
    // Validate year is reasonable for a vehicle
    if (year && (year < 1980 || year > new Date().getFullYear() + 2)) {
      continue;
    }
    
    // Check if make is a known car manufacturer
    const knownMakes = [
      'toyota', 'honda', 'ford', 'chevrolet', 'chevy', 'gmc', 'cadillac', 
      'bmw', 'mercedes', 'audi', 'lexus', 'acura', 'infiniti', 'nissan', 
      'hyundai', 'kia', 'volkswagen', 'subaru', 'mazda', 'jeep', 'ram',
      'dodge', 'chrysler', 'buick', 'lincoln', 'tesla', 'genesis'
    ];
    
    if (knownMakes.includes(make.toLowerCase())) {
      matches.push({
        year,
        make: make.charAt(0).toUpperCase() + make.slice(1).toLowerCase(),
        model: model.charAt(0).toUpperCase() + model.slice(1).toLowerCase(),
        fullText: `${year ? year + ' ' : ''}${make} ${model}`.trim()
      });
    }
  }
  
  return matches;
};
