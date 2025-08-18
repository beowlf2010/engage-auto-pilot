
import { useState } from "react";

type LeadStatusFilter = 
  | "all" 
  | "new" 
  | "engaged" 
  | "paused" 
  | "closed" 
  | "lost" 
  | "ai_paused" 
  | "replied_not_opted_in"
  | "messaged"
  | "not_messaged" 
  | "not_opted_in"
  | "messaged_not_opted_in"
  | "never_contacted"
  | "needs_reply"
  | "today";

export function useLeadFilters() {
  const [filter, setFilter] = useState<LeadStatusFilter>("today");

  // Enhanced filtering logic with messaging and opt-in status
  const filterLeads = (leads: any[]) => {
    switch (filter) {
      case "ai_paused":
        return leads.filter(l => l.ai_paused || l.aiSequencePaused);
      
      case "replied_not_opted_in":
        return leads.filter(l => l.status === "engaged" && !l.ai_opt_in);
      
      case "messaged":
        // Leads that have received outgoing messages
        return leads.filter(l => l.outgoingCount > 0);
      
      case "not_messaged":
        // Leads with no outgoing messages but may have incoming
        return leads.filter(l => l.outgoingCount === 0);
      
      case "not_opted_in":
        // Leads that are not opted into AI
        return leads.filter(l => !l.aiOptIn);
      
      case "messaged_not_opted_in":
        // Leads that have been messaged but are not opted into AI
        return leads.filter(l => l.outgoingCount > 0 && !l.aiOptIn);
      
      case "never_contacted":
        // Fresh leads with no messages at all (no incoming or outgoing)
        return leads.filter(l => l.messageCount === 0);
      
      case "needs_reply":
        // Leads with unread incoming messages or unreplied messages
        return leads.filter(l => l.unreadCount > 0 || l.unrepliedCount > 0);
      
      case "today":
        // Leads created today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return leads.filter(l => {
          const leadDate = new Date(l.createdAt);
          leadDate.setHours(0, 0, 0, 0);
          return leadDate >= today;
        });
      
      default:
        if (filter === "all") return leads;
        return leads.filter(l => l.status === filter);
    }
  };

  return { filter, setFilter, filterLeads };
}
