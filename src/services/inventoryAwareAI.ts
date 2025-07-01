
interface InventoryRecommendation {
  vehicle_id: string;
  make: string;
  model: string;
  year: number;
  price: number;
  match_score: number;
  recommendation_reason: string;
}

interface InventoryEnhancedResponse {
  message: string;
  inventoryRecommendations: InventoryRecommendation[];
  inventoryContext: string;
}

class InventoryAwareAI {
  private availableInventory: any[] = [];
  private lastInventoryUpdate = new Date(0);

  async enhanceResponseWithInventory(
    context: any,
    originalMessage: string
  ): Promise<InventoryEnhancedResponse> {
    console.log('🚗 [INVENTORY-AI] Enhancing response with inventory awareness...');

    try {
      // Refresh inventory if needed
      await this.refreshInventoryCache();

      // Extract vehicle preferences from context
      const preferences = this.extractVehiclePreferences(context);
      
      // Find matching inventory
      const recommendations = this.findMatchingVehicles(preferences);
      
      // Enhance message with inventory context
      const enhancedMessage = this.enhanceMessageWithInventory(
        originalMessage,
        recommendations,
        preferences
      );

      const result: InventoryEnhancedResponse = {
        message: enhancedMessage,
        inventoryRecommendations: recommendations,
        inventoryContext: this.generateInventoryContext(recommendations)
      };

      console.log(`✅ [INVENTORY-AI] Enhanced with ${recommendations.length} recommendations`);
      return result;
    } catch (error) {
      console.error('❌ [INVENTORY-AI] Enhancement failed:', error);
      return {
        message: originalMessage,
        inventoryRecommendations: [],
        inventoryContext: ''
      };
    }
  }

  private async refreshInventoryCache(): Promise<void> {
    const now = new Date();
    const cacheAge = now.getTime() - this.lastInventoryUpdate.getTime();
    const cacheMaxAge = 5 * 60 * 1000; // 5 minutes

    if (cacheAge < cacheMaxAge && this.availableInventory.length > 0) {
      return;
    }

    console.log('🔄 [INVENTORY-AI] Refreshing inventory cache...');

    // Mock inventory data - in real implementation, this would fetch from Supabase
    this.availableInventory = [
      {
        id: '1',
        make: 'Honda',
        model: 'Civic',
        year: 2024,
        price: 28500,
        body_style: 'Sedan',
        fuel_type: 'Gas',
        status: 'available'
      },
      {
        id: '2',
        make: 'Toyota',
        model: 'Camry',
        year: 2024,
        price: 32000,
        body_style: 'Sedan',
        fuel_type: 'Hybrid',
        status: 'available'
      },
      {
        id: '3',
        make: 'Ford',
        model: 'F-150',
        year: 2023,
        price: 45000,
        body_style: 'Truck',
        fuel_type: 'Gas',
        status: 'available'
      },
      {
        id: '4',
        make: 'Chevrolet',
        model: 'Equinox',
        year: 2024,
        price: 35500,
        body_style: 'SUV',
        fuel_type: 'Gas',
        status: 'available'
      }
    ];

    this.lastInventoryUpdate = now;
    console.log(`✅ [INVENTORY-AI] Cached ${this.availableInventory.length} vehicles`);
  }

  private extractVehiclePreferences(context: any): any {
    const preferences = {
      make: null,
      model: null,
      maxPrice: null,
      minPrice: null,
      bodyStyle: null,
      fuelType: null
    };

    // Extract from vehicle interest
    const vehicleInterest = context.vehicleInterest?.toLowerCase() || '';
    
    // Extract make
    const makes = ['honda', 'toyota', 'ford', 'chevrolet', 'bmw', 'mercedes'];
    for (const make of makes) {
      if (vehicleInterest.includes(make)) {
        preferences.make = make.charAt(0).toUpperCase() + make.slice(1);
        break;
      }
    }

    // Extract body style
    if (vehicleInterest.includes('suv') || vehicleInterest.includes('crossover')) {
      preferences.bodyStyle = 'SUV';
    } else if (vehicleInterest.includes('truck') || vehicleInterest.includes('pickup')) {
      preferences.bodyStyle = 'Truck';
    } else if (vehicleInterest.includes('sedan') || vehicleInterest.includes('car')) {
      preferences.bodyStyle = 'Sedan';
    }

    // Extract price preferences from latest message
    const latestMessage = context.latestMessage?.toLowerCase() || '';
    const priceMatch = latestMessage.match(/under\s*\$?([\d,]+)|below\s*\$?([\d,]+)|max.*\$?([\d,]+)/);
    if (priceMatch) {
      preferences.maxPrice = parseInt(priceMatch[1]?.replace(',', '') || '0');
    }

    return preferences;
  }

  private findMatchingVehicles(preferences: any): InventoryRecommendation[] {
    return this.availableInventory
      .map(vehicle => {
        let matchScore = 0;
        let reason = '';

        // Make match
        if (preferences.make && vehicle.make === preferences.make) {
          matchScore += 30;
          reason += `${vehicle.make} match, `;
        }

        // Body style match
        if (preferences.bodyStyle && vehicle.body_style === preferences.bodyStyle) {
          matchScore += 25;
          reason += `${vehicle.body_style} style, `;
        }

        // Price match
        if (preferences.maxPrice && vehicle.price <= preferences.maxPrice) {
          matchScore += 20;
          reason += `within budget, `;
        }

        // Fuel efficiency bonus
        if (vehicle.fuel_type === 'Hybrid') {
          matchScore += 15;
          reason += 'fuel efficient, ';
        }

        // Recent model bonus
        if (vehicle.year >= 2023) {
          matchScore += 10;
          reason += 'recent model, ';
        }

        return {
          vehicle_id: vehicle.id,
          make: vehicle.make,
          model: vehicle.model,
          year: vehicle.year,
          price: vehicle.price,
          match_score: matchScore,
          recommendation_reason: reason.slice(0, -2) || 'available option'
        };
      })
      .filter(rec => rec.match_score > 0)
      .sort((a, b) => b.match_score - a.match_score)
      .slice(0, 3);
  }

  private enhanceMessageWithInventory(
    originalMessage: string,
    recommendations: InventoryRecommendation[],
    preferences: any
  ): string {
    if (recommendations.length === 0) {
      return originalMessage;
    }

    const topRecommendation = recommendations[0];
    
    // Add inventory context to message
    if (preferences.make || preferences.bodyStyle) {
      const inventoryContext = `I have a ${topRecommendation.year} ${topRecommendation.make} ${topRecommendation.model} that might interest you - it's ${topRecommendation.recommendation_reason}. `;
      return inventoryContext + originalMessage;
    }

    return originalMessage;
  }

  private generateInventoryContext(recommendations: InventoryRecommendation[]): string {
    if (recommendations.length === 0) {
      return 'No specific inventory matches found';
    }

    return `Found ${recommendations.length} matching vehicles with scores: ${recommendations.map(r => `${r.make} ${r.model} (${r.match_score}%)`).join(', ')}`;
  }
}

export const inventoryAwareAI = new InventoryAwareAI();
