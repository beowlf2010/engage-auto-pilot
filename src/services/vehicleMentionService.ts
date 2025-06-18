
import { supabase } from '@/integrations/supabase/client';

export interface VehicleMention {
  id: string;
  lead_id: string;
  conversation_id?: string;
  mentioned_vehicle: string;
  vehicle_year?: number;
  vehicle_make?: string;
  vehicle_model?: string;
  context_type: 'inquiry' | 'showed_inventory' | 'suggested_alternative' | 'no_inventory';
  ai_response_notes?: string;
  inventory_available: boolean;
  mentioned_at: string;
  created_at: string;
}

export interface AIConversationNote {
  id: string;
  lead_id: string;
  conversation_id?: string;
  note_type: 'inventory_discussion' | 'vehicle_shown' | 'alternative_suggested' | 'follow_up_scheduled';
  note_content: string;
  vehicles_discussed: any[];
  created_at: string;
}

// Extract vehicle details from text using regex patterns
export const extractVehicleFromText = (text: string) => {
  // Pattern to match year, make, model (e.g., "2025 Cadillac Escalade")
  const vehiclePattern = /(?:(\d{4})\s+)?([A-Za-z]+)\s+([A-Za-z\s]+?)(?:\s|$|[,.!?])/g;
  
  const matches = [];
  let match;
  
  while ((match = vehiclePattern.exec(text)) !== null) {
    const year = match[1] ? parseInt(match[1]) : null;
    const make = match[2];
    const model = match[3].trim();
    
    // Validate year is reasonable for a vehicle
    if (year && (year < 1980 || year > new Date().getFullYear() + 2)) {
      continue;
    }
    
    // Check if make is a known car manufacturer
    const knownMakes = [
      'toyota', 'honda', 'ford', 'chevrolet', 'chevy', 'gmc', 'cadillac', 
      'bmw', 'mercedes', 'audi', 'lexus', 'acura', 'infiniti', 'nissan', 
      'hyundai', 'kia', 'volkswagen', 'subaru', 'mazda', 'jeep', 'ram',
      'dodge', 'chrysler', 'buick', 'lincoln', 'tesla', 'genesis'
    ];
    
    if (knownMakes.includes(make.toLowerCase())) {
      matches.push({
        year,
        make: make.charAt(0).toUpperCase() + make.slice(1).toLowerCase(),
        model: model.charAt(0).toUpperCase() + model.slice(1).toLowerCase(),
        fullText: `${year ? year + ' ' : ''}${make} ${model}`.trim()
      });
    }
  }
  
  return matches;
};

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

// Add AI conversation note
export const addAIConversationNote = async (
  leadId: string,
  conversationId: string | null,
  noteType: AIConversationNote['note_type'],
  noteContent: string,
  vehiclesDiscussed: any[] = []
) => {
  try {
    const { data, error } = await supabase
      .from('ai_conversation_notes')
      .insert({
        lead_id: leadId,
        conversation_id: conversationId,
        note_type: noteType,
        note_content: noteContent,
        vehicles_discussed: vehiclesDiscussed
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding AI conversation note:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in addAIConversationNote:', error);
    return null;
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

// Get AI conversation notes for a lead
export const getLeadAIConversationNotes = async (leadId: string) => {
  try {
    const { data, error } = await supabase
      .from('ai_conversation_notes')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error fetching AI conversation notes:', error);
      return [];
    }

    return data as AIConversationNote[];
  } catch (error) {
    console.error('Error in getLeadAIConversationNotes:', error);
    return [];
  }
};
