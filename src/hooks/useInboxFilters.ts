
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

const getDefaultFilters = (userRole?: string): InboxFilters => ({
  status: [],
  aiOptIn: null,
  priority: null,
  assigned: userRole === 'admin' || userRole === 'manager' ? null : null, // Show all for admins
  search: '',
  unreadOnly: false,
  myLeadsOnly: false,
  unrepliedInboundOnly: false
});

export const useInboxFilters = (profileId?: string, userRole?: string) => {
  const [filters, setFilters] = useState<InboxFilters>(getDefaultFilters(userRole));

  const updateFilter = useCallback((key: keyof InboxFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(getDefaultFilters(userRole));
  }, [userRole]);

  const hasActiveFilters = useMemo(() => {
    const defaultFilters = getDefaultFilters(userRole);
    return filters.status.length > 0 || 
           filters.aiOptIn !== null || 
           filters.priority !== null || 
           filters.assigned !== defaultFilters.assigned ||
           filters.search.length > 0 ||
           filters.unreadOnly ||
           filters.myLeadsOnly ||
           filters.unrepliedInboundOnly;
  }, [filters, userRole]);

  const applyFilters = useCallback((conversations: any[]) => {
    console.log('🔍 [INBOX FILTERS] Applying filters with AGGRESSIVE admin bypass:', filters);
    console.log('🔍 [INBOX FILTERS] User role:', userRole);
    console.log('🔍 [INBOX FILTERS] Total conversations before filtering:', conversations.length);
    
    const isAdmin = userRole === 'admin' || userRole === 'manager';
    
    const filtered = conversations.filter(conv => {
      // Search filter (always applied)
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch = conv.leadName.toLowerCase().includes(searchLower) ||
                             conv.vehicleInterest.toLowerCase().includes(searchLower) ||
                             conv.leadPhone.includes(filters.search);
        if (!matchesSearch) return false;
      }

      // Status filter (always applied)
      if (filters.status.length > 0 && !filters.status.includes(conv.status)) {
        return false;
      }

      // AI opt-in filter (always applied)
      if (filters.aiOptIn !== null) {
        if (filters.aiOptIn && !conv.aiOptIn) return false;
        if (!filters.aiOptIn && conv.aiOptIn) return false;
      }

      // AGGRESSIVE ADMIN BYPASS: Admins see ALL conversations unless explicitly filtered
      if (isAdmin) {
        console.log('👑 [INBOX FILTERS] AGGRESSIVE ADMIN BYPASS - minimal filtering applied');
        
        // Only apply explicit user-requested filters for admins
        if (filters.unreadOnly && conv.unreadCount === 0) {
          return false;
        }

        if (filters.myLeadsOnly && conv.salespersonId !== profileId) {
          return false;
        }

        if (filters.unrepliedInboundOnly && !conv.hasUnrepliedInbound) {
          return false;
        }

        // Apply priority filter
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

        // Apply assignment filter only if explicitly set
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

        // ADMIN BYPASS: Return true for all other cases (including lost and unassigned)
        return true;
      }

      // Regular user filtering (existing logic)
      if (filters.unreadOnly && conv.unreadCount === 0) {
        return false;
      }

      if (filters.myLeadsOnly && profileId && conv.salespersonId !== profileId) {
        return false;
      }

      if (filters.unrepliedInboundOnly && !conv.hasUnrepliedInbound) {
        return false;
      }

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

    const hiddenCount = conversations.length - filtered.length;
    console.log('🔍 [INBOX FILTERS] Conversations after filtering:', filtered.length);
    console.log('🔍 [INBOX FILTERS] Hidden conversations:', hiddenCount);
    
    if (isAdmin) {
      console.log('👑 [INBOX FILTERS] ADMIN VIEW - should see lost and unassigned leads');
      
      // Debug admin-specific filtering
      const lostLeads = conversations.filter(c => c.status === 'lost');
      const unassignedLeads = conversations.filter(c => !c.salespersonId);
      const filteredLostLeads = filtered.filter(c => c.status === 'lost');
      const filteredUnassignedLeads = filtered.filter(c => !c.salespersonId);
      
      console.log('📊 [ADMIN DEBUG] Lost leads: total', lostLeads.length, 'filtered', filteredLostLeads.length);
      console.log('📊 [ADMIN DEBUG] Unassigned leads: total', unassignedLeads.length, 'filtered', filteredUnassignedLeads.length);
    }
    
    if (filters.unrepliedInboundOnly) {
      console.log('🔍 [INBOX FILTERS] Unreplied inbound filter active - showing conversations where customer sent last message');
    }
    
    return filtered;
  }, [filters, profileId, userRole]);

  const getFilterSummary = useCallback(() => {
    const activeFilters = [];
    if (filters.status.length > 0) activeFilters.push(`Status: ${filters.status.join(', ')}`);
    if (filters.aiOptIn !== null) activeFilters.push(`AI: ${filters.aiOptIn ? 'Enabled' : 'Disabled'}`);
    if (filters.priority) activeFilters.push(`Priority: ${filters.priority}`);
    if (filters.assigned) activeFilters.push(`Assignment: ${filters.assigned}`);
    if (filters.search) activeFilters.push(`Search: "${filters.search}"`);
    if (filters.unreadOnly) activeFilters.push('Unread only');
    if (filters.myLeadsOnly) activeFilters.push('My leads only');
    if (filters.unrepliedInboundOnly) activeFilters.push('Unreplied inbound only');
    
    return activeFilters;
  }, [filters]);

  return {
    filters,
    updateFilter,
    clearFilters,
    hasActiveFilters,
    applyFilters,
    getFilterSummary
  };
};
