
import { useState, useMemo } from "react";
import { Lead } from "@/types/lead";

export type SortField = 'name' | 'vehicle' | 'status' | 'salesperson' | 'engagement' | 'messages' | 'lastMessage';
export type SortDirection = 'asc' | 'desc';

type UseLeadsSortingOptions = {
  leads: Lead[];
  getEngagementScore: (lead: Lead) => number;
};

export function useLeadsSorting({ leads, getEngagementScore }: UseLeadsSortingOptions) {
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedLeads = useMemo(() => {
    return [...leads].sort((a, b) => {
      let aValue: any;
      let bValue: any;
      switch (sortField) {
        case 'name':
          aValue = `${a.firstName} ${a.lastName}`.toLowerCase();
          bValue = `${b.firstName} ${b.lastName}`.toLowerCase();
          break;
        case 'vehicle':
          aValue = a.vehicleInterest;
          bValue = b.vehicleInterest;
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'salesperson':
          aValue = a.salesperson;
          bValue = b.salesperson;
          break;
        case 'engagement':
          aValue = getEngagementScore(a);
          bValue = getEngagementScore(b);
          break;
        case 'messages':
          aValue = a.messageCount || 0;
          bValue = b.messageCount || 0;
          break;
        case 'lastMessage':
          aValue = a.lastMessageTime ? new Date(a.lastMessageTime) : new Date(0);
          bValue = b.lastMessageTime ? new Date(b.lastMessageTime) : new Date(0);
          break;
        default:
          return 0;
      }
      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [leads, sortField, sortDirection, getEngagementScore]);

  return { sortField, sortDirection, handleSort, sortedLeads };
}
