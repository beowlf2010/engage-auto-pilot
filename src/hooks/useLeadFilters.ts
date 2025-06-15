
import { useState } from "react";

type LeadStatusFilter = "all" | "new" | "engaged" | "paused" | "closed" | "lost" | "ai_paused" | "replied_not_opted_in";

export function useLeadFilters() {
  const [filter, setFilter] = useState<LeadStatusFilter>("all");

  // Filtering logic could be extended as needed for real data
  const filterLeads = (leads: any[]) => {
    switch (filter) {
      case "ai_paused":
        return leads.filter(l => l.ai_paused);
      case "replied_not_opted_in":
        return leads.filter(l => l.status === "engaged" && !l.ai_opt_in);
      default:
        if (filter === "all") return leads;
        return leads.filter(l => l.status === filter);
    }
  };
  return { filter, setFilter, filterLeads };
}
