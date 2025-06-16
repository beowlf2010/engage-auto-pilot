
import { supabase } from '@/integrations/supabase/client';

export interface LeadPersonality {
  id: string;
  lead_id: string;
  communication_style: 'formal' | 'casual' | 'enthusiastic' | 'direct';
  response_preference: 'immediate' | 'considered' | 'research_oriented';
  interest_level: 'high' | 'medium' | 'low';
  price_sensitivity: 'high' | 'medium' | 'low';
  decision_speed: 'fast' | 'moderate' | 'slow';
  preferred_contact_method: 'sms' | 'email' | 'phone';
  personality_score: number;
  last_updated: string;
}

export interface ContactTiming {
  lead_id: string;
  best_contact_hours: number[];
  best_contact_days: number[];
  timezone: string;
  response_delay_pattern: number;
  last_optimal_contact: string;
}

// Analyze lead personality from conversation patterns
export const analyzeLeadPersonality = async (leadId: string): Promise<LeadPersonality | null> => {
  try {
    // Get conversation history
    const { data: conversations } = await supabase
      .from('conversations')
      .select('body, direction, sent_at')
      .eq('lead_id', leadId)
      .eq('direction', 'in')
      .order('sent_at', { ascending: false })
      .limit(20);

    if (!conversations || conversations.length === 0) {
      return null;
    }

    // Analyze communication patterns
    const analysis = analyzeConversationPatterns(conversations);
    
    // Check if personality exists, otherwise create new
    const { data: existing } = await supabase
      .from('lead_personalities')
      .select('*')
      .eq('lead_id', leadId)
      .maybeSingle();

    const personalityData = {
      lead_id: leadId,
      communication_style: analysis.communicationStyle,
      response_preference: analysis.responsePreference,
      interest_level: analysis.interestLevel,
      price_sensitivity: analysis.priceSensitivity,
      decision_speed: analysis.decisionSpeed,
      preferred_contact_method: analysis.preferredMethod,
      personality_score: analysis.overallScore,
      last_updated: new Date().toISOString()
    };

    if (existing) {
      const { data } = await supabase
        .from('lead_personalities')
        .update(personalityData)
        .eq('lead_id', leadId)
        .select()
        .single();
      return data;
    } else {
      const { data } = await supabase
        .from('lead_personalities')
        .insert(personalityData)
        .select()
        .single();
      return data;
    }
  } catch (error) {
    console.error('Error analyzing lead personality:', error);
    return null;
  }
};

// Analyze conversation patterns to determine personality traits
const analyzeConversationPatterns = (conversations: any[]) => {
  const totalMessages = conversations.length;
  const messageContent = conversations.map(c => c.body.toLowerCase()).join(' ');
  
  // Analyze communication style
  const casualWords = ['hey', 'yeah', 'cool', 'awesome', 'thanks', 'lol'];
  const formalWords = ['thank you', 'appreciate', 'regarding', 'sincerely'];
  const enthusiasticWords = ['!', 'exciting', 'great', 'perfect', 'amazing'];
  const directWords = ['yes', 'no', 'when', 'how much', 'price'];

  const casualScore = casualWords.filter(word => messageContent.includes(word)).length;
  const formalScore = formalWords.filter(word => messageContent.includes(word)).length;
  const enthusiasticScore = enthusiasticWords.filter(word => messageContent.includes(word)).length;
  const directScore = directWords.filter(word => messageContent.includes(word)).length;

  let communicationStyle: 'formal' | 'casual' | 'enthusiastic' | 'direct' = 'casual';
  const maxScore = Math.max(casualScore, formalScore, enthusiasticScore, directScore);
  if (maxScore === formalScore) communicationStyle = 'formal';
  else if (maxScore === enthusiasticScore) communicationStyle = 'enthusiastic';
  else if (maxScore === directScore) communicationStyle = 'direct';

  // Analyze response preference
  const questionWords = ['?', 'how', 'what', 'when', 'where', 'why'];
  const questionCount = questionWords.filter(word => messageContent.includes(word)).length;
  const avgMessageLength = messageContent.length / totalMessages;
  
  let responsePreference: 'immediate' | 'considered' | 'research_oriented' = 'immediate';
  if (avgMessageLength > 100) responsePreference = 'considered';
  if (questionCount > totalMessages * 0.3) responsePreference = 'research_oriented';

  // Analyze interest level
  const interestWords = ['interested', 'love', 'like', 'want', 'need'];
  const interestScore = interestWords.filter(word => messageContent.includes(word)).length;
  let interestLevel: 'high' | 'medium' | 'low' = 'medium';
  if (interestScore > 3) interestLevel = 'high';
  if (interestScore < 1) interestLevel = 'low';

  // Analyze price sensitivity
  const priceWords = ['price', 'cost', 'expensive', 'cheap', 'budget', 'afford'];
  const priceCount = priceWords.filter(word => messageContent.includes(word)).length;
  let priceSensitivity: 'high' | 'medium' | 'low' = 'medium';
  if (priceCount > 2) priceSensitivity = 'high';
  if (priceCount === 0) priceSensitivity = 'low';

  // Analyze decision speed
  const urgentWords = ['now', 'today', 'asap', 'urgent', 'soon'];
  const consideringWords = ['thinking', 'considering', 'maybe', 'possibly'];
  const urgentCount = urgentWords.filter(word => messageContent.includes(word)).length;
  const consideringCount = consideringWords.filter(word => messageContent.includes(word)).length;
  
  let decisionSpeed: 'fast' | 'moderate' | 'slow' = 'moderate';
  if (urgentCount > 0) decisionSpeed = 'fast';
  if (consideringCount > urgentCount) decisionSpeed = 'slow';

  return {
    communicationStyle,
    responsePreference,
    interestLevel,
    priceSensitivity,
    decisionSpeed,
    preferredMethod: 'sms' as const,
    overallScore: Math.min(100, (totalMessages * 10) + (interestScore * 15) + (urgentCount * 20))
  };
};

// Get optimal contact timing for a lead
export const getOptimalContactTiming = async (leadId: string): Promise<Date> => {
  try {
    const { data: timing } = await supabase
      .from('lead_contact_timing')
      .select('*')
      .eq('lead_id', leadId)
      .maybeSingle();

    const now = new Date();
    
    if (timing && timing.best_contact_hours.length > 0) {
      const currentHour = now.getHours();
      const preferredHours = timing.best_contact_hours;
      
      // Find next preferred hour
      let nextHour = preferredHours.find(hour => hour > currentHour);
      if (!nextHour) {
        // Use first preferred hour tomorrow
        nextHour = preferredHours[0];
        now.setDate(now.getDate() + 1);
      }
      
      now.setHours(nextHour, 0, 0, 0);
      return now;
    }

    // Default to business hours if no timing data
    const defaultHours = [9, 11, 14, 16];
    const currentHour = now.getHours();
    let nextHour = defaultHours.find(hour => hour > currentHour);
    
    if (!nextHour) {
      nextHour = defaultHours[0];
      now.setDate(now.getDate() + 1);
    }
    
    now.setHours(nextHour, 0, 0, 0);
    return now;
  } catch (error) {
    console.error('Error getting optimal contact timing:', error);
    // Fallback to 1 hour from now
    return new Date(Date.now() + 60 * 60 * 1000);
  }
};

// Generate personalized message based on personality
export const generatePersonalizedMessage = async (leadId: string, context?: any): Promise<string | null> => {
  try {
    const personality = await analyzeLeadPersonality(leadId);
    if (!personality) return null;

    const { data: lead } = await supabase
      .from('leads')
      .select('first_name, vehicle_interest')
      .eq('id', leadId)
      .single();

    if (!lead) return null;

    // Get recent message history to avoid repetition
    const { data: recentMessages } = await supabase
      .from('conversations')
      .select('body')
      .eq('lead_id', leadId)
      .eq('direction', 'out')
      .order('sent_at', { ascending: false })
      .limit(3);

    // Build personalized message based on personality traits
    let message = '';
    const firstName = lead.first_name || 'there';

    switch (personality.communication_style) {
      case 'formal':
        message = `Good ${getTimeOfDay()}, ${firstName}. I hope this message finds you well.`;
        break;
      case 'casual':
        message = `Hey ${firstName}! Hope you're having a great day.`;
        break;
      case 'enthusiastic':
        message = `Hi ${firstName}! Exciting news about your ${lead.vehicle_interest} search!`;
        break;
      case 'direct':
        message = `${firstName}, quick update on ${lead.vehicle_interest} options.`;
        break;
    }

    // Add context-specific content
    if (context?.trigger_type === 'price_drop') {
      message += personality.communication_style === 'formal' 
        ? ' I wanted to inform you of a price reduction on a vehicle that matches your preferences.'
        : ' Just saw a price drop on something perfect for you!';
    } else if (context?.trigger_type === 'new_inventory') {
      message += personality.communication_style === 'formal'
        ? ' We have received new inventory that aligns with your requirements.'
        : ' New arrivals just came in that I think you\'ll love!';
    }

    // Adjust for decision speed
    if (personality.decision_speed === 'fast') {
      message += personality.communication_style === 'formal'
        ? ' Please let me know if you would like to schedule a viewing today.'
        : ' Want to check it out today?';
    } else if (personality.decision_speed === 'slow') {
      message += personality.communication_style === 'formal'
        ? ' Feel free to take your time reviewing the details.'
        : ' No rush - take a look when you get a chance.';
    }

    return message;
  } catch (error) {
    console.error('Error generating personalized message:', error);
    return null;
  }
};

const getTimeOfDay = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
};

// Update contact timing based on response patterns
export const updateContactTiming = async (leadId: string, responseTime: Date): Promise<void> => {
  try {
    const hour = responseTime.getHours();
    const day = responseTime.getDay();

    const { data: existing } = await supabase
      .from('lead_contact_timing')
      .select('*')
      .eq('lead_id', leadId)
      .maybeSingle();

    if (existing) {
      const updatedHours = [...(existing.best_contact_hours || []), hour].slice(-10);
      const updatedDays = [...(existing.best_contact_days || []), day].slice(-10);
      
      await supabase
        .from('lead_contact_timing')
        .update({
          best_contact_hours: updatedHours,
          best_contact_days: updatedDays,
          last_optimal_contact: responseTime.toISOString()
        })
        .eq('lead_id', leadId);
    } else {
      await supabase
        .from('lead_contact_timing')
        .insert({
          lead_id: leadId,
          best_contact_hours: [hour],
          best_contact_days: [day],
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          response_delay_pattern: 24,
          last_optimal_contact: responseTime.toISOString()
        });
    }
  } catch (error) {
    console.error('Error updating contact timing:', error);
  }
};
