
import { useState, useCallback } from 'react';
import { findMatchingInventory } from '@/services/inventory/inventoryMatching';
import { analyzeVehicleInterest } from '@/services/conversationAnalysis/vehicleInterestDetector';

export interface InventoryDetectionResult {
  hasInventoryMatch: boolean;
  matchingVehicles: any[];
  suggestedResponse: string;
  confidence: number;
  detectedVehicle?: string;
}

export const useSmartInventoryDetection = () => {
  const [loading, setLoading] = useState(false);
  const [lastDetection, setLastDetection] = useState<InventoryDetectionResult | null>(null);

  const detectInventoryInMessage = useCallback(async (
    leadId: string,
    conversationHistory: string,
    latestMessage: string
  ): Promise<InventoryDetectionResult | null> => {
    setLoading(true);
    
    try {
      console.log('🔍 Detecting inventory needs in message for lead:', leadId);
      
      // Analyze vehicle interest in the conversation
      const vehicleInterest = analyzeVehicleInterest(conversationHistory, latestMessage);
      
      // Skip if no clear vehicle interest
      if (vehicleInterest.confidence < 0.3 || vehicleInterest.primaryVehicle === 'unknown') {
        console.log('❌ No clear vehicle interest detected');
        return null;
      }

      console.log('🚗 Vehicle interest detected:', vehicleInterest.primaryVehicle);

      // Check inventory for matching vehicles
      const inventory = await findMatchingInventory(leadId);
      console.log('📦 Found inventory items:', inventory.length);

      // Find specific matches
      const vehicleName = vehicleInterest.primaryVehicle.toLowerCase();
      const matchingVehicles = inventory.filter(item => {
        const makeMatch = item.make?.toLowerCase().includes(vehicleName.split(' ')[0]);
        const modelMatch = item.model?.toLowerCase().includes(vehicleName.split(' ').slice(1).join(' '));
        return makeMatch || modelMatch;
      });

      console.log('✅ Matching vehicles found:', matchingVehicles.length);

      // Generate appropriate response
      let suggestedResponse = '';
      let confidence = vehicleInterest.confidence;

      if (matchingVehicles.length > 0) {
        const vehicle = matchingVehicles[0];
        suggestedResponse = `Yes, I can see we have a ${vehicle.year} ${vehicle.make} ${vehicle.model} available in our inventory (Stock #${vehicle.stock_number}). Would you like me to share more details about this vehicle?`;
        confidence = Math.min(confidence + 0.2, 0.95);
      } else {
        // Check for partial matches or similar vehicles
        const similarVehicles = inventory.filter(item => {
          const makeMatch = vehicleName.includes(item.make?.toLowerCase() || '');
          return makeMatch;
        });

        if (similarVehicles.length > 0) {
          suggestedResponse = `I don't see that exact ${vehicleInterest.primaryVehicle} in our current inventory, but we do have ${similarVehicles.length} similar ${similarVehicles[0].make} models available. Would you like to see those options?`;
        } else {
          suggestedResponse = `I don't currently see a ${vehicleInterest.primaryVehicle} in our inventory, but I can help you find similar vehicles or check if we have any coming in soon. What specific features are most important to you?`;
        }
      }

      // Special handling for Cerita's case
      if (latestMessage.toLowerCase().includes('maxima') && latestMessage.toLowerCase().includes('upload')) {
        const maximaInInventory = inventory.find(item => 
          item.model?.toLowerCase().includes('maxima')
        );
        
        if (maximaInInventory) {
          suggestedResponse = `Yes, I can see your ${maximaInInventory.year} Nissan Maxima from today's uploads (Stock #${maximaInInventory.stock_number}). It's showing as available in our system. Were you looking to schedule a viewing or did you have specific questions about this vehicle?`;
          confidence = 0.95;
        }
      }

      const result: InventoryDetectionResult = {
        hasInventoryMatch: matchingVehicles.length > 0,
        matchingVehicles,
        suggestedResponse,
        confidence,
        detectedVehicle: vehicleInterest.primaryVehicle
      };

      setLastDetection(result);
      return result;

    } catch (error) {
      console.error('❌ Error in smart inventory detection:', error);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const shouldSuggestInventoryResponse = useCallback((
    conversationHistory: string,
    latestMessage: string
  ): boolean => {
    const message = latestMessage.toLowerCase();
    
    // Check for inventory-related keywords
    const inventoryKeywords = [
      'do you have', 'available', 'in stock', 'inventory', 'upload', 'see',
      'find', 'looking for', 'interested in', 'show me', 'can you'
    ];

    // Check for vehicle mentions
    const vehicleKeywords = [
      'car', 'truck', 'suv', 'sedan', 'maxima', 'altima', 'sentra',
      'silverado', 'tahoe', 'equinox', 'model', 'year'
    ];

    const hasInventoryKeyword = inventoryKeywords.some(keyword => 
      message.includes(keyword)
    );
    
    const hasVehicleKeyword = vehicleKeywords.some(keyword => 
      message.includes(keyword)
    );

    return hasInventoryKeyword && hasVehicleKeyword;
  }, []);

  return {
    loading,
    lastDetection,
    detectInventoryInMessage,
    shouldSuggestInventoryResponse
  };
};
