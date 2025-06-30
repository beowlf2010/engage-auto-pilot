
import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EyeOff } from "lucide-react";
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
  handleDoNotContactChange: (leadId: string, field: 'doNotCall' | 'doNotEmail' | 'doNotMail', value: boolean) => void;
  canEdit: boolean;
  searchTerm: string;
  onQuickView: (lead: Lead) => void;
  getEngagementScore: (lead: Lead) => number;
  onToggleHidden?: (leadId: string, hidden: boolean) => void;
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
  handleDoNotContactChange,
  canEdit,
  searchTerm,
  onQuickView,
  getEngagementScore,
  onToggleHidden,
}) => {
  // Helper function to get tab description
  const getTabDescription = (tabValue: string) => {
    switch (tabValue) {
      case 'all':
        return 'All active leads (excludes lost and hidden)';
      case 'new':
        return 'No contact attempted yet';
      case 'needs_ai':
        return 'Active leads not opted into AI';
      case 'engaged':
        return 'Actively communicating';
      case 'sold_customers':
        return 'Sold customers';
      case 'paused':
        return 'Temporarily paused';
      case 'closed':
        return 'Successfully closed';
      case 'lost':
        return 'Marked as lost';
      case 'do_not_contact':
        return 'Leads with contact restrictions';
      case 'hidden':
        return 'Hidden leads';
      default:
        return '';
    }
  };

  return (
    <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-full">
      <TabsList className="grid w-full grid-cols-10">
        <TabsTrigger value="all" title={getTabDescription('all')}>
          All
        </TabsTrigger>
        <TabsTrigger value="new" title={getTabDescription('new')}>
          New
        </TabsTrigger>
        <TabsTrigger value="needs_ai" title={getTabDescription('needs_ai')}>
          Needs AI
        </TabsTrigger>
        <TabsTrigger value="engaged" title={getTabDescription('engaged')}>
          Engaged
        </TabsTrigger>
        <TabsTrigger value="sold_customers" title={getTabDescription('sold_customers')}>
          Sold
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
        <TabsTrigger value="do_not_contact" title={getTabDescription('do_not_contact')}>
          DNC
        </TabsTrigger>
        <TabsTrigger value="hidden" title={getTabDescription('hidden')} className="flex items-center gap-1">
          <EyeOff className="w-3 h-3" />
          Hidden
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
          onDoNotContactChange={handleDoNotContactChange}
          canEdit={canEdit}
          loading={loading}
          searchTerm={searchTerm}
          selectedLeads={selectedLeads}
          onLeadSelect={toggleLeadSelection}
          onQuickView={onQuickView}
          getEngagementScore={getEngagementScore}
          onToggleHidden={onToggleHidden}
        />
      </TabsContent>
    </Tabs>
  );
};

export default LeadsStatusTabs;
