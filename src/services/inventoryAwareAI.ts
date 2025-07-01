
import { supabase } from '@/integrations/supabase/client';
import { unifiedAIResponseEngine, MessageContext } from './unifiedAIResponseEngine';

interface InventoryContext {
  availableVehicles: any[];
  matchingVehicles: any[];
  inventoryTrends: any;
  competitivePosition: any;
}

interface InventoryRecommendation {
  vehicle: any;
  matchScore: number;
  reasoning: string;
  urgencyLevel: 'low' | 'medium' | 'high';
}

class InventoryAwareAIService {
  async enhanceResponseWithInventory(
    originalContext: MessageContext,
    originalResponse?: string
  ): Promise<{ message: string; inventoryRecommendations: InventoryRecommendation[] }> {
    try {
      console.log('🚗 [INVENTORY-AI] Enhancing response with inventory awareness');

      // Get inventory context for this lead
      const inventoryContext = await this.buildInventoryContext(originalContext);
      
      // Generate inventory-aware response
      const enhancedResponse = await this.generateInventoryAwareResponse(
        originalContext,
        inventoryContext,
        originalResponse
      );

      // Get specific vehicle recommendations
      const recommendations = await this.generateVehicleRecommendations(
        originalContext,
        inventoryContext
      );

      return {
        message: enhancedResponse,
        inventoryRecommendations: recommendations
      };

    } catch (error) {
      console.error('❌ [INVENTORY-AI] Error enhancing with inventory:', error);
      return {
        message: originalResponse || unifiedAIResponseEngine.generateResponse(originalContext).message,
        inventoryRecommendations: []
      };
    }
  }

  private async buildInventoryContext(context: MessageContext): Promise<InventoryContext> {
    try {
      // Get available vehicles matching lead's interest
      const { data: availableVehicles } = await supabase
        .from('inventory')
        .select('*')
        .eq('status', 'available')
        .order('days_in_inventory', { ascending: true })
        .limit(20);

      if (!availableVehicles) {
        return {
          availableVehicles: [],
          matchingVehicles: [],
          inventoryTrends: null,
          competitivePosition: null
        };
      }

      // Filter vehicles based on lead's vehicle interest
      const matchingVehicles = this.filterVehiclesByInterest(
        availableVehicles,
        context.vehicleInterest
      );

      // Get inventory trends
      const inventoryTrends = await this.getInventoryTrends();

      // Get competitive position
      const competitivePosition = await this.getCompetitivePosition(matchingVehicles);

      return {
        availableVehicles,
        matchingVehicles: matchingVehicles.slice(0, 5), // Top 5 matches
        inventoryTrends,
        competitivePosition
      };

    } catch (error) {
      console.error('❌ [INVENTORY-AI] Error building inventory context:', error);
      return {
        availableVehicles: [],
        matchingVehicles: [],
        inventoryTrends: null,
        competitivePosition: null
      };
    }
  }

  private filterVehiclesByInterest(vehicles: any[], vehicleInterest: string): any[] {
    if (!vehicleInterest || vehicleInterest.length < 3) {
      return vehicles.slice(0, 10); // Return top 10 if no specific interest
    }

    const interest = vehicleInterest.toLowerCase();
    
    return vehicles
      .map(vehicle => ({
        ...vehicle,
        matchScore: this.calculateVehicleMatchScore(vehicle, interest)
      }))
      .filter(vehicle => vehicle.matchScore > 0)
      .sort((a, b) => b.matchScore - a.matchScore);
  }

  private calculateVehicleMatchScore(vehicle: any, interest: string): number {
    let score = 0;

    // Direct make/model matches
    if (interest.includes(vehicle.make?.toLowerCase())) score += 30;
    if (interest.includes(vehicle.model?.toLowerCase())) score += 30;
    
    // Year preferences
    if (interest.includes('new') && vehicle.condition === 'new') score += 20;
    if (interest.includes('used') && vehicle.condition === 'used') score += 20;
    
    // Body style matches
    if (interest.includes('suv') && vehicle.body_style?.toLowerCase().includes('suv')) score += 25;
    if (interest.includes('truck') && vehicle.body_style?.toLowerCase().includes('truck')) score += 25;
    if (interest.includes('sedan') && vehicle.body_style?.toLowerCase().includes('sedan')) score += 25;
    
    // Price considerations
    if (interest.includes('affordable') && vehicle.price < 25000) score += 15;
    if (interest.includes('luxury') && vehicle.price > 50000) score += 15;

    // Inventory urgency (higher score for vehicles that need to move)
    if (vehicle.days_in_inventory > 60) score += 10;
    if (vehicle.days_in_inventory > 90) score += 15;

    return score;
  }

  private async getInventoryTrends(): Promise<any> {
    try {
      const { data: trends } = await supabase
        .from('inventory')
        .select('make, model, condition, price, days_in_inventory, status')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      if (!trends) return null;

      // Analyze trends
      const fastMoving = trends
        .filter(v => v.status === 'sold' && v.days_in_inventory < 30)
        .slice(0, 5);

      const slowMoving = trends
        .filter(v => v.status === 'available' && v.days_in_inventory > 60)
        .slice(0, 5);

      return {
        fastMoving: fastMoving.map(v => `${v.make} ${v.model}`),
        slowMoving: slowMoving.map(v => `${v.make} ${v.model}`),
        avgDaysOnLot: trends.reduce((sum, v) => sum + (v.days_in_inventory || 0), 0) / trends.length
      };

    } catch (error) {
      console.error('❌ [INVENTORY-AI] Error getting trends:', error);
      return null;
    }
  }

  private async getCompetitivePosition(vehicles: any[]): Promise<any> {
    try {
      if (vehicles.length === 0) return null;

      const avgPrice = vehicles.reduce((sum, v) => sum + (v.price || 0), 0) / vehicles.length;
      
      return {
        averagePrice: avgPrice,
        priceRange: {
          min: Math.min(...vehicles.map(v => v.price || 0)),
          max: Math.max(...vehicles.map(v => v.price || 0))
        },
        totalAvailable: vehicles.length
      };

    } catch (error) {
      console.error('❌ [INVENTORY-AI] Error getting competitive position:', error);
      return null;
    }
  }

  private async generateInventoryAwareResponse(
    context: MessageContext,
    inventoryContext: InventoryContext,
    originalResponse?: string
  ): Promise<string> {
    try {
      // If we have matching vehicles, enhance the response
      if (inventoryContext.matchingVehicles.length > 0) {
        const topMatch = inventoryContext.matchingVehicles[0];
        
        // Generate enhanced context-aware response
        const enhancedContext: MessageContext = {
          ...context,
          vehicleInterest: `${context.vehicleInterest} - We have ${inventoryContext.matchingVehicles.length} matching vehicles available, including a ${topMatch.year} ${topMatch.make} ${topMatch.model}`
        };

        const response = unifiedAIResponseEngine.generateResponse(enhancedContext);
        
        if (response?.message) {
          // Add inventory-specific enhancements
          return this.addInventoryEnhancements(response.message, inventoryContext);
        }
      }

      // Fallback to original response with minimal inventory awareness
      if (originalResponse) {
        return this.addInventoryEnhancements(originalResponse, inventoryContext);
      }

      // Generate new response with inventory context
      const response = unifiedAIResponseEngine.generateResponse(context);
      return response?.message || "I'd be happy to help you find the right vehicle!";

    } catch (error) {
      console.error('❌ [INVENTORY-AI] Error generating inventory-aware response:', error);
      return originalResponse || "I'd be happy to help you find the right vehicle!";
    }
  }

  private addInventoryEnhancements(response: string, inventoryContext: InventoryContext): string {
    let enhanced = response;

    // Add availability mentions if we have matching vehicles
    if (inventoryContext.matchingVehicles.length > 0) {
      const count = inventoryContext.matchingVehicles.length;
      const plural = count > 1 ? 'options' : 'option';
      
      if (!enhanced.toLowerCase().includes('available') && !enhanced.toLowerCase().includes('stock')) {
        enhanced += ` We currently have ${count} great ${plural} that might interest you.`;
      }
    }

    // Add urgency for slow-moving inventory
    if (inventoryContext.inventoryTrends?.slowMoving?.length > 0) {
      const slowMovingMatch = inventoryContext.matchingVehicles.find(v => 
        inventoryContext.inventoryTrends.slowMoving.includes(`${v.make} ${v.model}`)
      );
      
      if (slowMovingMatch && !enhanced.toLowerCase().includes('incentive')) {
        enhanced += ` There may be additional incentives available on select models.`;
      }
    }

    return enhanced;
  }

  private async generateVehicleRecommendations(
    context: MessageContext,
    inventoryContext: InventoryContext
  ): Promise<InventoryRecommendation[]> {
    const recommendations: InventoryRecommendation[] = [];

    inventoryContext.matchingVehicles.slice(0, 3).forEach(vehicle => {
      const urgencyLevel = vehicle.days_in_inventory > 90 ? 'high' : 
                          vehicle.days_in_inventory > 60 ? 'medium' : 'low';

      recommendations.push({
        vehicle,
        matchScore: vehicle.matchScore || 0,
        reasoning: this.generateRecommendationReasoning(vehicle, context.vehicleInterest),
        urgencyLevel
      });
    });

    return recommendations;
  }

  private generateRecommendationReasoning(vehicle: any, interest: string): string {
    const reasons = [];

    if (interest.toLowerCase().includes(vehicle.make?.toLowerCase())) {
      reasons.push(`matches your ${vehicle.make} preference`);
    }
    
    if (vehicle.days_in_inventory > 60) {
      reasons.push('may have additional incentives available');
    }
    
    if (vehicle.condition === 'new') {
      reasons.push('brand new with full warranty');
    }

    if (reasons.length === 0) {
      reasons.push('fits your criteria well');
    }

    return reasons.join(', ');
  }

  async getInventoryInsights(leadId: string): Promise<any> {
    try {
      const { data: lead } = await supabase
        .from('leads')
        .select('vehicle_interest, preferred_price_min, preferred_price_max')
        .eq('id', leadId)
        .single();

      if (!lead) return null;

      const context: MessageContext = {
        leadId,
        leadName: '',
        latestMessage: '',
        conversationHistory: [],
        vehicleInterest: lead.vehicle_interest || ''
      };

      const inventoryContext = await this.buildInventoryContext(context);
      
      return {
        totalMatching: inventoryContext.matchingVehicles.length,
        topRecommendations: inventoryContext.matchingVehicles.slice(0, 3),
        marketInsights: inventoryContext.inventoryTrends,
        competitivePosition: inventoryContext.competitivePosition
      };

    } catch (error) {
      console.error('❌ [INVENTORY-AI] Error getting inventory insights:', error);
      return null;
    }
  }
}

export const inventoryAwareAI = new InventoryAwareAIService();
