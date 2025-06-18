
import { useMemo } from "react";
import { Lead } from "@/types/lead";

interface UseLeadsSelectionOptions {
  leads: Lead[];
  selectedLeads: string[];
  onLeadSelect: (leadId: string) => void;
}

export function useLeadsSelection({ 
  leads, 
  selectedLeads, 
  onLeadSelect 
}: UseLeadsSelectionOptions) {
  const handleSelectAll = () => {
    const allLeadIds = leads.map(lead => lead.id.toString());
    const allSelected = selectedLeads.length === leads.length;
    
    if (allSelected) {
      // Clear all selections
      selectedLeads.forEach(id => onLeadSelect(id));
    } else {
      // Select all leads that aren't already selected
      allLeadIds.forEach(id => {
        if (!selectedLeads.includes(id)) {
          onLeadSelect(id);
        }
      });
    }
  };

  const isAllSelected = useMemo(() => {
    return leads.length > 0 && selectedLeads.length === leads.length;
  }, [leads.length, selectedLeads.length]);

  const isIndeterminate = useMemo(() => {
    return selectedLeads.length > 0 && selectedLeads.length < leads.length;
  }, [selectedLeads.length, leads.length]);

  return {
    handleSelectAll,
    isAllSelected,
    isIndeterminate
  };
}
