
import { useState } from "react";
import { logConsentProof, logConsentAudit, isSuppressed, enforceConsent } from "@/utils/compliance/complianceUtils";

export function useCompliance() {
  const [consentLoading, setConsentLoading] = useState(false);

  return {
    // Store consent, then audit
    async storeConsent({
      leadId,
      channel,
      method,
      consentText,
      ipAddress,
      userAgent,
      capturedBy,
    }: {
      leadId: string;
      channel: "sms" | "email";
      method: string;
      consentText: string;
      ipAddress?: string | null;
      userAgent?: string | null;
      capturedBy?: string | null;
    }) {
      setConsentLoading(true);
      await logConsentProof({
        leadId,
        consentChannel: channel,
        consentMethod: method,
        consentText,
        ipAddress,
        userAgent,
        capturedBy,
      });
      await logConsentAudit({
        leadId,
        eventType: "opt-in",
        channel,
        eventMetadata: {},
        performedBy: capturedBy,
      });
      setConsentLoading(false);
    },

    // Log opt-out and add to suppression
    async suppressContact({
      leadId,
      contact,
      type,
      reason,
      details,
      performedBy,
    }: {
      leadId?: string;
      contact: string;
      type: "sms" | "email";
      reason: string;
      details?: string;
      performedBy?: string | null;
    }) {
      // Add to suppression list and log audit event
      await fetchContactSuppression(contact, type, reason, details, leadId);
      await logConsentAudit({
        leadId: leadId || "",
        eventType: "opt-out",
        channel: type,
        eventMetadata: { reason, contact },
        performedBy,
      });
    },

    checkSuppressed: isSuppressed,
    enforceConsent,
    consentLoading,
  };
}

// Helper for suppression
async function fetchContactSuppression(
  contact: string,
  type: string,
  reason: string,
  details?: string,
  leadId?: string
) {
  const { supabase } = await import("@/integrations/supabase/client");
  const { data, error } = await supabase
    .from("compliance_suppression_list")
    .insert({
      contact,
      type,
      reason,
      details: details || null,
      lead_id: leadId || null,
    });
  if (error) {
    console.error("Suppression insert failed", error);
    throw new Error("Suppression add failed");
  }
  return data;
}
