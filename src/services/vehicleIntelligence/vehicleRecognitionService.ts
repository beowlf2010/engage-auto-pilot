
import { supabase } from '@/integrations/supabase/client';

export interface VehicleRecognitionResult {
  confidence: number;
  extractedVehicle: {
    make?: string;
    model?: string;
    year?: number;
    category?: string;
    trim?: string;
    bodyStyle?: string;
  };
  enhancedDescription: string;
  recognizedTerms: string[];
  suggestions: string[];
}

export interface InventoryValidationResult {
  hasInventoryMatch: boolean;
  exactMatches: any[];
  similarVehicles: any[];
  suggestedAlternatives: string[];
  inventoryCount: number;
}

// Expanded vehicle database
const VEHICLE_DATABASE = {
  chevrolet: {
    models: ['equinox', 'tahoe', 'suburban', 'silverado', 'malibu', 'cruze', 'impala', 'camaro', 'corvette', 'traverse', 'trax', 'spark', 'sonic', 'bolt'],
    categories: {
      'suv': ['equinox', 'tahoe', 'suburban', 'traverse', 'trax'],
      'truck': ['silverado'],
      'sedan': ['malibu', 'cruze', 'impala'],
      'sports': ['camaro', 'corvette'],
      'compact': ['spark', 'sonic', 'trax'],
      'electric': ['bolt']
    }
  },
  ford: {
    models: ['f150', 'escape', 'explorer', 'edge', 'fusion', 'focus', 'mustang', 'expedition', 'ranger', 'bronco'],
    categories: {
      'truck': ['f150', 'ranger'],
      'suv': ['escape', 'explorer', 'edge', 'expedition', 'bronco'],
      'sedan': ['fusion', 'focus'],
      'sports': ['mustang']
    }
  },
  toyota: {
    models: ['camry', 'corolla', 'rav4', 'highlander', 'sienna', 'prius', 'tacoma', 'tundra', '4runner'],
    categories: {
      'sedan': ['camry', 'corolla'],
      'suv': ['rav4', 'highlander', '4runner'],
      'truck': ['tacoma', 'tundra'],
      'hybrid': ['prius']
    }
  },
  honda: {
    models: ['accord', 'civic', 'crv', 'pilot', 'odyssey', 'ridgeline', 'passport'],
    categories: {
      'sedan': ['accord', 'civic'],
      'suv': ['crv', 'pilot', 'passport'],
      'truck': ['ridgeline']
    }
  }
};

const VEHICLE_CATEGORIES = [
  'suv', 'truck', 'sedan', 'hatchback', 'coupe', 'convertible', 'wagon',
  'pickup', 'crossover', 'minivan', 'sports car', 'luxury', 'compact',
  'mid-size', 'full-size', 'electric', 'hybrid'
];

export class VehicleRecognitionService {
  recognizeVehicleInterest(vehicleInterest: string): VehicleRecognitionResult {
    if (!vehicleInterest || vehicleInterest.length < 3) {
      return this.createFallbackResult(vehicleInterest);
    }

    const normalized = vehicleInterest.toLowerCase().trim();
    const words = normalized.split(/\s+/);
    
    const result: VehicleRecognitionResult = {
      confidence: 0,
      extractedVehicle: {},
      enhancedDescription: vehicleInterest,
      recognizedTerms: [],
      suggestions: []
    };

    // Try to extract make, model, year, etc.
    this.extractMake(normalized, words, result);
    this.extractModel(normalized, words, result);
    this.extractYear(normalized, words, result);
    this.extractCategory(normalized, words, result);
    this.extractTrimAndBodyStyle(normalized, words, result);
    
    // Calculate confidence based on what we found
    result.confidence = this.calculateConfidence(result);
    
    // Generate enhanced description
    result.enhancedDescription = this.generateEnhancedDescription(result, vehicleInterest);
    
    // Generate suggestions for better matching
    result.suggestions = this.generateSuggestions(result, normalized);

    return result;
  }

  private extractMake(normalized: string, words: string[], result: VehicleRecognitionResult) {
    for (const [make, data] of Object.entries(VEHICLE_DATABASE)) {
      if (normalized.includes(make) || words.includes(make)) {
        result.extractedVehicle.make = make;
        result.recognizedTerms.push(make);
        return;
      }
      
      // Check for common abbreviations
      const abbreviations: { [key: string]: string } = {
        'chevy': 'chevrolet',
        'ford': 'ford',
        'toyota': 'toyota',
        'honda': 'honda'
      };
      
      for (const [abbrev, fullMake] of Object.entries(abbreviations)) {
        if (normalized.includes(abbrev) && fullMake === make) {
          result.extractedVehicle.make = make;
          result.recognizedTerms.push(abbrev);
          return;
        }
      }
    }
  }

  private extractModel(normalized: string, words: string[], result: VehicleRecognitionResult) {
    const make = result.extractedVehicle.make;
    if (make && VEHICLE_DATABASE[make as keyof typeof VEHICLE_DATABASE]) {
      const makeData = VEHICLE_DATABASE[make as keyof typeof VEHICLE_DATABASE];
      const models = makeData.models || [];
      
      for (const model of models) {
        if (normalized.includes(model) || words.includes(model)) {
          result.extractedVehicle.model = model;
          result.recognizedTerms.push(model);
          return;
        }
      }
    }
    
    // Also check across all makes if no make was found
    if (!make) {
      for (const [makeName, data] of Object.entries(VEHICLE_DATABASE)) {
        const models = data.models || [];
        for (const model of models) {
          if (normalized.includes(model) || words.includes(model)) {
            result.extractedVehicle.make = makeName;
            result.extractedVehicle.model = model;
            result.recognizedTerms.push(model);
            return;
          }
        }
      }
    }
  }

  private extractYear(normalized: string, words: string[], result: VehicleRecognitionResult) {
    const currentYear = new Date().getFullYear();
    const yearPattern = /\b(19|20)\d{2}\b/g;
    const matches = normalized.match(yearPattern);
    
    if (matches && matches.length > 0) {
      const years = matches.map(y => parseInt(y)).filter(y => y >= 1990 && y <= currentYear + 2);
      if (years.length > 0) {
        result.extractedVehicle.year = years[0];
        result.recognizedTerms.push(years[0].toString());
      }
    }
  }

  private extractCategory(normalized: string, words: string[], result: VehicleRecognitionResult) {
    for (const category of VEHICLE_CATEGORIES) {
      if (normalized.includes(category) || words.includes(category)) {
        result.extractedVehicle.category = category;
        result.recognizedTerms.push(category);
        return;
      }
    }
    
    // Try to infer category from make/model if found
    const make = result.extractedVehicle.make;
    const model = result.extractedVehicle.model;
    
    if (make && model && VEHICLE_DATABASE[make as keyof typeof VEHICLE_DATABASE]) {
      const makeData = VEHICLE_DATABASE[make as keyof typeof VEHICLE_DATABASE];
      if (makeData.categories) {
        for (const [cat, models] of Object.entries(makeData.categories)) {
          if (models.includes(model)) {
            result.extractedVehicle.category = cat;
            result.recognizedTerms.push(`${cat} (inferred)`);
            return;
          }
        }
      }
    }
  }

  private extractTrimAndBodyStyle(normalized: string, words: string[], result: VehicleRecognitionResult) {
    const trimLevels = ['base', 'ltz', 'lt', 'ls', 'premier', 'high country', 'work truck', 'custom'];
    const bodyStyles = ['crew cab', 'extended cab', 'regular cab', '2 door', '4 door', 'coupe', 'sedan', 'hatchback'];
    
    for (const trim of trimLevels) {
      if (normalized.includes(trim)) {
        result.extractedVehicle.trim = trim;
        result.recognizedTerms.push(trim);
        break;
      }
    }
    
    for (const style of bodyStyles) {
      if (normalized.includes(style)) {
        result.extractedVehicle.bodyStyle = style;
        result.recognizedTerms.push(style);
        break;
      }
    }
  }

  private calculateConfidence(result: VehicleRecognitionResult): number {
    let confidence = 0;
    
    if (result.extractedVehicle.make) confidence += 0.3;
    if (result.extractedVehicle.model) confidence += 0.4;
    if (result.extractedVehicle.year) confidence += 0.15;
    if (result.extractedVehicle.category) confidence += 0.1;
    if (result.extractedVehicle.trim) confidence += 0.05;
    
    // Boost confidence for complete make+model combinations
    if (result.extractedVehicle.make && result.extractedVehicle.model) {
      confidence += 0.2;
    }
    
    return Math.min(confidence, 1.0);
  }

  private generateEnhancedDescription(result: VehicleRecognitionResult, original: string): string {
    const vehicle = result.extractedVehicle;
    
    if (vehicle.year && vehicle.make && vehicle.model) {
      return `${vehicle.year} ${vehicle.make} ${vehicle.model}${vehicle.trim ? ` ${vehicle.trim}` : ''}`;
    } else if (vehicle.make && vehicle.model) {
      return `${vehicle.make} ${vehicle.model}${vehicle.trim ? ` ${vehicle.trim}` : ''}`;
    } else if (vehicle.category && vehicle.make) {
      return `${vehicle.make} ${vehicle.category}`;
    } else if (vehicle.category) {
      return vehicle.category;
    }
    
    return original;
  }

  private generateSuggestions(result: VehicleRecognitionResult, normalized: string): string[] {
    const suggestions: string[] = [];
    const vehicle = result.extractedVehicle;
    
    if (vehicle.make && !vehicle.model) {
      const makeData = VEHICLE_DATABASE[vehicle.make as keyof typeof VEHICLE_DATABASE];
      if (makeData && makeData.models) {
        suggestions.push(...makeData.models.slice(0, 3).map(model => `${vehicle.make} ${model}`));
      }
    }
    
    if (vehicle.category && !vehicle.make) {
      suggestions.push(`Chevrolet ${vehicle.category}`, `Ford ${vehicle.category}`, `Toyota ${vehicle.category}`);
    }
    
    return suggestions;
  }

  private createFallbackResult(vehicleInterest: string): VehicleRecognitionResult {
    return {
      confidence: 0.1,
      extractedVehicle: {
        category: 'vehicle'
      },
      enhancedDescription: vehicleInterest || 'finding the right vehicle',
      recognizedTerms: [],
      suggestions: ['Chevrolet Equinox', 'Ford Escape', 'Toyota RAV4']
    };
  }

  async getContextualValidation(vehicleInterest: string, leadId: string): Promise<InventoryValidationResult> {
    try {
      const recognition = this.recognizeVehicleInterest(vehicleInterest);
      const vehicle = recognition.extractedVehicle;
      
      // Build inventory query based on recognized vehicle details
      let query = supabase
        .from('inventory')
        .select('*')
        .eq('status', 'available');
      
      if (vehicle.make) {
        query = query.ilike('make', `%${vehicle.make}%`);
      }
      
      const { data: exactMatches } = await query.limit(5);
      
      // Get similar vehicles if no exact matches
      let similarQuery = supabase
        .from('inventory')
        .select('*')
        .eq('status', 'available');
        
      if (vehicle.category) {
        // This is a simple approach - in reality you'd want more sophisticated category matching
        similarQuery = similarQuery.or(`body_style.ilike.%${vehicle.category}%`);
      }
      
      const { data: similarVehicles } = await similarQuery.limit(10);
      
      return {
        hasInventoryMatch: (exactMatches?.length || 0) > 0,
        exactMatches: exactMatches || [],
        similarVehicles: similarVehicles || [],
        suggestedAlternatives: this.generateAlternatives(vehicle),
        inventoryCount: (exactMatches?.length || 0) + (similarVehicles?.length || 0)
      };
      
    } catch (error) {
      console.error('❌ [VEHICLE RECOGNITION] Error validating inventory:', error);
      return {
        hasInventoryMatch: false,
        exactMatches: [],
        similarVehicles: [],
        suggestedAlternatives: [],
        inventoryCount: 0
      };
    }
  }

  private generateAlternatives(vehicle: any): string[] {
    const alternatives: string[] = [];
    
    if (vehicle.make === 'chevrolet') {
      alternatives.push('Chevrolet Equinox', 'Chevrolet Traverse', 'Chevrolet Silverado');
    } else if (vehicle.category) {
      switch (vehicle.category) {
        case 'suv':
          alternatives.push('Chevrolet Equinox', 'Chevrolet Traverse');
          break;
        case 'truck':
          alternatives.push('Chevrolet Silverado');
          break;
        case 'sedan':
          alternatives.push('Chevrolet Malibu');
          break;
        default:
          alternatives.push('Chevrolet Equinox');
      }
    }
    
    return alternatives;
  }
}

export const vehicleRecognitionService = new VehicleRecognitionService();
