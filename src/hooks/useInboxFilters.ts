
import { useState, useCallback, useMemo } from 'react';

export interface InboxFilters {
  status: string[];
  aiOptIn: boolean | null;
  priority: string | null;
  assigned: string | null;
  search: string;
  unreadOnly: boolean;
  myLeadsOnly: boolean;
  unrepliedInboundOnly: boolean;
}

const defaultFilters: InboxFilters = {
  status: [],
  aiOptIn: null,
  priority: null,
  assigned: null,
  search: '',
  unreadOnly: false,
  myLeadsOnly: false,
  unrepliedInboundOnly: false
};

export const useInboxFilters = (profileId?: string) => {
  const [filters, setFilters] = useState<InboxFilters>(defaultFilters);

  const updateFilter = useCallback((key: keyof InboxFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(defaultFilters);
  }, []);

  const hasActiveFilters = useMemo(() => {
    return filters.status.length > 0 || 
           filters.aiOptIn !== null || 
           filters.priority !== null || 
           filters.assigned !== null ||
           filters.search.length > 0 ||
           filters.unreadOnly ||
           filters.myLeadsOnly ||
           filters.unrepliedInboundOnly;
  }, [filters]);

  const applyFilters = useCallback((conversations: any[]) => {
    console.log('🔍 [INBOX FILTERS] Applying filters:', filters);
    console.log('🔍 [INBOX FILTERS] Total conversations before filtering:', conversations.length);
    
    const filtered = conversations.filter(conv => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch = conv.leadName.toLowerCase().includes(searchLower) ||
                             conv.vehicleInterest.toLowerCase().includes(searchLower) ||
                             conv.leadPhone.includes(filters.search);
        if (!matchesSearch) return false;
      }

      // Status filter
      if (filters.status.length > 0 && !filters.status.includes(conv.status)) {
        return false;
      }

      // AI opt-in filter
      if (filters.aiOptIn !== null) {
        if (filters.aiOptIn && !conv.aiOptIn) return false;
        if (!filters.aiOptIn && conv.aiOptIn) return false;
      }

      // Unread only filter
      if (filters.unreadOnly && conv.unreadCount === 0) {
        return false;
      }

      // My leads only filter
      if (filters.myLeadsOnly && profileId && conv.salespersonId !== profileId) {
        return false;
      }

      // Unreplied inbound messages filter - conversations where customer sent the last message
      if (filters.unrepliedInboundOnly && !conv.hasUnrepliedInbound) {
        return false;
      }

      // Priority filter
      if (filters.priority) {
        switch (filters.priority) {
          case 'high':
            if (conv.unreadCount < 3) return false;
            break;
          case 'unread':
            if (conv.unreadCount === 0) return false;
            break;
          case 'responded':
            if (conv.lastMessageDirection !== 'out') return false;
            break;
        }
      }

      // Assignment filter
      if (filters.assigned) {
        switch (filters.assigned) {
          case 'assigned':
            if (!conv.salespersonId) return false;
            break;
          case 'unassigned':
            if (conv.salespersonId) return false;
            break;
          case 'mine':
            if (conv.salespersonId !== profileId) return false;
            break;
        }
      }

      return true;
    });

    console.log('🔍 [INBOX FILTERS] Conversations after filtering:', filtered.length);
    if (filters.unrepliedInboundOnly) {
      console.log('🔍 [INBOX FILTERS] Unreplied inbound filter active - showing conversations where customer sent last message');
    }
    
    return filtered;
  }, [filters, profileId]);

  return {
    filters,
    updateFilter,
    clearFilters,
    hasActiveFilters,
    applyFilters
  };
};
