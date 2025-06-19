
// Vehicle specifications database and validation system
export interface VehicleSpecs {
  make: string;
  model: string;
  year: number;
  bodyStyle: string;
  maxTowingCapacity: number; // in pounds
  maxPayload: number; // in pounds
  engineType: string;
  fuelType: string;
  vehicleClass: string; // 'passenger', 'light_duty', 'medium_duty', 'heavy_duty', 'commercial'
  gvwr: number; // Gross Vehicle Weight Rating
  gcwr?: number; // Gross Combined Weight Rating
}

// Comprehensive vehicle specifications database
const VEHICLE_SPECS_DATABASE: VehicleSpecs[] = [
  // Chevrolet SUVs/Trucks
  {
    make: 'Chevrolet',
    model: 'Tahoe',
    year: 2023,
    bodyStyle: 'SUV',
    maxTowingCapacity: 8400, // pounds
    maxPayload: 1681,
    engineType: '5.3L V8',
    fuelType: 'Gasoline',
    vehicleClass: 'light_duty',
    gvwr: 7500,
    gcwr: 16900
  },
  {
    make: 'Chevrolet',
    model: 'Silverado 1500',
    year: 2023,
    bodyStyle: 'Pickup',
    maxTowingCapacity: 13300,
    maxPayload: 2280,
    engineType: '6.2L V8',
    fuelType: 'Gasoline',
    vehicleClass: 'light_duty',
    gvwr: 7100,
    gcwr: 20500
  },
  {
    make: 'Chevrolet',
    model: 'Silverado 2500HD',
    year: 2023,
    bodyStyle: 'Pickup',
    maxTowingCapacity: 18500,
    maxPayload: 3979,
    engineType: '6.6L V8 Duramax Diesel',
    fuelType: 'Diesel',
    vehicleClass: 'heavy_duty',
    gvwr: 10000,
    gcwr: 28500
  },
  {
    make: 'Chevrolet',
    model: 'Trailblazer',
    year: 2023,
    bodyStyle: 'SUV',
    maxTowingCapacity: 1000,
    maxPayload: 1230,
    engineType: '1.3L Turbo',
    fuelType: 'Gasoline',
    vehicleClass: 'passenger',
    gvwr: 4420
  },
  {
    make: 'Chevrolet',
    model: 'Equinox',
    year: 2023,
    bodyStyle: 'SUV',
    maxTowingCapacity: 1500,
    maxPayload: 1433,
    engineType: '1.5L Turbo',
    fuelType: 'Gasoline',
    vehicleClass: 'passenger',
    gvwr: 4750
  }
];

// Equipment weight database
export interface EquipmentSpecs {
  name: string;
  aliases: string[];
  weight: number; // operating weight in pounds
  category: string;
  requiresCommercialVehicle: boolean;
}

const EQUIPMENT_DATABASE: EquipmentSpecs[] = [
  {
    name: 'Caterpillar 329 Excavator',
    aliases: ['cat 329', 'caterpillar 329', '329 excavator', 'cat329'],
    weight: 70000, // ~35 tons
    category: 'heavy_construction',
    requiresCommercialVehicle: true
  },
  {
    name: 'Small Boat',
    aliases: ['boat', 'small boat', 'fishing boat'],
    weight: 3000, // average small boat with trailer
    category: 'recreational',
    requiresCommercialVehicle: false
  },
  {
    name: 'Travel Trailer',
    aliases: ['trailer', 'travel trailer', 'rv trailer', 'camper trailer'],
    weight: 6000, // average travel trailer
    category: 'recreational',
    requiresCommercialVehicle: false
  }
];

// Validate if a vehicle can safely tow specific equipment
export const validateTowingCapability = (vehicleMake: string, vehicleModel: string, vehicleYear: number, equipmentDescription: string): {
  canTow: boolean;
  vehicleSpecs?: VehicleSpecs;
  equipmentSpecs?: EquipmentSpecs;
  reason?: string;
  recommendation?: string;
} => {
  console.log(`🔍 Validating towing: ${vehicleMake} ${vehicleModel} ${vehicleYear} for "${equipmentDescription}"`);
  
  // Find vehicle specifications
  const vehicleSpecs = VEHICLE_SPECS_DATABASE.find(spec => 
    spec.make.toLowerCase() === vehicleMake.toLowerCase() &&
    spec.model.toLowerCase() === vehicleModel.toLowerCase() &&
    spec.year === vehicleYear
  );

  if (!vehicleSpecs) {
    return {
      canTow: false,
      reason: `No towing specifications available for ${vehicleYear} ${vehicleMake} ${vehicleModel}`,
      recommendation: 'Verify towing capacity with manufacturer specifications before making claims'
    };
  }

  // Find equipment specifications
  const equipmentName = equipmentDescription.toLowerCase().trim();
  const equipmentSpecs = EQUIPMENT_DATABASE.find(equipment =>
    equipment.aliases.some(alias => equipmentName.includes(alias.toLowerCase()))
  );

  if (!equipmentSpecs) {
    return {
      canTow: false,
      vehicleSpecs,
      reason: `Unknown equipment: "${equipmentDescription}". Cannot verify towing capability.`,
      recommendation: 'Ask customer for specific weight and trailer requirements'
    };
  }

  // Check if equipment requires commercial vehicle
  if (equipmentSpecs.requiresCommercialVehicle && vehicleSpecs.vehicleClass === 'passenger') {
    return {
      canTow: false,
      vehicleSpecs,
      equipmentSpecs,
      reason: `${equipmentSpecs.name} (${equipmentSpecs.weight.toLocaleString()} lbs) requires commercial-grade vehicle. ${vehicleSpecs.make} ${vehicleSpecs.model} is a passenger vehicle.`,
      recommendation: 'Recommend commercial towing services or heavy-duty commercial vehicles'
    };
  }

  // Check towing capacity
  const safetyMargin = 0.85; // Use 85% of max capacity for safety
  const safeTowingCapacity = vehicleSpecs.maxTowingCapacity * safetyMargin;
  
  if (equipmentSpecs.weight > safeTowingCapacity) {
    return {
      canTow: false,
      vehicleSpecs,
      equipmentSpecs,
      reason: `${equipmentSpecs.name} weighs ${equipmentSpecs.weight.toLocaleString()} lbs, exceeding safe towing capacity of ${safeTowingCapacity.toLocaleString()} lbs (${vehicleSpecs.maxTowingCapacity.toLocaleString()} max)`,
      recommendation: vehicleSpecs.vehicleClass === 'light_duty' ? 
        'Consider heavy-duty truck like Silverado 2500HD or commercial towing service' :
        'This equipment requires specialized commercial transportation'
    };
  }

  return {
    canTow: true,
    vehicleSpecs,
    equipmentSpecs,
    reason: `${vehicleSpecs.make} ${vehicleSpecs.model} can safely tow ${equipmentSpecs.name} (${equipmentSpecs.weight.toLocaleString()} lbs within ${vehicleSpecs.maxTowingCapacity.toLocaleString()} lb capacity)`
  };
};

// Extract towing-related requests from customer messages
export const analyzeTowingRequest = (customerMessage: string): {
  hasTowingRequest: boolean;
  equipmentMentioned?: string;
  vehicleMentioned?: string;
  isQuestionAboutTowing?: boolean;
} => {
  const message = customerMessage.toLowerCase();
  
  // Towing keywords
  const towingKeywords = ['tow', 'pull', 'haul', 'drag', 'trailer', 'hitch'];
  const hasTowingKeywords = towingKeywords.some(keyword => message.includes(keyword));
  
  // Equipment mentions
  const equipmentMentions = EQUIPMENT_DATABASE
    .filter(equipment => equipment.aliases.some(alias => message.includes(alias.toLowerCase())))
    .map(equipment => equipment.name);
  
  // Vehicle mentions
  const vehicleMentions = VEHICLE_SPECS_DATABASE
    .filter(vehicle => message.includes(vehicle.model.toLowerCase()))
    .map(vehicle => `${vehicle.make} ${vehicle.model}`);
  
  const hasTowingRequest = hasTowingKeywords || equipmentMentions.length > 0;
  
  return {
    hasTowingRequest,
    equipmentMentioned: equipmentMentions[0],
    vehicleMentioned: vehicleMentions[0],
    isQuestionAboutTowing: hasTowingRequest && (message.includes('?') || message.includes('can') || message.includes('will'))
  };
};

// Generate safe towing response
export const generateSafeTowingResponse = (validation: ReturnType<typeof validateTowingCapability>, customerIntent: any): string => {
  if (!validation.canTow) {
    if (validation.equipmentSpecs?.requiresCommercialVehicle) {
      return `I need to be honest - ${validation.equipmentSpecs.name} is heavy construction equipment weighing ${validation.equipmentSpecs.weight.toLocaleString()} pounds. This requires specialized commercial transportation, not a passenger vehicle. I'd recommend contacting a commercial equipment transport service for safe delivery.`;
    }
    
    if (validation.reason && validation.recommendation) {
      return `I want to make sure I give you accurate information about towing. ${validation.reason}. ${validation.recommendation}. Would you like me to help you find vehicles better suited for your towing needs?`;
    }
    
    return "I'd need to verify the specific towing requirements and vehicle capabilities before making any recommendations. What exactly are you planning to tow?";
  }
  
  return `Yes, the ${validation.vehicleSpecs?.make} ${validation.vehicleSpecs?.model} can handle that with its ${validation.vehicleSpecs?.maxTowingCapacity.toLocaleString()} lb towing capacity. Would you like to schedule a time to see it?`;
};
