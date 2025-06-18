
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

export interface ExtractedVehicle {
  year?: number;
  make: string;
  model: string;
  fullText: string;
}
