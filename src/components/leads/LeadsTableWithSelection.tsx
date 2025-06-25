
import React from 'react';
import {
  Table,
  TableBody,
} from "@/components/ui/table";
import { Lead } from "@/types/lead";
import LeadsTableHeader from "./LeadsTableHeader";
import LeadsTableRow from "./LeadsTableRow";
import LeadsTableEmptyState from "./LeadsTableEmptyState";

interface LeadsTableWithSelectionProps {
  leads: Lead[];
  loading: boolean;
  selectedLeads: string[];
  onLeadSelect: (leadId: string) => void;
  searchTerm?: string;
  onToggleHidden?: (leadId: string, hidden: boolean) => void;
  onLeadClick?: (lead: Lead) => void;
  onAiOptInChange?: (leadId: string, value: boolean) => void;
  onDoNotContactChange?: (leadId: string, field: 'doNotCall' | 'doNotEmail' | 'doNotMail', value: boolean) => void;
  onEditData?: (leadId: string) => void;
}

const LeadsTableWithSelection = ({
  leads,
  loading,
  selectedLeads,
  onLeadSelect,
  searchTerm = "",
  onToggleHidden,
  onLeadClick,
  onAiOptInChange,
  onDoNotContactChange,
  onEditData
}: LeadsTableWithSelectionProps) => {
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      leads.forEach(lead => {
        if (!selectedLeads.includes(lead.id.toString())) {
          onLeadSelect(lead.id.toString());
        }
      });
    } else {
      selectedLeads.forEach(leadId => onLeadSelect(leadId));
    }
  };

  const getEngagementScore = (lead: Lead) => {
    let score = 0;
    if (lead.incomingCount > 0) score += 20;
    if (lead.outgoingCount > 0) score += 10;
    if (lead.lastMessageDirection === 'in') score += 30;
    if (lead.status === 'engaged') score += 40;
    return Math.min(score, 100);
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
                onAiOptInChange={onAiOptInChange || (() => {})}
                onDoNotContactChange={onDoNotContactChange || (() => {})}
                canEdit={true}
                onQuickView={onLeadClick || (() => {})}
                getEngagementScore={getEngagementScore}
                isFresh={isFresh}
                onToggleHidden={onToggleHidden}
                onEditData={onEditData}
              />
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

export default LeadsTableWithSelection;
