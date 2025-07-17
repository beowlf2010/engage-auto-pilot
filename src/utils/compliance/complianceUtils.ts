
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

// Detect opt-out keywords in message content
export function detectOptOutKeywords(messageBody: string): { isOptOut: boolean; keyword: string | null } {
  const stopKeywords = [
    'STOP', 'UNSUBSCRIBE', 'QUIT', 'CANCEL', 'END', 
    'OPTOUT', 'OPT-OUT', 'OPT OUT', 'REMOVE', 'DELETE'
  ];
  
  const normalizedMessage = messageBody.toUpperCase().trim();
  
  for (const keyword of stopKeywords) {
    if (normalizedMessage === keyword || normalizedMessage.includes(keyword)) {
      return { isOptOut: true, keyword };
    }
  }
  
  return { isOptOut: false, keyword: null };
}

// Process opt-out request and add to suppression list
export async function processOptOutRequest({
  phoneNumber,
  leadId,
  messageBody,
  keyword,
}: {
  phoneNumber: string;
  leadId?: string;
  messageBody: string;
  keyword: string;
}) {
  try {
    // Add to suppression list
    const { error: suppressionError } = await supabase
      .from("compliance_suppression_list")
      .insert({
        contact: phoneNumber,
        type: "sms",
        reason: "Customer opt-out via SMS",
        details: `Customer sent: "${messageBody}" (keyword: ${keyword})`,
        lead_id: leadId || null,
      });

    if (suppressionError) {
      console.error("Failed to add to suppression list:", suppressionError);
      throw new Error("Failed to process opt-out request");
    }

    // If we have a lead ID, update the lead status
    if (leadId) {
      const { error: leadUpdateError } = await supabase
        .from("leads")
        .update({
          ai_opt_in: false,
          ai_sequence_paused: true,
          ai_pause_reason: "Customer opted out via STOP message",
          next_ai_send_at: null,
          status: "opted_out",
          updated_at: new Date().toISOString(),
        })
        .eq("id", leadId);

      if (leadUpdateError) {
        console.error("Failed to update lead status:", leadUpdateError);
      }

      // Log the opt-out audit
      await logConsentAudit({
        leadId,
        eventType: "opt-out",
        channel: "sms",
        eventMetadata: {
          reason: "STOP message received",
          message_body: messageBody,
          phone_number: phoneNumber,
          keyword: keyword,
        },
        performedBy: null,
      });
    }

    console.log(`✅ [COMPLIANCE] Successfully processed opt-out for ${phoneNumber}`);
    return true;
  } catch (error) {
    console.error("Error processing opt-out request:", error);
    throw error;
  }
}
