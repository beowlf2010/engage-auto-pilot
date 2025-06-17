
import { supabase } from "@/integrations/supabase/client";
import { extractGMGlobalFields } from "@/utils/field-extraction/gmGlobalEnhanced";

export const fixGMGlobalVehicleRecord = async (stockNumber: string) => {
  console.log('Fixing GM Global vehicle record:', stockNumber);
  
  // Get the current record
  const { data: vehicle, error } = await supabase
    .from('inventory')
    .select('*')
    .eq('stock_number', stockNumber)
    .single();
    
  if (error || !vehicle) {
    throw new Error(`Vehicle not found: ${stockNumber}`);
  }
  
  console.log('Current vehicle data:', vehicle);
  
  // If we have the full_option_blob, re-extract the fields correctly
  if (vehicle.full_option_blob && typeof vehicle.full_option_blob === 'object') {
    console.log('Re-extracting fields from full_option_blob...');
    const correctedFields = extractGMGlobalFields(vehicle.full_option_blob as Record<string, any>);
    
    console.log('Corrected fields:', correctedFields);
    
    // Update the record with corrected fields
    const { data: updatedVehicle, error: updateError } = await supabase
      .from('inventory')
      .update({
        year: correctedFields.year,
        make: correctedFields.make,
        model: correctedFields.model,
        trim: correctedFields.trim,
        body_style: correctedFields.body_style,
        color_exterior: correctedFields.color_exterior,
        color_interior: correctedFields.color_interior,
        updated_at: new Date().toISOString()
      })
      .eq('stock_number', stockNumber)
      .select()
      .single();
      
    if (updateError) {
      throw new Error(`Failed to update vehicle: ${updateError.message}`);
    }
    
    console.log('Successfully updated vehicle:', updatedVehicle);
    return updatedVehicle;
  } else {
    throw new Error('No full_option_blob data available for re-extraction');
  }
};

export const fixAllGMGlobalRecords = async () => {
  console.log('Fixing all GM Global vehicle records...');
  
  // Get all GM Global records that need fixing
  const { data: vehicles, error } = await supabase
    .from('inventory')
    .select('*')
    .eq('source_report', 'orders_all')
    .not('full_option_blob', 'is', null);
    
  if (error) {
    throw new Error(`Failed to fetch GM Global records: ${error.message}`);
  }
  
  console.log(`Found ${vehicles.length} GM Global records to fix`);
  
  const results = [];
  for (const vehicle of vehicles) {
    try {
      if (vehicle.full_option_blob && typeof vehicle.full_option_blob === 'object') {
        const correctedFields = extractGMGlobalFields(vehicle.full_option_blob as Record<string, any>);
        
        const { data: updatedVehicle, error: updateError } = await supabase
          .from('inventory')
          .update({
            year: correctedFields.year,
            make: correctedFields.make,
            model: correctedFields.model,
            trim: correctedFields.trim,
            body_style: correctedFields.body_style,
            color_exterior: correctedFields.color_exterior,
            color_interior: correctedFields.color_interior,
            updated_at: new Date().toISOString()
          })
          .eq('id', vehicle.id)
          .select()
          .single();
          
        if (updateError) {
          console.error(`Failed to update vehicle ${vehicle.stock_number}:`, updateError);
          results.push({ success: false, vehicle: vehicle.stock_number, error: updateError.message });
        } else {
          console.log(`Successfully updated vehicle ${vehicle.stock_number}`);
          results.push({ success: true, vehicle: vehicle.stock_number, updated: updatedVehicle });
        }
      }
    } catch (error) {
      console.error(`Error processing vehicle ${vehicle.stock_number}:`, error);
      results.push({ success: false, vehicle: vehicle.stock_number, error: error.message });
    }
  }
  
  return results;
};
