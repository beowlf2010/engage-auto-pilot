
import { supabase } from "@/integrations/supabase/client";

export async function logConsentProof({
  leadId,
  consentChannel,
  consentMethod,
  consentText,
  ipAddress,
  userAgent,
  capturedBy,
}: {
  leadId: string;
  consentChannel: string; // "sms" | "email"
  consentMethod: string;
  consentText: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  capturedBy?: string | null;
}) {
  const { error } = await supabase.from("lead_consent_proof").insert({
    lead_id: leadId,
    consent_channel: consentChannel,
    consent_given: true,
    consent_method: consentMethod,
    consent_text: consentText,
    ip_address: ipAddress || null,
    user_agent: userAgent || null,
    captured_by: capturedBy || null,
  });
  if (error) {
    console.error("Consent proof log failed", error);
    throw new Error("Failed to store consent proof");
  }
}

export async function logConsentAudit({
  leadId,
  eventType,
  channel,
  eventMetadata,
  performedBy,
}: {
  leadId: string;
  eventType: string;
  channel: string;
  eventMetadata?: any;
  performedBy?: string | null;
}) {
  const { error } = await supabase.from("lead_consent_audit").insert({
    lead_id: leadId,
    event_type: eventType,
    channel,
    event_metadata: eventMetadata || {},
    performed_by: performedBy || null,
  });
  if (error) {
    console.error("Consent audit log failed", error);
    throw new Error("Failed to store consent audit");
  }
}

export async function isSuppressed(contact: string, type: "sms" | "email") {
  // Checks if the contact is blocked for SMS or EMAIL
  const { data, error } = await supabase
    .from("compliance_suppression_list")
    .select("id")
    .eq("contact", contact)
    .eq("type", type)
    .limit(1);
  if (error) {
    console.error("Suppression list lookup error", error);
    return false;
  }
  return Boolean(data && data.length > 0);
}

export async function enforceConsent(leadId: string, channel: "sms" | "email") {
  // Require a valid opt-in proof before messaging the lead
  const { data: proof, error } = await supabase
    .from("lead_consent_proof")
    .select("id")
    .eq("lead_id", leadId)
    .eq("consent_channel", channel)
    .eq("consent_given", true)
    .limit(1);

  if (error || !proof || proof.length === 0) {
    throw new Error(
      "No valid consent found for this channel. Messaging is blocked for compliance."
    );
  }
  return true;
}
