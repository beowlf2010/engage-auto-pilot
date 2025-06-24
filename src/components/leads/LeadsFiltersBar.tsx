
import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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
  | "needs_reply";

interface Props {
  filter: LeadStatusFilter;
  setFilter: (val: LeadStatusFilter) => void;
  leads?: any[]; // Optional for showing counts
}

export default function LeadsFiltersBar({ filter, setFilter, leads = [] }: Props) {
  // Helper function to get lead count for a filter
  const getFilterCount = (filterType: LeadStatusFilter) => {
    if (!leads.length) return 0;
    
    switch (filterType) {
      case "all":
        return leads.length;
      case "messaged":
        return leads.filter(l => l.outgoingCount > 0).length;
      case "not_messaged":
        return leads.filter(l => l.outgoingCount === 0).length;
      case "not_opted_in":
        return leads.filter(l => !l.aiOptIn).length;
      case "messaged_not_opted_in":
        return leads.filter(l => l.outgoingCount > 0 && !l.aiOptIn).length;
      case "never_contacted":
        return leads.filter(l => l.messageCount === 0).length;
      case "needs_reply":
        return leads.filter(l => l.unreadCount > 0 || l.unrepliedCount > 0).length;
      case "ai_paused":
        return leads.filter(l => l.ai_paused || l.aiSequencePaused).length;
      case "replied_not_opted_in":
        return leads.filter(l => l.status === "engaged" && !l.ai_opt_in).length;
      default:
        return leads.filter(l => l.status === filterType).length;
    }
  };

  const FilterButton = ({ filterType, label, description }: { 
    filterType: LeadStatusFilter; 
    label: string; 
    description?: string;
  }) => {
    const count = getFilterCount(filterType);
    const isActive = filter === filterType;
    
    return (
      <Button
        variant={isActive ? "default" : "outline"}
        onClick={() => setFilter(filterType)}
        className="relative"
        title={description}
      >
        {label}
        {count > 0 && (
          <Badge 
            variant={isActive ? "secondary" : "outline"} 
            className="ml-2 text-xs"
          >
            {count}
          </Badge>
        )}
      </Button>
    );
  };

  return (
    <div className="space-y-4">
      {/* Main Status Filters */}
      <div className="flex flex-wrap gap-2">
        <FilterButton 
          filterType="all" 
          label="All" 
          description="All leads" 
        />
        <FilterButton 
          filterType="new" 
          label="New" 
          description="New leads" 
        />
        <FilterButton 
          filterType="engaged" 
          label="Engaged" 
          description="Actively engaged leads" 
        />
        <FilterButton 
          filterType="paused" 
          label="Paused" 
          description="Paused leads" 
        />
        <FilterButton 
          filterType="closed" 
          label="Closed" 
          description="Closed leads" 
        />
        <FilterButton 
          filterType="lost" 
          label="Lost" 
          description="Lost leads" 
        />
      </div>

      {/* Contact Status Filters */}
      <div className="border-t pt-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Contact Status</h4>
        <div className="flex flex-wrap gap-2">
          <FilterButton 
            filterType="never_contacted" 
            label="Never Contacted" 
            description="Fresh leads with no messages" 
          />
          <FilterButton 
            filterType="not_messaged" 
            label="Not Messaged" 
            description="No outgoing messages sent" 
          />
          <FilterButton 
            filterType="messaged" 
            label="Messaged" 
            description="Have received outgoing messages" 
          />
          <FilterButton 
            filterType="needs_reply" 
            label="Needs Reply" 
            description="Has unread or unreplied messages" 
          />
        </div>
      </div>

      {/* AI Status Filters */}
      <div className="border-t pt-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">AI Status</h4>
        <div className="flex flex-wrap gap-2">
          <FilterButton 
            filterType="not_opted_in" 
            label="Not Opted In" 
            description="AI opt-in disabled" 
          />
          <FilterButton 
            filterType="messaged_not_opted_in" 
            label="Messaged + No AI" 
            description="Messaged but not opted into AI" 
          />
          <FilterButton 
            filterType="ai_paused" 
            label="AI Paused" 
            description="AI sequence paused" 
          />
          <FilterButton 
            filterType="replied_not_opted_in" 
            label="Replied + No AI" 
            description="Replied but not opted into AI" 
          />
        </div>
      </div>
    </div>
  );
}
