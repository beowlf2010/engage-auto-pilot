
import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table,
  TableBody,
  TableHeader,
} from "@/components/ui/table";
import { Lead } from "@/types/lead";
import LeadTableRow from "./leads/LeadTableRow";
import LeadsTableHeader from "./leads/LeadsTableHeader";
import LeadsTableEmptyState from "./leads/LeadsTableEmptyState";
import { useLeadsSelection } from "./leads/useLeadsSelection";
import { useLeadsSorting } from "./leads/useLeadsSorting";

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
  const navigate = useNavigate();

  const { sortField, sortDirection, handleSort, sortedLeads } = useLeadsSorting({
    leads,
    getEngagementScore,
  });

  const { handleSelectAll } = useLeadsSelection({
    leads,
    selectedLeads,
    onLeadSelect,
  });

  const handleMessageClick = (lead: Lead) => {
    navigate(`/inbox?leadId=${lead.id}`);
  };

  const handleLeadClick = (leadId: string) => {
    navigate(`/lead/${leadId}`);
  };

  if (loading) {
    return <div className="text-center py-8">Loading leads...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <LeadsTableHeader
              leadsCount={leads.length}
              selectedLeadsCount={selectedLeads.length}
              searchTerm={searchTerm}
              sortField={sortField}
              sortDirection={sortDirection}
              onSort={handleSort}
              onSelectAll={handleSelectAll}
            />
          </TableHeader>
          <TableBody>
            {sortedLeads.map((lead) => {
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const leadDate = new Date(lead.createdAt);
              leadDate.setHours(0, 0, 0, 0);
              const isFresh = leadDate.getTime() === today.getTime();

              return (
                <LeadTableRow
                  key={lead.id}
                  lead={lead}
                  selected={selectedLeads.includes(lead.id.toString())}
                  onSelect={onLeadSelect}
                  onAiOptInChange={onAiOptInChange}
                  canEdit={canEdit}
                  onQuickView={onQuickView}
                  handleMessageClick={handleMessageClick}
                  handleLeadClick={handleLeadClick}
                  getEngagementScore={getEngagementScore}
                  isFresh={isFresh}
                />
              );
            })}
          </TableBody>
        </Table>

        {sortedLeads.length === 0 && (
          <LeadsTableEmptyState searchTerm={searchTerm} />
        )}
      </div>
    </div>
  );
};

export default LeadsTable;
