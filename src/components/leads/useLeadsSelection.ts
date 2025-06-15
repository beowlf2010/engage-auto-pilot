
import { useCallback } from "react";
import { Lead } from "@/types/lead";

type UseLeadsSelectionProps = {
  leads: Lead[];
  selectedLeads: string[];
  onLeadSelect: (leadId: string) => void;
};

export function useLeadsSelection({
  leads,
  selectedLeads,
  onLeadSelect,
}: UseLeadsSelectionProps) {
  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      leads.forEach(lead => {
        if (!selectedLeads.includes(lead.id.toString())) {
          onLeadSelect(lead.id.toString());
        }
      });
    } else {
      leads.forEach(lead => {
        if (selectedLeads.includes(lead.id.toString())) {
          onLeadSelect(lead.id.toString());
        }
      });
    }
  }, [leads, selectedLeads, onLeadSelect]);

  return { handleSelectAll };
}
