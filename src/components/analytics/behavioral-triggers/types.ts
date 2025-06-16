
export interface BehavioralTrigger {
  id: string;
  lead_id: string;
  trigger_type: string;
  trigger_data: any;
  trigger_score: number;
  urgency_level: string;
  processed: boolean;
  created_at: string;
  leads?: {
    first_name: string;
    last_name: string;
    vehicle_interest: string;
  };
}

export interface TriggerStats {
  total: number;
  pending: number;
  processed: number;
  highUrgency: number;
}
