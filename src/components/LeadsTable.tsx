
import React from 'react';
import {
  Table,
  TableBody,
} from "@/components/ui/table";
import { Lead } from "@/types/lead";
import LeadsTableHeader from "./leads/LeadsTableHeader";
import LeadsTableRow from "./leads/LeadsTableRow";
import LeadsTableEmptyState from "./leads/LeadsTableEmptyState";

interface LeadsTableProps {
  leads: Lead[];
  onAiOptInChange: (leadId: string, value: boolean) => void;
  canEdit: boolean;
  loading: boolean;
  searchTerm: string;
  selectedLeads: string[];
  onLeadSelect: (leadId: string) => void;
  onQuickView: (lead: Lead) => void;
  getEngagementScore: (lead: Lead) => number;
}

const LeadsTable = ({
  leads,
  onAiOptInChange,
  canEdit,
  loading,
  searchTerm,
  selectedLeads,
  onLeadSelect,
  onQuickView,
  getEngagementScore
}: LeadsTableProps) => {
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      leads.forEach(lead => onLeadSelect(lead.id.toString()));
    } else {
      selectedLeads.forEach(leadId => onLeadSelect(leadId));
    }
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Show empty state if needed
  const emptyState = LeadsTableEmptyState({ loading, searchTerm, leadsCount: leads.length });
  if (emptyState) {
    return emptyState;
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <LeadsTableHeader 
          leads={leads}
          selectedLeads={selectedLeads}
          onSelectAll={handleSelectAll}
        />
        <TableBody>
          {leads.map((lead) => {
            const leadDate = new Date(lead.createdAt);
            leadDate.setHours(0, 0, 0, 0);
            const isFresh = leadDate.getTime() === today.getTime();

            return (
              <LeadsTableRow
                key={lead.id}
                lead={lead}
                selectedLeads={selectedLeads}
                onLeadSelect={onLeadSelect}
                onAiOptInChange={onAiOptInChange}
                canEdit={canEdit}
                onQuickView={onQuickView}
                getEngagementScore={getEngagementScore}
                isFresh={isFresh}
              />
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

export default LeadsTable;
