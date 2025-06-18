
import { supabase } from '@/integrations/supabase/client';
import { VehicleMention } from './types';
import { extractVehicleFromText } from './vehicleExtraction';

// Track a vehicle mention
export const trackVehicleMention = async (
  leadId: string,
  conversationId: string | null,
  mentionedVehicle: string,
  contextType: VehicleMention['context_type'],
  aiResponseNotes?: string,
  inventoryAvailable: boolean = false
) => {
  try {
    // Extract vehicle details
    const extracted = extractVehicleFromText(mentionedVehicle);
    const vehicleDetails = extracted.length > 0 ? extracted[0] : null;
    
    const { data, error } = await supabase
      .from('lead_vehicle_mentions')
      .insert({
        lead_id: leadId,
        conversation_id: conversationId,
        mentioned_vehicle: mentionedVehicle,
        vehicle_year: vehicleDetails?.year,
        vehicle_make: vehicleDetails?.make,
        vehicle_model: vehicleDetails?.model,
        context_type: contextType,
        ai_response_notes: aiResponseNotes,
        inventory_available: inventoryAvailable
      })
      .select()
      .single();

    if (error) {
      console.error('Error tracking vehicle mention:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in trackVehicleMention:', error);
    return null;
  }
};

// Update lead vehicle interest based on latest mention
export const updateLeadVehicleInterest = async (
  leadId: string, 
  vehicleInterest: string,
  year?: number,
  make?: string,
  model?: string
) => {
  try {
    const updates: any = {
      vehicle_interest: vehicleInterest,
      updated_at: new Date().toISOString()
    };

    if (year) updates.vehicle_year = year.toString();
    if (make) updates.vehicle_make = make;
    if (model) updates.vehicle_model = model;

    const { error } = await supabase
      .from('leads')
      .update(updates)
      .eq('id', leadId);

    if (error) {
      console.error('Error updating lead vehicle interest:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in updateLeadVehicleInterest:', error);
    return false;
  }
};

// Get vehicle mentions for a lead
export const getLeadVehicleMentions = async (leadId: string) => {
  try {
    const { data, error } = await supabase
      .from('lead_vehicle_mentions')
      .select('*')
      .eq('lead_id', leadId)
      .order('mentioned_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error fetching vehicle mentions:', error);
      return [];
    }

    return data as VehicleMention[];
  } catch (error) {
    console.error('Error in getLeadVehicleMentions:', error);
    return [];
  }
};
