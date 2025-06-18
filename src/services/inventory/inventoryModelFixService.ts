
import { supabase } from "@/integrations/supabase/client";
import { extractModelFromGMData } from "./gmModelCodeLookupService";

export interface ModelFixResult {
  success: boolean;
  vehicleId: string;
  stockNumber?: string;
  oldModel: string;
  newModel: string;
  error?: string;
}

export const fixSingleVehicleModel = async (vehicleId: string): Promise<ModelFixResult> => {
  console.log('Fixing model for vehicle:', vehicleId);
  
  try {
    // Get the current record
    const { data: vehicle, error } = await supabase
      .from('inventory')
      .select('*')
      .eq('id', vehicleId)
      .single();
      
    if (error || !vehicle) {
      return {
        success: false,
        vehicleId,
        oldModel: 'Unknown',
        newModel: 'Unknown',
        error: `Vehicle not found: ${vehicleId}`
      };
    }
    
    console.log('Current vehicle data:', vehicle);
    
    // If we have the full_option_blob, extract the correct model
    if (vehicle.full_option_blob && typeof vehicle.full_option_blob === 'object') {
      console.log('Extracting model from full_option_blob...');
      const correctedModel = extractModelFromGMData(vehicle.full_option_blob as Record<string, any>);
      
      console.log('Extracted model:', correctedModel);
      
      // Only update if we found a better model name
      if (correctedModel && correctedModel !== 'Unknown' && correctedModel !== vehicle.model) {
        const { data: updatedVehicle, error: updateError } = await supabase
          .from('inventory')
          .update({
            model: correctedModel,
            updated_at: new Date().toISOString()
          })
          .eq('id', vehicleId)
          .select()
          .single();
          
        if (updateError) {
          return {
            success: false,
            vehicleId,
            stockNumber: vehicle.stock_number,
            oldModel: vehicle.model,
            newModel: correctedModel,
            error: `Failed to update vehicle: ${updateError.message}`
          };
        }
        
        console.log('Successfully updated vehicle model:', updatedVehicle);
        return {
          success: true,
          vehicleId,
          stockNumber: vehicle.stock_number,
          oldModel: vehicle.model,
          newModel: correctedModel
        };
      } else {
        return {
          success: false,
          vehicleId,
          stockNumber: vehicle.stock_number,
          oldModel: vehicle.model,
          newModel: correctedModel,
          error: 'No better model name found or model already correct'
        };
      }
    } else {
      return {
        success: false,
        vehicleId,
        stockNumber: vehicle.stock_number,
        oldModel: vehicle.model,
        newModel: 'Unknown',
        error: 'No full_option_blob data available for model extraction'
      };
    }
  } catch (error) {
    return {
      success: false,
      vehicleId,
      oldModel: 'Unknown',
      newModel: 'Unknown',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

export const fixAllInventoryModels = async (): Promise<ModelFixResult[]> => {
  console.log('Fixing models for all inventory records...');
  
  try {
    // Get all records that have Unknown model or might need fixing
    const { data: vehicles, error } = await supabase
      .from('inventory')
      .select('*')
      .or('model.eq.Unknown,model.is.null')
      .not('full_option_blob', 'is', null);
      
    if (error) {
      throw new Error(`Failed to fetch inventory records: ${error.message}`);
    }
    
    console.log(`Found ${vehicles.length} inventory records to fix`);
    
    const results: ModelFixResult[] = [];
    for (const vehicle of vehicles) {
      const result = await fixSingleVehicleModel(vehicle.id);
      results.push(result);
      
      // Add a small delay to avoid overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return results;
  } catch (error) {
    console.error('Error fixing inventory models:', error);
    return [{
      success: false,
      vehicleId: 'batch',
      oldModel: 'Unknown',
      newModel: 'Unknown',
      error: error instanceof Error ? error.message : 'Unknown error'
    }];
  }
};

export const fixInventoryModelsForMake = async (make: string): Promise<ModelFixResult[]> => {
  console.log(`Fixing models for ${make} vehicles...`);
  
  try {
    // Get all records for specific make that might need fixing
    const { data: vehicles, error } = await supabase
      .from('inventory')
      .select('*')
      .eq('make', make)
      .or('model.eq.Unknown,model.is.null')
      .not('full_option_blob', 'is', null);
      
    if (error) {
      throw new Error(`Failed to fetch ${make} inventory records: ${error.message}`);
    }
    
    console.log(`Found ${vehicles.length} ${make} inventory records to fix`);
    
    const results: ModelFixResult[] = [];
    for (const vehicle of vehicles) {
      const result = await fixSingleVehicleModel(vehicle.id);
      results.push(result);
      
      // Add a small delay to avoid overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return results;
  } catch (error) {
    console.error(`Error fixing ${make} inventory models:`, error);
    return [{
      success: false,
      vehicleId: 'batch',
      oldModel: 'Unknown',
      newModel: 'Unknown',
      error: error instanceof Error ? error.message : 'Unknown error'
    }];
  }
};
