import { supabase } from '@/integrations/supabase/client';

export interface LeadPriorityFactors {
  temperature: number;
  engagement_score: number;
  days_since_last_contact: number;
  response_rate: number;
  source_priority: number;
  urgency_indicators: string[];
  call_history_score: number;
}

export interface PrioritizedLead {
  id: string;
  first_name: string;
  last_name: string;
  primary_phone: string;
  priority_score: number;
  temperature: number;
  urgency_reason: string;
  estimated_best_call_time?: Date;
  compliance_status: 'compliant' | 'non_compliant' | 'unknown';
  last_contact_attempt?: Date;
}

// Overloaded function signatures
export async function calculateLeadPriority(leadId: string): Promise<number>;
export async function calculateLeadPriority(leadIds: string[]): Promise<PrioritizedLead[]>;
export async function calculateLeadPriority(leadIdInput: string | string[]): Promise<number | PrioritizedLead[]> {
  const isArray = Array.isArray(leadIdInput);
  const leadIds = isArray ? leadIdInput : [leadIdInput];
  
  try {
    const { data: leads, error } = await supabase
      .from('leads')
      .select(`
        id, first_name, last_name, status, created_at, updated_at, last_reply_at,
        source, vehicle_interest, lead_temperature, call_priority, last_call_attempt,
        phone_numbers!inner(number, is_primary)
      `)
      .in('id', leadIds);

    if (error) throw error;

    const prioritizedLeads: PrioritizedLead[] = [];

    for (const lead of leads || []) {
      const primaryPhone = lead.phone_numbers?.find(p => p.is_primary)?.number || 
                          lead.phone_numbers?.[0]?.number || '';
      
      const temperature = lead.lead_temperature || 50;
      const daysSinceCreated = Math.floor((new Date().getTime() - new Date(lead.created_at).getTime()) / (1000 * 60 * 60 * 24));
      const daysSinceLastReply = lead.last_reply_at 
        ? Math.floor((new Date().getTime() - new Date(lead.last_reply_at).getTime()) / (1000 * 60 * 60 * 24))
        : 999;
      
      // Calculate priority score (0-100)
      let priorityScore = temperature; // Base on lead temperature
      
      // Adjust for recency of creation (newer leads get priority)
      if (daysSinceCreated <= 1) priorityScore += 15;
      else if (daysSinceCreated <= 3) priorityScore += 10;
      else if (daysSinceCreated <= 7) priorityScore += 5;
      else if (daysSinceCreated > 30) priorityScore -= 10;
      
      // Adjust for response history
      if (daysSinceLastReply <= 1) priorityScore += 20;
      else if (daysSinceLastReply <= 3) priorityScore += 10;
      else if (daysSinceLastReply > 14) priorityScore -= 15;
      
      // Source-based adjustments
      const sourcePriority = getSourcePriority(lead.source || '');
      priorityScore += sourcePriority;
      
      // Status-based adjustments
      if (lead.status === 'hot') priorityScore += 20;
      else if (lead.status === 'warm') priorityScore += 10;
      else if (lead.status === 'cold') priorityScore -= 5;
      
      // Ensure score is within bounds
      priorityScore = Math.max(0, Math.min(100, priorityScore));
      
      const urgencyReason = determineUrgencyReason(temperature, daysSinceCreated, daysSinceLastReply, lead.source);
      
      prioritizedLeads.push({
        id: lead.id,
        first_name: lead.first_name || '',
        last_name: lead.last_name || '',
        primary_phone: primaryPhone,
        priority_score: priorityScore,
        temperature: temperature,
        urgency_reason: urgencyReason,
        compliance_status: 'unknown',
        last_contact_attempt: lead.last_call_attempt ? new Date(lead.last_call_attempt) : undefined
      });
    }

    // Sort by priority score descending
    prioritizedLeads.sort((a, b) => b.priority_score - a.priority_score);
    
    return isArray ? prioritizedLeads : prioritizedLeads[0]?.priority_score || 0;
  } catch (error) {
    console.error('Error calculating lead priority:', error);
    return isArray ? [] : 0;
  }
}

const getSourcePriority = (source: string): number => {
  const sourceLower = source.toLowerCase();
  
  if (sourceLower.includes('referral')) return 15;
  if (sourceLower.includes('website') || sourceLower.includes('dealer')) return 10;
  if (sourceLower.includes('autotrader') || sourceLower.includes('cars.com')) return 8;
  if (sourceLower.includes('facebook') || sourceLower.includes('google')) return 5;
  if (sourceLower.includes('phone') || sourceLower.includes('call')) return 12;
  
  return 0; // Default for unknown sources
};

const determineUrgencyReason = (temperature: number, daysSinceCreated: number, daysSinceLastReply: number, source?: string): string => {
  if (temperature >= 80) return 'High lead temperature';
  if (daysSinceCreated <= 1) return 'New lead - immediate attention needed';
  if (daysSinceLastReply <= 1) return 'Recent response - hot prospect';
  if (source?.toLowerCase().includes('referral')) return 'Referral lead - high value';
  if (daysSinceCreated <= 3) return 'Fresh lead - good timing';
  if (daysSinceLastReply <= 7) return 'Active conversation';
  
  return 'Standard follow-up';
};

// Legacy function for backward compatibility
export const prioritizeLeadsForCalling = async (limit: number = 20): Promise<PrioritizedLead[]> => {
  try {
    const { data: leads, error } = await supabase
      .from('leads')
      .select(`
        id, first_name, last_name, status, created_at, updated_at, last_reply_at,
        source, vehicle_interest, lead_temperature, call_priority, last_call_attempt,
        phone_numbers!inner(number, is_primary)
      `)
      .eq('do_not_call', false)
      .not('phone_numbers', 'is', null)
      .limit(limit)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const leadIds = leads?.map(lead => lead.id) || [];
    return await calculateLeadPriority(leadIds) as PrioritizedLead[];
  } catch (error) {
    console.error('Error prioritizing leads for calling:', error);
    return [];
  }
};

// Utility function to update lead temperature in the database
export const updateLeadTemperature = async (leadId: string, newTemperature: number): Promise<boolean> => {
  try {
    const clampedTemperature = Math.max(0, Math.min(100, newTemperature));
    
    const { error } = await supabase
      .from('leads')
      .update({
        lead_temperature: clampedTemperature,
        temperature_last_updated: new Date().toISOString()
      })
      .eq('id', leadId);

    if (error) {
      console.error('Error updating lead temperature:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error updating lead temperature:', error);
    return false;
  }
};

// Function to get leads due for temperature recalculation
export const getLeadsDueForTemperatureUpdate = async (): Promise<string[]> => {
  try {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    const { data: leads, error } = await supabase
      .from('leads')
      .select('id')
      .or(`temperature_last_updated.is.null,temperature_last_updated.lt.${oneDayAgo}`)
      .limit(100);

    if (error) throw error;

    return leads?.map(lead => lead.id) || [];
  } catch (error) {
    console.error('Error getting leads due for temperature update:', error);
    return [];
  }
};