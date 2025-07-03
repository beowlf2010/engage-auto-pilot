interface VehicleDetails {
  make?: string;
  model?: string;
  year?: number;
  trim?: string;
  color?: string;
  vin?: string;
  bodyStyle?: string;
  features?: string[];
  confidence: number;
}

interface VehicleExtraction {
  primary: VehicleDetails | null;
  secondary: VehicleDetails[];
  hasSpecificVehicle: boolean;
  extractedText: string;
}

class VehicleExtractionService {
  private makePatterns = [
    'chevrolet', 'chevy', 'ford', 'gmc', 'cadillac', 'buick', 'honda', 'toyota',
    'nissan', 'hyundai', 'kia', 'bmw', 'mercedes', 'audi', 'lexus', 'acura',
    'infiniti', 'volvo', 'subaru', 'mazda', 'volkswagen', 'vw', 'jeep', 'ram',
    'dodge', 'chrysler', 'lincoln', 'genesis'
  ];

  private modelPatterns = {
    chevrolet: ['silverado', 'tahoe', 'suburban', 'equinox', 'traverse', 'malibu', 'camaro', 'corvette', 'blazer', 'trax'],
    ford: ['f-150', 'f150', 'explorer', 'expedition', 'escape', 'edge', 'mustang', 'bronco', 'ranger'],
    gmc: ['sierra', 'yukon', 'acadia', 'terrain', 'canyon', 'denali'],
    honda: ['civic', 'accord', 'cr-v', 'crv', 'pilot', 'ridgeline', 'passport', 'hr-v', 'hrv'],
    toyota: ['camry', 'corolla', 'rav4', 'rav-4', 'highlander', 'tacoma', 'tundra', 'prius', '4runner']
  };

  private colorPatterns = [
    'black', 'white', 'silver', 'gray', 'grey', 'red', 'blue', 'green', 'brown',
    'tan', 'beige', 'gold', 'yellow', 'orange', 'purple', 'maroon', 'navy',
    'pearl', 'metallic', 'crystal', 'summit', 'midnight', 'arctic', 'cherry'
  ];

  private yearPattern = /\b(19|20)\d{2}\b/g;
  private vinPattern = /\b[A-HJ-NPR-Z0-9]{17}\b/gi;

  extractVehicleInfo(message: string): VehicleExtraction {
    const lowerMessage = message.toLowerCase();
    const vehicles: VehicleDetails[] = [];
    
    // Extract years
    const years = Array.from(message.matchAll(this.yearPattern))
      .map(match => parseInt(match[0]))
      .filter(year => year >= 1990 && year <= new Date().getFullYear() + 2);

    // Extract VINs
    const vins = Array.from(message.matchAll(this.vinPattern))
      .map(match => match[0]);

    // Extract colors
    const colors = this.colorPatterns.filter(color => 
      lowerMessage.includes(color)
    );

    // Extract makes and models
    for (const make of this.makePatterns) {
      const makeRegex = new RegExp(`\\b${make}\\b`, 'i');
      if (makeRegex.test(lowerMessage)) {
        const vehicleDetails: VehicleDetails = {
          make: this.capitalizeWords(make === 'chevy' ? 'chevrolet' : make),
          confidence: 0.8
        };

        // Look for specific models for this make
        const makeModels = this.modelPatterns[make as keyof typeof this.modelPatterns] || [];
        for (const model of makeModels) {
          const modelRegex = new RegExp(`\\b${model.replace('-', '[-\\s]?')}\\b`, 'i');
          if (modelRegex.test(lowerMessage)) {
            vehicleDetails.model = this.capitalizeWords(model);
            vehicleDetails.confidence = 0.9;
            break;
          }
        }

        // Add extracted details
        if (years.length > 0) vehicleDetails.year = years[0];
        if (colors.length > 0) vehicleDetails.color = this.capitalizeWords(colors[0]);
        if (vins.length > 0) vehicleDetails.vin = vins[0];

        vehicles.push(vehicleDetails);
      }
    }

    // If no specific make found, check for generic vehicle references
    if (vehicles.length === 0) {
      const genericVehiclePatterns = [
        'truck', 'suv', 'car', 'sedan', 'coupe', 'convertible', 'hatchback',
        'crossover', 'pickup', 'van', 'minivan', 'wagon'
      ];

      for (const pattern of genericVehiclePatterns) {
        if (lowerMessage.includes(pattern)) {
          vehicles.push({
            bodyStyle: this.capitalizeWords(pattern),
            year: years[0],
            color: colors[0] ? this.capitalizeWords(colors[0]) : undefined,
            confidence: 0.5
          });
          break;
        }
      }
    }

    const primary = vehicles.length > 0 ? vehicles[0] : null;
    const secondary = vehicles.slice(1);

    return {
      primary,
      secondary,
      hasSpecificVehicle: vehicles.length > 0 && vehicles[0].confidence > 0.7,
      extractedText: this.buildVehicleString(primary)
    };
  }

  private capitalizeWords(str: string): string {
    return str.split(/[-\s]/).map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  }

  private buildVehicleString(vehicle: VehicleDetails | null): string {
    if (!vehicle) return '';
    
    const parts = [
      vehicle.year?.toString(),
      vehicle.color,
      vehicle.make,
      vehicle.model,
      vehicle.trim
    ].filter(Boolean);
    
    return parts.join(' ');
  }

  isVehicleSpecific(message: string): boolean {
    const extraction = this.extractVehicleInfo(message);
    return extraction.hasSpecificVehicle;
  }

  getVehicleContext(message: string): string {
    const extraction = this.extractVehicleInfo(message);
    if (extraction.primary && extraction.hasSpecificVehicle) {
      return extraction.extractedText;
    }
    return 'vehicles';
  }
}

export const vehicleExtractionService = new VehicleExtractionService();
export type { VehicleDetails, VehicleExtraction };