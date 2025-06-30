
import { supabase } from '@/integrations/supabase/client';
import { vehicleRecognitionService, VehicleRecognitionResult } from './vehicleRecognitionService';

export interface PersonalizationContext {
  leadId: string;
  leadName: string;
  originalVehicleInterest: string;
  conversationHistory?: string;
  leadSource?: string;
  salespersonName?: string;
}

export interface PersonalizedVehicleMessage {
  message: string;
  confidence: number;
  vehicleContext: VehicleRecognitionResult;
  inventoryReferences: string[];
  followUpQuestions: string[];
  strategy: 'specific' | 'category' | 'exploratory' | 'inventory_driven';
}

export class VehiclePersonalizationService {
  async generatePersonalizedMessage(context: PersonalizationContext): Promise<PersonalizedVehicleMessage> {
    console.log(`🎯 [VEHICLE PERSONALIZATION] Generating for lead: ${context.leadId}`);
    
    // Step 1: Recognize vehicle interest
    const vehicleContext = vehicleRecognitionService.recognizeVehicleInterest(context.originalVehicleInterest);
    
    // Step 2: Get inventory validation
    const inventoryContext = await vehicleRecognitionService.getContextualValidation(
      context.originalVehicleInterest, 
      context.leadId
    );
    
    // Step 3: Generate personalized message based on context
    const message = await this.createPersonalizedMessage(context, vehicleContext, inventoryContext);
    
    return message;
  }

  private async createPersonalizedMessage(
    context: PersonalizationContext,
    vehicleContext: VehicleRecognitionResult,
    inventoryContext: any
  ): Promise<PersonalizedVehicleMessage> {
    
    const salesperson = context.salespersonName || 'Finn';
    const leadName = this.formatName(context.leadName);
    
    // Strategy 1: Specific Vehicle with Inventory Match
    if (vehicleContext.confidence > 0.8 && inventoryContext.hasInventoryMatch) {
      return {
        message: this.generateSpecificVehicleMessage(leadName, vehicleContext, inventoryContext, salesperson),
        confidence: 0.95,
        vehicleContext,
        inventoryReferences: inventoryContext.similarVehicles.map((v: any) => `${v.year} ${v.make} ${v.model}`),
        followUpQuestions: this.generateSpecificFollowUps(vehicleContext),
        strategy: 'specific'
      };
    }
    
    // Strategy 2: Vehicle Category with Suggestions
    if (vehicleContext.confidence > 0.5 || vehicleContext.extractedVehicle.category) {
      return {
        message: this.generateCategoryMessage(leadName, vehicleContext, inventoryContext, salesperson),
        confidence: 0.8,
        vehicleContext,
        inventoryReferences: inventoryContext.similarVehicles.slice(0, 2).map((v: any) => `${v.make} ${v.model}`),
        followUpQuestions: this.generateCategoryFollowUps(vehicleContext),
        strategy: 'category'
      };
    }
    
    // Strategy 3: Inventory-Driven (when vehicle interest is vague but we have good inventory)
    if (inventoryContext.similarVehicles.length > 0) {
      return {
        message: this.generateInventoryDrivenMessage(leadName, inventoryContext, salesperson),
        confidence: 0.7,
        vehicleContext,
        inventoryReferences: inventoryContext.similarVehicles.slice(0, 1).map((v: any) => `${v.year} ${v.make} ${v.model}`),
        followUpQuestions: this.generateExploratoryFollowUps(),
        strategy: 'inventory_driven'
      };
    }
    
    // Strategy 4: Exploratory (when we need to gather more info)
    return {
      message: this.generateExploratoryMessage(leadName, salesperson),
      confidence: 0.6,
      vehicleContext,
      inventoryReferences: [],
      followUpQuestions: this.generateExploratoryFollowUps(),
      strategy: 'exploratory'
    };
  }

  private generateSpecificVehicleMessage(
    leadName: string, 
    vehicleContext: VehicleRecognitionResult, 
    inventoryContext: any, 
    salesperson: string
  ): string {
    const vehicle = vehicleContext.enhancedDescription;
    const greeting = leadName ? `Hi ${leadName}!` : 'Hello!';
    
    if (inventoryContext.similarVehicles.length > 0) {
      const topVehicle = inventoryContext.similarVehicles[0];
      return `${greeting} I'm ${salesperson} with Jason Pilger Chevrolet. Great news about the ${vehicle} you're interested in! We currently have a ${topVehicle.year} ${topVehicle.make} ${topVehicle.model} in stock. What specific features are most important to you in your next vehicle?`;
    }
    
    return `${greeting} I'm ${salesperson} with Jason Pilger Chevrolet. I see you're interested in a ${vehicle}. I'd love to help you explore your options and find the perfect match. What draws you to this particular vehicle?`;
  }

  private generateCategoryMessage(
    leadName: string, 
    vehicleContext: VehicleRecognitionResult, 
    inventoryContext: any, 
    salesperson: string
  ): string {
    const greeting = leadName ? `Hi ${leadName}!` : 'Hello!';
    const category = vehicleContext.extractedVehicle.category;
    const make = vehicleContext.extractedVehicle.make;
    
    if (category && inventoryContext.similarVehicles.length > 0) {
      return `${greeting} I'm ${salesperson} with Jason Pilger Chevrolet. I see you're looking for a ${category}. We have some excellent options available${make ? ` in ${make}` : ''} that might be perfect for you. What's your main priority - fuel efficiency, space, or performance?`;
    }
    
    if (make) {
      return `${greeting} I'm ${salesperson} with Jason Pilger Chevrolet. ${make.charAt(0).toUpperCase() + make.slice(1)} makes some fantastic vehicles! What type of driving do you do most - city, highway, or a mix of both?`;
    }
    
    return `${greeting} I'm ${salesperson} with Jason Pilger Chevrolet. I'd love to help you find the right vehicle for your needs. What type of vehicle fits your lifestyle best?`;
  }

  private generateInventoryDrivenMessage(
    leadName: string, 
    inventoryContext: any, 
    salesperson: string
  ): string {
    const greeting = leadName ? `Hi ${leadName}!` : 'Hello!';
    const vehicle = inventoryContext.similarVehicles[0];
    
    return `${greeting} I'm ${salesperson} with Jason Pilger Chevrolet. I wanted to reach out because we have some great vehicles available right now, including a ${vehicle.year} ${vehicle.make} ${vehicle.model} that's been popular with our customers. What type of vehicle would work best for your daily needs?`;
  }

  private generateExploratoryMessage(leadName: string, salesperson: string): string {
    const greeting = leadName ? `Hi ${leadName}!` : 'Hello!';
    
    return `${greeting} I'm ${salesperson} with Jason Pilger Chevrolet. I'm here to help you find the perfect vehicle for your needs. What's most important to you - reliability, fuel economy, space, or something else?`;
  }

  private generateSpecificFollowUps(vehicleContext: VehicleRecognitionResult): string[] {
    const vehicle = vehicleContext.extractedVehicle;
    const followUps = [];
    
    if (vehicle.category === 'truck') {
      followUps.push('What do you plan to use the truck for - work, personal, or both?');
      followUps.push('Do you need towing capability?');
    } else if (vehicle.category === 'suv') {
      followUps.push('How important is third-row seating for your family?');
      followUps.push('Are you looking for better fuel economy or more cargo space?');
    } else if (vehicle.category === 'sedan') {
      followUps.push('Are you most interested in fuel efficiency or performance?');
      followUps.push('Do you prefer a sportier feel or a more comfortable ride?');
    }
    
    followUps.push('What\'s your timeline for making a decision?');
    followUps.push('Are you planning to trade in your current vehicle?');
    
    return followUps.slice(0, 2);
  }

  private generateCategoryFollowUps(vehicleContext: VehicleRecognitionResult): string[] {
    return [
      'What size vehicle works best for your daily driving?',
      'Are there any specific features that are must-haves for you?',
      'What\'s your experience been with your current vehicle?'
    ];
  }

  private generateExploratoryFollowUps(): string[] {
    return [
      'What type of driving do you do most - city, highway, or mixed?',
      'How many people do you typically need to seat?',
      'Are you looking for something new or certified pre-owned?'
    ];
  }

  private formatName(name: string): string {
    if (!name || name.length < 2) return '';
    
    // Remove quotes and clean up
    const cleaned = name.replace(/['"]/g, '').trim();
    
    // Check if it looks like a real name
    if (cleaned.match(/^[a-zA-Z\s-']+$/) && cleaned.length < 30) {
      return cleaned.split(' ')[0]; // Use first name only
    }
    
    return '';
  }

  // Track successful vehicle conversations for learning
  async trackVehicleEngagement(leadId: string, vehicleContext: VehicleRecognitionResult, responseReceived: boolean) {
    try {
      // Convert VehicleRecognitionResult to a plain object for JSON compatibility
      const vehicleContextForDb = {
        confidence: vehicleContext.confidence,
        extractedVehicle: vehicleContext.extractedVehicle,
        enhancedDescription: vehicleContext.enhancedDescription,
        recognizedTerms: vehicleContext.recognizedTerms,
        suggestions: vehicleContext.suggestions
      };

      await supabase
        .from('ai_learning_outcomes')
        .insert({
          lead_id: leadId,
          outcome_type: responseReceived ? 'vehicle_engagement_success' : 'vehicle_engagement_attempt',
          lead_characteristics: {
            vehicle_recognition: vehicleContextForDb,
            vehicle_confidence: vehicleContext.confidence,
            vehicle_strategy: responseReceived ? 'successful' : 'attempted'
          },
          conversation_quality_score: vehicleContext.confidence
        });
    } catch (error) {
      console.error('❌ [VEHICLE PERSONALIZATION] Error tracking engagement:', error);
    }
  }
}

export const vehiclePersonalizationService = new VehiclePersonalizationService();
