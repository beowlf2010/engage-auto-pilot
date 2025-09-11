import { supabase } from "@/integrations/supabase/client";

// Default to Central Time for business hours (9 AM - 7 PM)
const DEFAULT_BUSINESS_HOURS = { 
  start: "09:00", 
  end: "19:00", 
  timezone: "America/Chicago" // Central Time
};

// Returns {start, end, timezone}
export async function getBusinessHours() {
  let result = DEFAULT_BUSINESS_HOURS;
  try {
    // @ts-expect-error business_hours may not exist in TS types yet
    const { data } = await (supabase.from("business_hours") as any).select("*").limit(1);
    if (data && data.length > 0) {
      const row = data[0];
      result = { 
        start: row.weekday_start, 
        end: row.weekday_end, 
        timezone: row.timezone || "America/Chicago" // Default to Central if not specified
      };
    }
  } catch {
    // Use default business hours if table doesn't exist
    console.log('📅 [BUSINESS HOURS] Using default Central Time business hours: 9 AM - 7 PM');
  }
  return result;
}

// Check if given time is within business hours and not Sunday
export function isWithinBusinessHours(now: Date, { start, end, timezone }: { start: string, end: string, timezone: string }) {
  const localNow = new Date(now.toLocaleString("en-US", { timeZone: timezone }));
  const dayOfWeek = localNow.getDay();
  
  // Block Sundays (day 0)
  if (dayOfWeek === 0) {
    return false;
  }
  
  const h = localNow.getHours();
  const m = localNow.getMinutes();
  const [startH, startM] = start.split(":").map(Number);
  const [endH, endM] = end.split(":").map(Number);
  const afterStart = (h > startH) || (h === startH && m >= startM);
  const beforeEnd = (h < endH) || (h === endH && m <= endM);
  return afterStart && beforeEnd;
}

// Get next business day (Monday-Saturday, Central Time)
export function getNextBusinessDay(date: Date, timezone: string = "America/Chicago"): Date {
  const nextDay = new Date(date);
  nextDay.setDate(nextDay.getDate() + 1);
  
  // Convert to specified timezone to check day
  const localDay = new Date(nextDay.toLocaleString("en-US", { timeZone: timezone }));
  
  // Skip Sunday
  if (localDay.getDay() === 0) {
    nextDay.setDate(nextDay.getDate() + 1);
  }
  
  return nextDay;
}

// Check if current time is a business day (Monday-Saturday)
export function isBusinessDay(date: Date, timezone: string = "America/Chicago"): boolean {
  const localDate = new Date(date.toLocaleString("en-US", { timeZone: timezone }));
  const dayOfWeek = localDate.getDay();
  return dayOfWeek >= 1 && dayOfWeek <= 6; // Monday (1) through Saturday (6)
}
