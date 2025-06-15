
import { useState, useMemo } from "react";
import { Lead } from "@/types/lead";

export type SortField = 'name' | 'status' | 'contactStatus' | 'createdAt' | 'lastMessage' | 'engagementScore';
export type SortDirection = 'asc' | 'desc';

type UseLeadsSortingOptions = {
  leads: Lead[];
  getEngagementScore: (lead: Lead) => number;
};

export function useLeadsSorting({ leads, getEngagementScore }: UseLeadsSortingOptions) {
  const [sortField, setSortField] = useState<SortField>('createdAt');
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
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'contactStatus':
          aValue = a.contactStatus;
          bValue = b.contactStatus;
          break;
        case 'createdAt':
          aValue = new Date(a.createdAt);
          bValue = new Date(b.createdAt);
          break;
        case 'lastMessage':
          aValue = a.lastMessageTime ? new Date(a.lastMessageTime) : new Date(0);
          bValue = b.lastMessageTime ? new Date(b.lastMessageTime) : new Date(0);
          break;
        case 'engagementScore':
          aValue = getEngagementScore(a);
          bValue = getEngagementScore(b);
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
