
import { supabase } from '@/integrations/supabase/client';

// Expanded vehicle database with better coverage
const VEHICLE_DATABASE = {
  chevrolet: {
    aliases: ['chevy', 'chevrolet'],
    models: {
      'silverado': ['1500', '2500hd', '3500hd', 'rst', 'zr2', 'trail boss', 'high country'],
      'equinox': ['ls', 'lt', 'premier', 'rs'],
      'tahoe': ['ls', 'lt', 'z71', 'premier', 'high country'],
      'suburban': ['ls', 'lt', 'z71', 'premier', 'high country'],
      'traverse': ['ls', 'lt', 'rs', 'premier'],
      'malibu': ['ls', 'lt', 'rs', 'premier'],
      'camaro': ['ls', 'lt', 'ss', 'zl1', '1ls', '2ls', '3lt'],
      'corvette': ['stingray', 'z06', 'zr1'],
      'blazer': ['l', 'lt', 'rs', 'premier'],
      'trailblazer': ['ls', 'lt', 'activ', 'rs'],
      'colorado': ['work truck', 'lt', 'z71', 'zr2'],
      'express': ['2500', '3500', 'cargo', 'passenger'],
      'impala': ['ls', 'lt', 'premier'],
      'cruze': ['l', 'ls', 'lt', 'premier'],
      'sonic': ['ls', 'lt', 'premier'],
      'spark': ['ls', 'lt'],
      'bolt': ['ev', 'euv'],
      'trax': ['ls', 'lt', 'premier']
    },
    categories: {
      'truck': ['silverado', 'colorado'],
      'suv': ['tahoe', 'suburban', 'traverse', 'equinox', 'blazer', 'trailblazer'],
      'sedan': ['malibu', 'impala', 'cruze'],
      'sports': ['camaro', 'corvette'],
      'compact': ['sonic', 'spark', 'trax', 'bolt'],
      'van': ['express']
    }
  },
  gmc: {
    aliases: ['gmc'],
    models: {
      'sierra': ['1500', '2500hd', '3500hd', 'at4', 'denali', 'elevation'],
      'yukon': ['sle', 'slt', 'at4', 'denali'],
      'acadia': ['sle', 'slt', 'at4', 'denali'],
      'terrain': ['sle', 'slt', 'at4', 'denali'],
      'canyon': ['elevation', 'sle', 'slt', 'at4'],
      'savana': ['2500', '3500', 'cargo', 'passenger']
    },
    categories: {
      'truck': ['sierra', 'canyon'],
      'suv': ['yukon', 'acadia', 'terrain'],
      'van': ['savana']
    }
  },
  ford: {
    aliases: ['ford'],
    models: {
      'f150': ['regular cab', 'supercab', 'supercrew', 'lightning', 'raptor'],
      'f250': ['regular cab', 'supercab', 'crew cab'],
      'f350': ['regular cab', 'supercab', 'crew cab'],
      'explorer': ['base', 'xlt', 'limited', 'platinum', 'st'],
      'escape': ['s', 'se', 'sel', 'titanium'],
      'edge': ['se', 'sel', 'titanium', 'st'],
      'expedition': ['xlt', 'limited', 'king ranch', 'platinum'],
      'mustang': ['ecoboost', 'gt', 'mach 1', 'shelby'],
      'fusion': ['s', 'se', 'sel', 'titanium'],
      'focus': ['s', 'se', 'sel', 'st', 'rs'],
      'ranger': ['regular cab', 'supercab', 'supercrew']
    },
    categories: {
      'truck': ['f150', 'f250', 'f350', 'ranger'],
      'suv': ['explorer', 'escape', 'edge', 'expedition'],
      'sports': ['mustang'],
      'sedan': ['fusion', 'focus']
    }
  }
};

export interface VehicleRecognitionResult {
  isValid: boolean;
  confidence: number;
  extractedVehicle: {
    make?: string;
    model?: string;
    year?: number;
    trim?: string;
    category?: string;
  };
  suggestions: string[];
  useGeneric: boolean;
  enhancedDescription: string;
}

export class VehicleRecognitionService {
  // Enhanced vehicle interest recognition with fuzzy matching
  recognizeVehicleInterest(vehicleInterest: string): VehicleRecognitionResult {
    console.log(`🔍 [VEHICLE RECOGNITION] Analyzing: "${vehicleInterest}"`);
    
    const cleaned = vehicleInterest.toLowerCase().trim();
    
    // Check for corruption patterns first
    if (this.isCorruptedData(cleaned)) {
      return this.createGenericResult('Corrupted data detected');
    }

    // Extract year if present
    const yearMatch = cleaned.match(/\b(19|20)\d{2}\b/);
    const year = yearMatch ? parseInt(yearMatch[0]) : undefined;

    // Try to identify make and model
    const vehicleInfo = this.extractMakeModel(cleaned);
    
    if (vehicleInfo.make && vehicleInfo.model) {
      const category = this.getVehicleCategory(vehicleInfo.make, vehicleInfo.model);
      const trim = this.extractTrim(cleaned, vehicleInfo.make, vehicleInfo.model);
      
      return {
        isValid: true,
        confidence: 0.9,
        extractedVehicle: {
          make: vehicleInfo.make,
          model: vehicleInfo.model,
          year,
          trim,
          category
        },
        suggestions: this.generateSuggestions(vehicleInfo.make, vehicleInfo.model),
        useGeneric: false,
        enhancedDescription: this.createEnhancedDescription(vehicleInfo.make, vehicleInfo.model, year, trim, category)
      };
    }

    // Try partial matches
    const partialMatch = this.findPartialMatches(cleaned);
    if (partialMatch.confidence > 0.4) {
      return partialMatch;
    }

    // Check for vehicle categories
    const categoryMatch = this.findCategoryMatch(cleaned);
    if (categoryMatch.confidence > 0.3) {
      return categoryMatch;
    }

    return this.createGenericResult('No specific vehicle recognized');
  }

  private isCorruptedData(text: string): boolean {
    const corruptionPatterns = [
      'unknown', 'not specified', 'n/a', 'null', 'undefined', 'test', 'sample', 'demo',
      'make unknown', 'model unknown', 'year unknown'
    ];
    
    return corruptionPatterns.some(pattern => text.includes(pattern)) || 
           text.length < 2 || 
           text.length > 200;
  }

  private extractMakeModel(text: string): { make?: string; model?: string } {
    for (const [make, data] of Object.entries(VEHICLE_DATABASE)) {
      // Check make aliases
      const makeFound = data.aliases.some(alias => text.includes(alias));
      
      if (makeFound) {
        // Look for model
        for (const model of Object.keys(data.models)) {
          if (text.includes(model)) {
            return { make, model };
          }
        }
        return { make };
      }
    }
    
    return {};
  }

  private extractTrim(text: string, make: string, model: string): string | undefined {
    const makeData = VEHICLE_DATABASE[make as keyof typeof VEHICLE_DATABASE];
    if (!makeData) return undefined;
    
    const trims = makeData.models[model as keyof typeof makeData.models];
    if (!trims) return undefined;
    
    return trims.find(trim => text.includes(trim.toLowerCase()));
  }

  private getVehicleCategory(make: string, model: string): string | undefined {
    const makeData = VEHICLE_DATABASE[make as keyof typeof VEHICLE_DATABASE];
    if (!makeData) return undefined;
    
    for (const [category, models] of Object.entries(makeData.categories)) {
      if (models.includes(model)) {
        return category;
      }
    }
    
    return undefined;
  }

  private findPartialMatches(text: string): VehicleRecognitionResult {
    // Look for just make mentions
    for (const [make, data] of Object.entries(VEHICLE_DATABASE)) {
      if (data.aliases.some(alias => text.includes(alias))) {
        return {
          isValid: true,
          confidence: 0.6,
          extractedVehicle: { make },
          suggestions: Object.keys(data.models).slice(0, 3),
          useGeneric: false,
          enhancedDescription: `${make.charAt(0).toUpperCase() + make.slice(1)} vehicle`
        };
      }
    }

    return this.createGenericResult('No partial matches');
  }

  private findCategoryMatch(text: string): VehicleRecognitionResult {
    const categoryKeywords = {
      truck: ['truck', 'pickup', 'hauling', 'towing'],
      suv: ['suv', 'crossover', 'family vehicle', 'utility'],
      sedan: ['sedan', 'car', 'four door'],
      sports: ['sports car', 'performance', 'fast'],
      compact: ['compact', 'small', 'economy', 'gas saver']
    };

    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      if (keywords.some(keyword => text.includes(keyword))) {
        return {
          isValid: true,
          confidence: 0.4,
          extractedVehicle: { category },
          suggestions: this.getSuggestionsByCategory(category),
          useGeneric: false,
          enhancedDescription: `${category} vehicle`
        };
      }
    }

    return this.createGenericResult('No category match');
  }

  private generateSuggestions(make: string, model: string): string[] {
    const makeData = VEHICLE_DATABASE[make as keyof typeof VEHICLE_DATABASE];
    if (!makeData) return [];

    // Get similar models from same make
    const allModels = Object.keys(makeData.models);
    return allModels.filter(m => m !== model).slice(0, 3);
  }

  private getSuggestionsByCategory(category: string): string[] {
    const suggestions: string[] = [];
    
    for (const [make, data] of Object.entries(VEHICLE_DATABASE)) {
      const categoryModels = data.categories[category as keyof typeof data.categories];
      if (categoryModels) {
        suggestions.push(...categoryModels.slice(0, 2).map(model => `${make} ${model}`));
      }
    }
    
    return suggestions.slice(0, 4);
  }

  private createEnhancedDescription(make?: string, model?: string, year?: number, trim?: string, category?: string): string {
    const parts = [];
    if (year) parts.push(year.toString());
    if (make) parts.push(make.charAt(0).toUpperCase() + make.slice(1));
    if (model) parts.push(model.charAt(0).toUpperCase() + model.slice(1));
    if (trim) parts.push(trim.toUpperCase());
    
    return parts.join(' ') || (category ? `${category} vehicle` : 'vehicle');
  }

  private createGenericResult(reason: string): VehicleRecognitionResult {
    console.log(`⚠️ [VEHICLE RECOGNITION] Using generic result: ${reason}`);
    
    return {
      isValid: false,
      confidence: 0.2,
      extractedVehicle: {},
      suggestions: ['finding the right vehicle', 'exploring your options', 'looking at available inventory'],
      useGeneric: true,
      enhancedDescription: 'finding the perfect vehicle for your needs'
    };
  }

  // Get contextual validation based on dealership inventory
  async getContextualValidation(vehicleInterest: string, leadId?: string): Promise<{
    hasInventoryMatch: boolean;
    similarVehicles: any[];
    inventoryHint: string;
  }> {
    try {
      const recognition = this.recognizeVehicleInterest(vehicleInterest);
      
      if (!recognition.isValid || !recognition.extractedVehicle.make) {
        return {
          hasInventoryMatch: false,
          similarVehicles: [],
          inventoryHint: ''
        };
      }

      // Check inventory for matches
      const { data: inventory } = await supabase
        .from('inventory')
        .select('*')
        .eq('status', 'available')
        .ilike('make', `%${recognition.extractedVehicle.make}%`)
        .limit(5);

      const exactMatches = inventory?.filter(item => 
        recognition.extractedVehicle.model && 
        item.model?.toLowerCase().includes(recognition.extractedVehicle.model.toLowerCase())
      ) || [];

      const similarVehicles = inventory?.filter(item => 
        !exactMatches.find(exact => exact.id === item.id)
      ).slice(0, 3) || [];

      let inventoryHint = '';
      if (exactMatches.length > 0) {
        inventoryHint = `We have ${exactMatches.length} ${recognition.enhancedDescription}${exactMatches.length > 1 ? 's' : ''} available`;
      } else if (similarVehicles.length > 0) {
        inventoryHint = `We have similar ${recognition.extractedVehicle.make} vehicles available`;
      }

      return {
        hasInventoryMatch: exactMatches.length > 0,
        similarVehicles: [...exactMatches, ...similarVehicles],
        inventoryHint
      };

    } catch (error) {
      console.error('❌ [VEHICLE RECOGNITION] Error in contextual validation:', error);
      return {
        hasInventoryMatch: false,
        similarVehicles: [],
        inventoryHint: ''
      };
    }
  }
}

export const vehicleRecognitionService = new VehicleRecognitionService();
