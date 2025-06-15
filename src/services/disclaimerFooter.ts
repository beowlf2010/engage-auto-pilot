
import { supabase } from "@/integrations/supabase/client";

// Retrieves active disclaimer by channel (sms or email)
// @ts-expect-error table disclaimer_templates may not be present in generated types
export async function fetchDisclaimerFooter(channel: "sms" | "email"): Promise<string> {
  try {
    // @ts-expect-error see above: disclaimer_templates is new
    const { data, error } = await (supabase.from("disclaimer_templates") as any)
      .select("template")
      .eq("channel", channel)
      .eq("is_active", true)
      .maybeSingle();

    if (!error && data?.template) return data.template;
  } catch { /**/ }
  // fallback default
  if (channel === "sms") return "YourDealer: Msg & data rates may apply. Reply STOP to opt out.";
  if (channel === "email") return "You may unsubscribe at any time by clicking the link in our emails.";
  return "";
}
