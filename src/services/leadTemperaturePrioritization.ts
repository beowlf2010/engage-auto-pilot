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

export const calculateLeadPriority = async (leadIds?: string[]): Promise<PrioritizedLead[]> => {
  try {
    let query = supabase
      .from('leads')
      .select(`
        id, first_name, last_name, phone, 
        last_reply_at, created_at, source, lead_source_name, 
        vehicle_interest, state, city, do_not_call,
        conversations(direction, sent_at)
      `);

    if (leadIds && leadIds.length > 0) {
      query = query.in('id', leadIds);
    } else {
      // Default: get active leads that might need calling
      query = query
        .eq('do_not_call', false)
        .in('status', ['new', 'contacted', 'engaged'])
        .limit(100);
    }

    const { data: leads, error } = await query;

    if (error) {
      console.error('Error fetching leads for prioritization:', error);
      return [];
    }

    if (!leads) return [];

    // Calculate priority for each lead
    const prioritizedLeads: PrioritizedLead[] = [];

    for (const lead of leads) {
      const factors = await calculatePriorityFactors(lead);
      const priorityScore = calculatePriorityScore(factors);
      
      prioritizedLeads.push({
        id: lead.id,
        first_name: lead.first_name,
        last_name: lead.last_name,
        primary_phone: lead.phone,
        priority_score: priorityScore,
        temperature: factors.temperature,
        urgency_reason: generateUrgencyReason(factors),
        compliance_status: lead.do_not_call ? 'non_compliant' : 'compliant',
        last_contact_attempt: getLastContactAttempt(lead.conversations)
      });
    }

    // Sort by priority score (highest first)
    return prioritizedLeads.sort((a, b) => b.priority_score - a.priority_score);

  } catch (error) {
    console.error('Error in calculateLeadPriority:', error);
    return [];
  }
};

const calculatePriorityFactors = async (lead: any): Promise<LeadPriorityFactors> => {
  const now = new Date();
  const conversations = lead.conversations || [];
  
  // Calculate temperature (use existing or calculate)
  const temperature = await calculateTemperatureScore(lead);
  
  // Calculate engagement score based on conversation activity
  const engagementScore = calculateEngagementScore(conversations, lead.created_at);
  
  // Days since last contact
  const lastContact = lead.last_reply_at ? new Date(lead.last_reply_at) : new Date(lead.created_at);
  const daysSinceLastContact = Math.floor((now.getTime() - lastContact.getTime()) / (1000 * 60 * 60 * 24));
  
  // Response rate calculation
  const outgoingMessages = conversations.filter((c: any) => c.direction === 'out').length;
  const incomingMessages = conversations.filter((c: any) => c.direction === 'in').length;
  const responseRate = outgoingMessages > 0 ? incomingMessages / outgoingMessages : 0;
  
  // Source priority (marketplace leads often need faster response)
  const sourcePriority = calculateSourcePriority(lead.source, lead.lead_source_name);
  
  // Urgency indicators
  const urgencyIndicators = identifyUrgencyIndicators(lead, daysSinceLastContact);
  
  // Call history score (placeholder - would need call_queue data)
  const callHistoryScore = 50; // Default neutral score

  return {
    temperature,
    engagement_score: engagementScore,
    days_since_last_contact: daysSinceLastContact,
    response_rate: responseRate,
    source_priority: sourcePriority,
    urgency_indicators: urgencyIndicators,
    call_history_score: callHistoryScore
  };
};

const calculateTemperatureScore = async (lead: any): Promise<number> => {
  try {
    const { data, error } = await supabase.rpc('calculate_lead_temperature', {
      p_lead_id: lead.id
    });

    if (error) {
      console.error('Error calculating temperature:', error);
      return 50; // Default neutral temperature
    }

    return typeof data === 'number' ? data : 50;
  } catch (error) {
    console.error('Error in calculateTemperatureScore:', error);
    return 50;
  }
};

const calculateEngagementScore = (conversations: any[], createdAt: string): number => {
  if (!conversations.length) return 0;

  const now = new Date();
  const leadAge = Math.floor((now.getTime() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24));
  const conversationCount = conversations.length;
  
  // Recent conversations get higher scores
  const recentConversations = conversations.filter(c => {
    const messageDate = new Date(c.sent_at);
    const daysAgo = Math.floor((now.getTime() - messageDate.getTime()) / (1000 * 60 * 60 * 24));
    return daysAgo <= 7;
  }).length;

  // Base score on conversation frequency and recency
  let score = Math.min(100, (conversationCount / Math.max(1, leadAge / 7)) * 20); // Conversations per week * 20
  score += recentConversations * 10; // Bonus for recent activity
  
  return Math.min(100, Math.round(score));
};

const calculateSourcePriority = (source?: string, leadSourceName?: string): number => {
  const sourceString = (source || leadSourceName || '').toLowerCase();
  
  // Marketplace leads - high priority (need fast response)
  if (sourceString.includes('autotrader') || sourceString.includes('cars.com') || 
      sourceString.includes('cargurus') || sourceString.includes('carmax')) {
    return 90;
  }
  
  // Phone inquiries - very high priority
  if (sourceString.includes('phone') || sourceString.includes('call')) {
    return 95;
  }
  
  // Website forms - high priority
  if (sourceString.includes('website') || sourceString.includes('form')) {
    return 80;
  }
  
  // GM/Finance leads - medium-high priority
  if (sourceString.includes('gm') || sourceString.includes('finance')) {
    return 70;
  }
  
  // Referrals - medium priority (already warmer)
  if (sourceString.includes('referral')) {
    return 60;
  }
  
  // Trade-in tools - medium priority
  if (sourceString.includes('trade')) {
    return 65;
  }
  
  // Default medium priority
  return 50;
};

const identifyUrgencyIndicators = (lead: any, daysSinceLastContact: number): string[] => {
  const indicators: string[] = [];
  
  // Time-based urgency
  if (daysSinceLastContact === 0) {
    indicators.push('New lead - immediate response needed');
  } else if (daysSinceLastContact === 1) {
    indicators.push('24-hour follow-up window');
  } else if (daysSinceLastContact >= 7) {
    indicators.push('Risk of lead going cold');
  }
  
  // Vehicle interest urgency
  const vehicleInterest = (lead.vehicle_interest || '').toLowerCase();
  if (vehicleInterest.includes('urgent') || vehicleInterest.includes('asap') || 
      vehicleInterest.includes('soon') || vehicleInterest.includes('immediate')) {
    indicators.push('Customer indicates urgency');
  }
  
  // Source-based urgency
  const source = (lead.source || lead.lead_source_name || '').toLowerCase();
  if (source.includes('phone') || source.includes('call')) {
    indicators.push('Inbound phone lead');
  }
  
  if (source.includes('autotrader') || source.includes('cars.com')) {
    indicators.push('Marketplace lead - competitive response needed');
  }
  
  return indicators;
};

const calculatePriorityScore = (factors: LeadPriorityFactors): number => {
  let score = 0;
  
  // Temperature score (0-100, higher = hotter)
  score += factors.temperature * 0.3;
  
  // Engagement score (0-100)
  score += factors.engagement_score * 0.2;
  
  // Source priority (0-100)
  score += factors.source_priority * 0.2;
  
  // Time urgency (inverse relationship with days since contact)
  const timeUrgency = Math.max(0, 100 - (factors.days_since_last_contact * 5));
  score += timeUrgency * 0.15;
  
  // Response rate bonus (0-100+ based on response ratio)
  score += Math.min(100, factors.response_rate * 100) * 0.1;
  
  // Urgency indicators bonus
  score += factors.urgency_indicators.length * 5;
  
  // Call history adjustment
  score += (factors.call_history_score - 50) * 0.05; // -2.5 to +2.5 adjustment
  
  return Math.min(100, Math.round(score));
};

const generateUrgencyReason = (factors: LeadPriorityFactors): string => {
  if (factors.urgency_indicators.length > 0) {
    return factors.urgency_indicators[0];
  }
  
  if (factors.temperature >= 80) {
    return 'Hot lead - high engagement';
  }
  
  if (factors.days_since_last_contact === 0) {
    return 'New lead requiring immediate attention';
  }
  
  if (factors.source_priority >= 90) {
    return 'High-priority lead source';
  }
  
  if (factors.engagement_score >= 70) {
    return 'Highly engaged prospect';
  }
  
  if (factors.days_since_last_contact >= 7) {
    return 'Follow-up needed to maintain engagement';
  }
  
  return 'Standard priority follow-up';
};

const getLastContactAttempt = (conversations: any[]): Date | undefined => {
  if (!conversations || conversations.length === 0) return undefined;
  
  const sortedConversations = conversations
    .sort((a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime());
  
  return new Date(sortedConversations[0].sent_at);
};

export const updateLeadTemperatureScores = async (): Promise<{ updated: number; errors: number }> => {
  try {
    const { data: leads, error } = await supabase
      .from('leads')
      .select('id')
      .eq('do_not_call', false)
      .in('status', ['new', 'contacted', 'engaged'])
      .limit(50); // Process in batches

    if (error) {
      console.error('Error fetching leads for temperature update:', error);
      return { updated: 0, errors: 1 };
    }

    let updated = 0;
    let errors = 0;

    for (const lead of leads || []) {
      try {
        const { data: temperature, error: tempError } = await supabase.rpc('calculate_lead_temperature', {
          p_lead_id: lead.id
        });

        if (tempError) {
          console.error('Error calculating temperature for lead:', lead.id, tempError);
          errors++;
          continue;
        }

        await supabase
          .from('leads')
          .update({ 
            // For now, just update the updated_at timestamp since lead_temperature field doesn't exist
            // In a full implementation, this would update the lead_temperature field
            updated_at: new Date().toISOString()
          })
          .eq('id', lead.id);

        updated++;
      } catch (error) {
        console.error('Error updating temperature for lead:', lead.id, error);
        errors++;
      }
    }

    return { updated, errors };
  } catch (error) {
    console.error('Error in updateLeadTemperatureScores:', error);
    return { updated: 0, errors: 1 };
  }
};