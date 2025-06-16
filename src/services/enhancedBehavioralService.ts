
import { supabase } from '@/integrations/supabase/client';
import { generatePersonalizedMessage } from './personalizationService';

export interface EnhancedBehavioralTrigger {
  id: string;
  lead_id: string;
  trigger_type: 'website_visit' | 'email_open' | 'link_click' | 'page_view' | 'search_activity' | 'price_alert' | 'inventory_match';
  trigger_data: any;
  trigger_score: number;
  urgency_level: 'low' | 'medium' | 'high' | 'critical';
  created_at: string;
  processed: boolean;
}

export interface WebsiteActivity {
  lead_id: string;
  page_url: string;
  page_type: 'vehicle_detail' | 'inventory_list' | 'financing' | 'contact' | 'homepage';
  time_spent: number;
  actions_taken: string[];
  timestamp: string;
}

// Track enhanced website activity
export const trackWebsiteActivity = async (activity: WebsiteActivity): Promise<void> => {
  try {
    // Store the activity
    await supabase
      .from('website_activities')
      .insert({
        lead_id: activity.lead_id,
        page_url: activity.page_url,
        page_type: activity.page_type,
        time_spent: activity.time_spent,
        actions_taken: activity.actions_taken,
        timestamp: activity.timestamp
      });

    // Calculate trigger score based on activity
    const triggerScore = calculateActivityScore(activity);
    
    if (triggerScore >= 30) {
      await createEnhancedTrigger({
        lead_id: activity.lead_id,
        trigger_type: 'website_visit',
        trigger_data: activity,
        trigger_score: triggerScore,
        urgency_level: getUrgencyLevel(triggerScore)
      });
    }
  } catch (error) {
    console.error('Error tracking website activity:', error);
  }
};

// Track email engagement
export const trackEmailEngagement = async (leadId: string, emailId: string, engagementType: 'open' | 'click', metadata?: any): Promise<void> => {
  try {
    const triggerScore = engagementType === 'open' ? 15 : 25;
    
    await createEnhancedTrigger({
      lead_id: leadId,
      trigger_type: 'email_open',
      trigger_data: {
        email_id: emailId,
        engagement_type: engagementType,
        metadata: metadata || {},
        timestamp: new Date().toISOString()
      },
      trigger_score: triggerScore,
      urgency_level: getUrgencyLevel(triggerScore)
    });
  } catch (error) {
    console.error('Error tracking email engagement:', error);
  }
};

// Create enhanced behavioral trigger
const createEnhancedTrigger = async (trigger: Omit<EnhancedBehavioralTrigger, 'id' | 'created_at' | 'processed'>): Promise<void> => {
  try {
    await supabase
      .from('enhanced_behavioral_triggers')
      .insert({
        ...trigger,
        created_at: new Date().toISOString(),
        processed: false
      });

    console.log(`Created enhanced trigger: ${trigger.trigger_type} for lead ${trigger.lead_id} with score ${trigger.trigger_score}`);
  } catch (error) {
    console.error('Error creating enhanced trigger:', error);
  }
};

// Calculate activity score based on behavior
const calculateActivityScore = (activity: WebsiteActivity): number => {
  let score = 0;

  // Base score for page type
  switch (activity.page_type) {
    case 'vehicle_detail':
      score += 30;
      break;
    case 'financing':
      score += 25;
      break;
    case 'inventory_list':
      score += 20;
      break;
    case 'contact':
      score += 35;
      break;
    default:
      score += 10;
  }

  // Time spent bonus
  if (activity.time_spent > 60) score += 15; // More than 1 minute
  if (activity.time_spent > 180) score += 25; // More than 3 minutes

  // Actions taken bonus
  score += activity.actions_taken.length * 10;

  return Math.min(100, score);
};

// Determine urgency level based on score
const getUrgencyLevel = (score: number): 'low' | 'medium' | 'high' | 'critical' => {
  if (score >= 80) return 'critical';
  if (score >= 60) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
};

// Process pending enhanced triggers
export const processPendingEnhancedTriggers = async (): Promise<void> => {
  try {
    const { data: triggers } = await supabase
      .from('enhanced_behavioral_triggers')
      .select('*')
      .eq('processed', false)
      .gte('trigger_score', 40) // Only process medium+ urgency
      .order('trigger_score', { ascending: false })
      .limit(10);

    for (const trigger of triggers || []) {
      try {
        // Generate personalized message based on trigger
        const message = await generatePersonalizedMessage(trigger.lead_id, {
          trigger_type: trigger.trigger_type,
          trigger_data: trigger.trigger_data,
          urgency_level: trigger.urgency_level
        });

        if (message) {
          // Store the generated message for review/sending
          await supabase
            .from('ai_trigger_messages')
            .insert({
              lead_id: trigger.lead_id,
              trigger_id: trigger.id,
              message_content: message,
              urgency_level: trigger.urgency_level,
              generated_at: new Date().toISOString(),
              approved: false
            });
        }

        // Mark trigger as processed
        await supabase
          .from('enhanced_behavioral_triggers')
          .update({ processed: true })
          .eq('id', trigger.id);

        console.log(`Processed enhanced trigger ${trigger.id} for lead ${trigger.lead_id}`);
      } catch (error) {
        console.error(`Error processing trigger ${trigger.id}:`, error);
      }
    }
  } catch (error) {
    console.error('Error processing enhanced triggers:', error);
  }
};

// Get lead behavioral insights
export const getLeadBehavioralInsights = async (leadId: string) => {
  try {
    // Get recent website activities
    const { data: activities } = await supabase
      .from('website_activities')
      .select('*')
      .eq('lead_id', leadId)
      .order('timestamp', { ascending: false })
      .limit(20);

    // Get enhanced triggers
    const { data: triggers } = await supabase
      .from('enhanced_behavioral_triggers')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false })
      .limit(10);

    // Calculate engagement score
    const engagementScore = calculateEngagementScore(activities || [], triggers || []);

    // Get activity patterns
    const activityPatterns = analyzeActivityPatterns(activities || []);

    return {
      recentActivities: activities || [],
      enhancedTriggers: triggers || [],
      engagementScore,
      activityPatterns,
      riskLevel: engagementScore < 30 ? 'high' : engagementScore < 60 ? 'medium' : 'low'
    };
  } catch (error) {
    console.error('Error getting behavioral insights:', error);
    return null;
  }
};

// Calculate overall engagement score
const calculateEngagementScore = (activities: any[], triggers: any[]): number => {
  let score = 0;

  // Recent activity bonus
  const recentActivities = activities.filter(a => 
    new Date(a.timestamp) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  );
  score += recentActivities.length * 10;

  // High-value page visits
  const highValuePages = activities.filter(a => 
    ['vehicle_detail', 'financing', 'contact'].includes(a.page_type)
  );
  score += highValuePages.length * 15;

  // Trigger quality
  const highUrgencyTriggers = triggers.filter(t => 
    ['high', 'critical'].includes(t.urgency_level)
  );
  score += highUrgencyTriggers.length * 20;

  return Math.min(100, score);
};

// Analyze activity patterns
const analyzeActivityPatterns = (activities: any[]) => {
  const patterns = {
    preferredPages: {} as Record<string, number>,
    activityTimes: [] as number[],
    sessionDurations: [] as number[],
    totalSessions: activities.length
  };

  activities.forEach(activity => {
    // Count page preferences
    patterns.preferredPages[activity.page_type] = 
      (patterns.preferredPages[activity.page_type] || 0) + 1;

    // Track activity times
    const hour = new Date(activity.timestamp).getHours();
    patterns.activityTimes.push(hour);

    // Track session durations
    patterns.sessionDurations.push(activity.time_spent);
  });

  return patterns;
};
