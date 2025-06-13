
import { supabase } from '@/integrations/supabase/client';

export interface BehavioralTrigger {
  id: string;
  lead_id: string;
  trigger_type: 'website_visit' | 'price_drop' | 'new_inventory' | 'abandoned_quote' | 'email_open' | 'call_missed';
  trigger_data: any;
  trigger_time: string;
  is_processed: boolean;
  message_sent?: boolean;
}

// Create a behavioral trigger
export const createBehavioralTrigger = async (
  leadId: string, 
  triggerType: string, 
  triggerData: any
): Promise<void> => {
  try {
    const { error } = await supabase
      .from('lead_behavior_triggers')
      .insert({
        lead_id: leadId,
        trigger_type: triggerType,
        trigger_data: triggerData,
        trigger_time: new Date().toISOString(),
        is_processed: false
      });

    if (error) {
      console.error('Error creating behavioral trigger:', error);
      throw error;
    }

    console.log(`Created behavioral trigger: ${triggerType} for lead ${leadId}`);
  } catch (error) {
    console.error('Error creating behavioral trigger:', error);
  }
};

// Track website visit
export const trackWebsiteVisit = async (leadId: string, pageUrl: string, duration: number): Promise<void> => {
  await createBehavioralTrigger(leadId, 'website_visit', {
    page_url: pageUrl,
    duration_seconds: duration,
    timestamp: new Date().toISOString()
  });
};

// Track price drop interest
export const trackPriceDrop = async (leadId: string, vehicleId: string, oldPrice: number, newPrice: number): Promise<void> => {
  await createBehavioralTrigger(leadId, 'price_drop', {
    vehicle_id: vehicleId,
    old_price: oldPrice,
    new_price: newPrice,
    savings: oldPrice - newPrice
  });
};

// Track new inventory match
export const trackNewInventoryMatch = async (leadId: string, vehicleId: string, matchScore: number): Promise<void> => {
  await createBehavioralTrigger(leadId, 'new_inventory', {
    vehicle_id: vehicleId,
    match_score: matchScore,
    alert_reason: 'new_arrival'
  });
};

// Track abandoned quote/financing
export const trackAbandonedQuote = async (leadId: string, quoteData: any): Promise<void> => {
  await createBehavioralTrigger(leadId, 'abandoned_quote', {
    quote_amount: quoteData.amount,
    financing_term: quoteData.term,
    monthly_payment: quoteData.payment,
    abandoned_at: new Date().toISOString()
  });
};

// Get pending triggers for processing
export const getPendingTriggers = async (): Promise<BehavioralTrigger[]> => {
  try {
    const { data, error } = await supabase
      .from('lead_behavior_triggers')
      .select(`
        *,
        leads(first_name, last_name, phone, ai_opt_in, ai_sequence_paused)
      `)
      .eq('is_processed', false)
      .lte('trigger_time', new Date().toISOString())
      .order('trigger_time', { ascending: true });

    if (error) {
      console.error('Error fetching pending triggers:', error);
      return [];
    }
    return data || [];
  } catch (error) {
    console.error('Error fetching pending triggers:', error);
    return [];
  }
};

// Update lead response patterns based on behavior
export const updateResponsePatterns = async (leadId: string, behaviorData: any): Promise<void> => {
  try {
    const { data: existing } = await supabase
      .from('lead_response_patterns')
      .select('*')
      .eq('lead_id', leadId)
      .single();

    const responseHour = new Date().getHours();
    const responseDay = new Date().getDay();

    if (existing && !('error' in existing)) {
      // Update existing patterns
      const updatedHours = [...(existing.best_response_hours || []), responseHour].slice(-10);
      const updatedDays = [...(existing.best_response_days || []), responseDay].slice(-10);
      
      await supabase
        .from('lead_response_patterns')
        .update({
          best_response_hours: updatedHours,
          best_response_days: updatedDays,
          total_responses: existing.total_responses + 1,
          last_response_at: new Date().toISOString()
        })
        .eq('lead_id', leadId);
    } else {
      // Create new pattern
      await supabase
        .from('lead_response_patterns')
        .insert({
          lead_id: leadId,
          best_response_hours: [responseHour],
          best_response_days: [responseDay],
          total_responses: 1,
          avg_response_time_hours: 24,
          last_response_at: new Date().toISOString()
        });
    }
  } catch (error) {
    console.error('Error updating response patterns:', error);
  }
};

// Get lead behavioral insights
export const getLeadBehavioralInsights = async (leadId: string) => {
  try {
    const { data: triggers } = await supabase
      .from('lead_behavior_triggers')
      .select('*')
      .eq('lead_id', leadId)
      .order('trigger_time', { ascending: false })
      .limit(20);

    const { data: patterns } = await supabase
      .from('lead_response_patterns')
      .select('*')
      .eq('lead_id', leadId)
      .single();

    const { data: memory } = await supabase
      .from('conversation_memory')
      .select('*')
      .eq('lead_id', leadId)
      .order('confidence', { ascending: false })
      .limit(10);

    return {
      recentTriggers: triggers || [],
      responsePatterns: patterns && !('error' in patterns) ? patterns : null,
      conversationMemory: memory || [],
      behaviorScore: calculateBehaviorScore(triggers || [], patterns && !('error' in patterns) ? patterns : null)
    };
  } catch (error) {
    console.error('Error getting behavioral insights:', error);
    return null;
  }
};

// Calculate lead behavior engagement score
const calculateBehaviorScore = (triggers: any[], patterns: any): number => {
  let score = 50; // Base score

  // Recent activity increases score
  const recentTriggers = triggers.filter(t => 
    new Date(t.trigger_time) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  );
  score += recentTriggers.length * 10;

  // Response patterns affect score
  if (patterns) {
    if (patterns.total_responses > 3) score += 20;
    if (patterns.avg_response_time_hours < 4) score += 15;
  }

  // Website visits are high engagement
  const websiteVisits = triggers.filter(t => t.trigger_type === 'website_visit');
  score += websiteVisits.length * 5;

  return Math.min(100, Math.max(0, score));
};

// Smart message timing based on patterns
export const getOptimalMessageTime = async (leadId: string): Promise<Date> => {
  try {
    const { data: patterns } = await supabase
      .from('lead_response_patterns')
      .select('best_response_hours, best_response_days')
      .eq('lead_id', leadId)
      .single();

    const now = new Date();
    const currentHour = now.getHours();

    // Use patterns if available and valid
    if (patterns && !('error' in patterns) && patterns.best_response_hours?.length > 0) {
      const preferredHours = patterns.best_response_hours;
      const nextPreferredHour = preferredHours.find(h => h > currentHour) || preferredHours[0];
      
      const optimalTime = new Date(now);
      if (nextPreferredHour > currentHour) {
        optimalTime.setHours(nextPreferredHour, 0, 0, 0);
      } else {
        optimalTime.setDate(optimalTime.getDate() + 1);
        optimalTime.setHours(nextPreferredHour, 0, 0, 0);
      }
      
      return optimalTime;
    }

    // Default to business hours (9 AM - 6 PM)
    const defaultHours = [9, 11, 14, 16];
    const nextHour = defaultHours.find(h => h > currentHour) || defaultHours[0];
    
    const defaultTime = new Date(now);
    if (nextHour > currentHour) {
      defaultTime.setHours(nextHour, 0, 0, 0);
    } else {
      defaultTime.setDate(defaultTime.getDate() + 1);
      defaultTime.setHours(nextHour, 0, 0, 0);
    }
    
    return defaultTime;
  } catch (error) {
    console.error('Error calculating optimal message time:', error);
    // Fallback to 1 hour from now
    return new Date(Date.now() + 60 * 60 * 1000);
  }
};
