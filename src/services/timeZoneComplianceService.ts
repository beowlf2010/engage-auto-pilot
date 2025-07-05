import { supabase } from '@/integrations/supabase/client';

export interface BusinessHours {
  start_time: string; // HH:MM format
  end_time: string;   // HH:MM format
  timezone: string;   // IANA timezone identifier
  days_of_week: number[]; // 0-6, Sunday = 0
}

export interface ComplianceResult {
  canCall: boolean;
  reason?: string;
  nextAvailableTime?: Date;
  leadTimezone?: string;
}

// Default business hours (9 AM - 7 PM EST, Monday-Saturday)
const DEFAULT_BUSINESS_HOURS: BusinessHours = {
  start_time: '09:00',
  end_time: '19:00',
  timezone: 'America/New_York',
  days_of_week: [1, 2, 3, 4, 5, 6] // Monday through Saturday
};

export const checkCallCompliance = async (leadId: string): Promise<ComplianceResult> => {
  try {
    // Get lead location data for timezone detection
    const { data: lead, error } = await supabase
      .from('leads')
      .select('state, city, postal_code, do_not_call')
      .eq('id', leadId)
      .single();

    if (error) {
      console.error('Error fetching lead for compliance check:', error);
      return { canCall: false, reason: 'Unable to verify lead information' };
    }

    // Check do not call status
    if (lead.do_not_call) {
      return { canCall: false, reason: 'Lead is on Do Not Call list' };
    }

    // Get business hours settings
    const businessHours = await getBusinessHours();
    
    // Determine lead's timezone
    const leadTimezone = getTimezoneFromLocation(lead.state, lead.city);
    
    // Check if current time is within business hours for the lead
    const complianceResult = checkBusinessHoursCompliance(businessHours, leadTimezone);
    
    return {
      ...complianceResult,
      leadTimezone
    };
  } catch (error) {
    console.error('Error in checkCallCompliance:', error);
    return { canCall: false, reason: 'Compliance check failed' };
  }
};

const getBusinessHours = async (): Promise<BusinessHours> => {
  try {
    const { data, error } = await supabase
      .from('compliance_settings')
      .select('*')
      .single();

    if (error || !data) {
      return DEFAULT_BUSINESS_HOURS;
    }

    return {
      start_time: data.message_window_start || DEFAULT_BUSINESS_HOURS.start_time,
      end_time: data.message_window_end || DEFAULT_BUSINESS_HOURS.end_time,
      timezone: DEFAULT_BUSINESS_HOURS.timezone, // Could be configurable
      days_of_week: DEFAULT_BUSINESS_HOURS.days_of_week // Could be configurable
    };
  } catch (error) {
    console.error('Error fetching business hours:', error);
    return DEFAULT_BUSINESS_HOURS;
  }
};

const getTimezoneFromLocation = (state?: string, city?: string): string => {
  // Basic timezone mapping for US states
  const stateTimezones: Record<string, string> = {
    // Eastern Time
    'FL': 'America/New_York', 'GA': 'America/New_York', 'NC': 'America/New_York', 
    'SC': 'America/New_York', 'VA': 'America/New_York', 'WV': 'America/New_York',
    'MD': 'America/New_York', 'DE': 'America/New_York', 'PA': 'America/New_York',
    'NJ': 'America/New_York', 'NY': 'America/New_York', 'CT': 'America/New_York',
    'RI': 'America/New_York', 'MA': 'America/New_York', 'VT': 'America/New_York',
    'NH': 'America/New_York', 'ME': 'America/New_York', 'OH': 'America/New_York',
    'MI': 'America/New_York', 'IN': 'America/New_York', 'KY': 'America/New_York',
    'TN': 'America/New_York',

    // Central Time
    'AL': 'America/Chicago', 'AR': 'America/Chicago', 'IL': 'America/Chicago',
    'IA': 'America/Chicago', 'KS': 'America/Chicago', 'LA': 'America/Chicago',
    'MN': 'America/Chicago', 'MS': 'America/Chicago', 'MO': 'America/Chicago',
    'NE': 'America/Chicago', 'ND': 'America/Chicago', 'OK': 'America/Chicago',
    'SD': 'America/Chicago', 'TX': 'America/Chicago', 'WI': 'America/Chicago',

    // Mountain Time
    'AZ': 'America/Phoenix', 'CO': 'America/Denver', 'ID': 'America/Denver',
    'MT': 'America/Denver', 'NV': 'America/Denver', 'NM': 'America/Denver',
    'UT': 'America/Denver', 'WY': 'America/Denver',

    // Pacific Time
    'CA': 'America/Los_Angeles', 'OR': 'America/Los_Angeles', 'WA': 'America/Los_Angeles',

    // Special cases
    'AK': 'America/Anchorage',
    'HI': 'Pacific/Honolulu'
  };

  const stateCode = state?.toUpperCase();
  return stateCode && stateTimezones[stateCode] ? stateTimezones[stateCode] : DEFAULT_BUSINESS_HOURS.timezone;
};

const checkBusinessHoursCompliance = (businessHours: BusinessHours, leadTimezone: string): ComplianceResult => {
  try {
    const now = new Date();
    
    // Convert current time to lead's timezone
    const leadTime = new Date(now.toLocaleString("en-US", { timeZone: leadTimezone }));
    const dayOfWeek = leadTime.getDay();
    
    // Check if it's a valid business day
    if (!businessHours.days_of_week.includes(dayOfWeek)) {
      const nextBusinessDay = getNextBusinessDay(leadTime, businessHours.days_of_week);
      const nextAvailableTime = new Date(nextBusinessDay);
      const [startHour, startMinute] = businessHours.start_time.split(':').map(Number);
      nextAvailableTime.setHours(startHour, startMinute, 0, 0);
      
      return {
        canCall: false,
        reason: 'Outside business days',
        nextAvailableTime
      };
    }
    
    // Check if it's within business hours
    const currentTime = leadTime.getHours() * 60 + leadTime.getMinutes();
    const [startHour, startMinute] = businessHours.start_time.split(':').map(Number);
    const [endHour, endMinute] = businessHours.end_time.split(':').map(Number);
    const startTime = startHour * 60 + startMinute;
    const endTime = endHour * 60 + endMinute;
    
    if (currentTime < startTime) {
      // Before business hours today
      const nextAvailableTime = new Date(leadTime);
      nextAvailableTime.setHours(startHour, startMinute, 0, 0);
      
      return {
        canCall: false,
        reason: 'Before business hours',
        nextAvailableTime
      };
    }
    
    if (currentTime >= endTime) {
      // After business hours today - next available is tomorrow or next business day
      const nextBusinessDay = getNextBusinessDay(leadTime, businessHours.days_of_week);
      const nextAvailableTime = new Date(nextBusinessDay);
      nextAvailableTime.setHours(startHour, startMinute, 0, 0);
      
      return {
        canCall: false,
        reason: 'After business hours',
        nextAvailableTime
      };
    }
    
    // Within business hours
    return { canCall: true };
    
  } catch (error) {
    console.error('Error checking business hours compliance:', error);
    return { canCall: false, reason: 'Error checking business hours' };
  }
};

const getNextBusinessDay = (currentDate: Date, businessDays: number[]): Date => {
  const nextDay = new Date(currentDate);
  nextDay.setDate(nextDay.getDate() + 1);
  
  // Find the next valid business day
  while (!businessDays.includes(nextDay.getDay())) {
    nextDay.setDate(nextDay.getDate() + 1);
  }
  
  return nextDay;
};

export const formatNextAvailableTime = (date: Date, leadTimezone: string): string => {
  return date.toLocaleString('en-US', {
    timeZone: leadTimezone,
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short'
  });
};

export const getLeadTimezoneInfo = (state?: string, city?: string) => {
  const timezone = getTimezoneFromLocation(state, city);
  const now = new Date();
  const leadTime = new Date(now.toLocaleString("en-US", { timeZone: timezone }));
  
  return {
    timezone,
    localTime: leadTime.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      timeZoneName: 'short'
    }),
    isDifferentFromLocal: timezone !== Intl.DateTimeFormat().resolvedOptions().timeZone
  };
};