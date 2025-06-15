
import { supabase } from "@/integrations/supabase/client";

// Returns {start, end, timezone}
export async function getBusinessHours() {
  const { data, error } = await supabase.from("business_hours").select("*").limit(1);
  if (error || !data?.[0]) return { start: "08:00", end: "19:00", timezone: "America/New_York" };
  const row = data[0];
  return { start: row.weekday_start, end: row.weekday_end, timezone: row.timezone };
}

// true if we're inside business hours window
export function isWithinBusinessHours(now: Date, { start, end, timezone }: { start: string, end: string, timezone: string }) {
  const localNow = new Date(now.toLocaleString("en-US", { timeZone: timezone }));
  const h = localNow.getHours(), m = localNow.getMinutes();
  const [startH, startM] = start.split(":").map(Number);
  const [endH, endM] = end.split(":").map(Number);
  const afterStart = (h > startH) || (h === startH && m >= startM);
  const beforeEnd = (h < endH) || (h === endH && m <= endM);
  return afterStart && beforeEnd;
}
