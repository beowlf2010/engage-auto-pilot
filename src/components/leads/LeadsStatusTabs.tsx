
import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import LeadsTable from "../LeadsTable";
import { Lead } from "@/types/lead";

interface LeadsStatusTabsProps {
  statusFilter: string;
  setStatusFilter: (value: string) => void;
  finalFilteredLeads: Lead[];
  loading: boolean;
  selectedLeads: string[];
  selectAllFiltered: () => void;
  toggleLeadSelection: (leadId: string) => void;
  handleAiOptInChange: (leadId: string, value: boolean) => void;
  canEdit: boolean;
  searchTerm: string;
  onQuickView: (lead: Lead) => void;
  getEngagementScore: (lead: Lead) => number;
}

const LeadsStatusTabs: React.FC<LeadsStatusTabsProps> = ({
  statusFilter,
  setStatusFilter,
  finalFilteredLeads,
  loading,
  selectedLeads,
  selectAllFiltered,
  toggleLeadSelection,
  handleAiOptInChange,
  canEdit,
  searchTerm,
  onQuickView,
  getEngagementScore,
}) => {
  // Helper function to get tab description
  const getTabDescription = (tabValue: string) => {
    switch (tabValue) {
      case 'all':
        return 'All active leads (excludes lost)';
      case 'new':
        return 'No contact attempted yet';
      case 'engaged':
        return 'Actively communicating';
      case 'paused':
        return 'Temporarily paused';
      case 'closed':
        return 'Successfully closed';
      case 'lost':
        return 'Marked as lost';
      default:
        return '';
    }
  };

  return (
    <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-full">
      <TabsList className="grid w-full grid-cols-6">
        <TabsTrigger value="all" title={getTabDescription('all')}>
          All
        </TabsTrigger>
        <TabsTrigger value="new" title={getTabDescription('new')}>
          New
        </TabsTrigger>
        <TabsTrigger value="engaged" title={getTabDescription('engaged')}>
          Engaged
        </TabsTrigger>
        <TabsTrigger value="paused" title={getTabDescription('paused')}>
          Paused
        </TabsTrigger>
        <TabsTrigger value="closed" title={getTabDescription('closed')}>
          Closed
        </TabsTrigger>
        <TabsTrigger value="lost" title={getTabDescription('lost')}>
          Lost
        </TabsTrigger>
      </TabsList>

      <TabsContent value={statusFilter} className="mt-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Badge variant="outline">
              {finalFilteredLeads.length} lead{finalFilteredLeads.length !== 1 ? "s" : ""}
            </Badge>
            {statusFilter !== 'all' && (
              <Badge variant="secondary" className="text-xs">
                {getTabDescription(statusFilter)}
              </Badge>
            )}
          </div>
          {finalFilteredLeads.length > 0 && (
            <Button
              variant="outline"
              onClick={selectAllFiltered}
              disabled={selectedLeads.length === finalFilteredLeads.length}
            >
              Select All ({finalFilteredLeads.length})
            </Button>
          )}
        </div>

        <LeadsTable
          leads={finalFilteredLeads}
          onAiOptInChange={handleAiOptInChange}
          canEdit={canEdit}
          loading={loading}
          searchTerm={searchTerm}
          selectedLeads={selectedLeads}
          onLeadSelect={toggleLeadSelection}
          onQuickView={onQuickView}
          getEngagementScore={getEngagementScore}
        />
      </TabsContent>
    </Tabs>
  );
};

export default LeadsStatusTabs;
