
import { useState, useCallback, useMemo, useEffect } from 'react';
import { useFilterPersistence } from './useFilterPersistence';
import type { ConversationListItem } from '@/types/conversation';

export interface InboxFilters {
  unreadOnly: boolean;
  assignedToMe: boolean;
  unassigned: boolean;
  lostLeads: boolean;
  aiPaused: boolean;
  dateRange: 'today' | 'week' | 'month' | 'all';
  leadSource: string;
  vehicleType: string;
  sortBy: 'newest' | 'oldest' | 'unread' | 'activity';
  status: string[];
  aiOptIn: boolean | null;
  priority: string | null;
  assigned: string | null;
  messageDirection: string | null;
}

const defaultFilters: InboxFilters = {
  unreadOnly: false,
  assignedToMe: false,
  unassigned: false,
  lostLeads: false,
  aiPaused: false,
  dateRange: 'all',
  leadSource: '',
  vehicleType: '',
  sortBy: 'newest',
  status: [],
  aiOptIn: null,
  priority: null,
  assigned: null,
  messageDirection: null,
};

/**
 * Hook for managing inbox filters with persistence and state management
 */
export const useInboxFilters = (userId?: string, userRole?: string) => {
  const {
    state: persistedFilters,
    saveState: savePersistentFilters,
    clearState: clearPersistentFilters,
    isLoaded: filtersLoaded
  } = useFilterPersistence(defaultFilters, 'inbox-filters-v1');

  const [filters, setFilters] = useState<InboxFilters>(defaultFilters);
  const [isRestored, setIsRestored] = useState(false);

  // Initialize filters from persisted state once loaded
  useEffect(() => {
    if (filtersLoaded) {
      setFilters(persistedFilters);
      
      const hasRestoredFilters = checkForActiveFilters(persistedFilters);
      setIsRestored(hasRestoredFilters);
      
      if (hasRestoredFilters) {
        console.log('🔄 [INBOX FILTERS] Restored saved filters:', persistedFilters);
      }
    }
  }, [filtersLoaded, persistedFilters]);

  const updateFilter = useCallback(<K extends keyof InboxFilters>(
    key: K,
    value: InboxFilters[K]
  ) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    savePersistentFilters(newFilters);
  }, [filters, savePersistentFilters]);

  const clearFilters = useCallback(() => {
    const clearedFilters = { ...defaultFilters, sortBy: 'newest' as const };
    setFilters(clearedFilters);
    clearPersistentFilters();
    setIsRestored(false);
  }, [clearPersistentFilters]);

  const hasActiveFilters = useMemo(() => {
    return checkForActiveFilters(filters);
  }, [filters]);

  const applyFilters = useCallback((conversations: ConversationListItem[]) => {
    let filtered = [...conversations];

    // Apply boolean filters
    if (filters.unreadOnly) {
      filtered = filtered.filter(conv => conv.unreadCount > 0);
    }

    if (filters.assignedToMe && userId) {
      filtered = filtered.filter(conv => conv.salespersonId === userId);
    }

    if (filters.unassigned) {
      filtered = filtered.filter(conv => !conv.salespersonId);
    }

    if (filters.lostLeads) {
      filtered = filtered.filter(conv => conv.status === 'lost');
    }

    if (filters.aiPaused) {
      filtered = filtered.filter(conv => conv.aiSequencePaused);
    }

    // Apply text-based filters
    if (filters.leadSource) {
      filtered = filtered.filter(conv => 
        conv.leadSource?.toLowerCase().includes(filters.leadSource.toLowerCase())
      );
    }

    if (filters.vehicleType) {
      filtered = filtered.filter(conv => 
        conv.vehicleInterest?.toLowerCase().includes(filters.vehicleType.toLowerCase())
      );
    }

    // Apply advanced filters
    filtered = applyAdvancedFilters(filtered, filters);

    // Apply date range filter
    filtered = applyDateRangeFilter(filtered, filters.dateRange);

    // Apply sorting
    filtered = applySorting(filtered, filters.sortBy);

    return filtered;
  }, [filters, userId]);

  const getFilterSummary = useCallback(() => {
    const summary: string[] = [];
    
    if (filters.unreadOnly) summary.push('Unread only');
    if (filters.assignedToMe) summary.push('Assigned to me');
    if (filters.unassigned) summary.push('Unassigned');
    if (filters.lostLeads) summary.push('Lost leads');
    if (filters.aiPaused) summary.push('AI paused');
    if (filters.dateRange !== 'all') summary.push(`Last ${filters.dateRange}`);
    if (filters.leadSource) summary.push(`Source: ${filters.leadSource}`);
    if (filters.vehicleType) summary.push(`Vehicle: ${filters.vehicleType}`);
    if (filters.status.length > 0) summary.push(`Status: ${filters.status.join(', ')}`);
    if (filters.aiOptIn !== null) summary.push(`AI: ${filters.aiOptIn ? 'Enabled' : 'Disabled'}`);
    if (filters.priority) summary.push(`Priority: ${filters.priority}`);
    if (filters.assigned) summary.push(`Assigned: ${filters.assigned}`);
    if (filters.messageDirection) summary.push(`Direction: ${filters.messageDirection}`);
    if (filters.sortBy !== 'newest') summary.push(`Sort: ${filters.sortBy}`);
    
    return summary;
  }, [filters]);

  return {
    filters,
    updateFilter,
    clearFilters,
    hasActiveFilters,
    applyFilters,
    getFilterSummary,
    isRestored,
    filtersLoaded
  };
};

/**
 * Check if any filters are active (non-default values)
 */
function checkForActiveFilters(filters: InboxFilters): boolean {
  return Object.keys(filters).some(key => {
    if (key === 'sortBy') return filters[key] !== 'newest';
    if (key === 'dateRange') return filters[key] !== 'all';
    if (key === 'leadSource' || key === 'vehicleType') return filters[key] !== '';
    if (key === 'status') return (filters[key] as string[]).length > 0;
    if (key === 'aiOptIn' || key === 'priority' || key === 'assigned' || key === 'messageDirection') {
      return filters[key as keyof InboxFilters] !== null;
    }
    return filters[key as keyof InboxFilters] === true;
  });
}

/**
 * Apply advanced filters to conversation list
 */
function applyAdvancedFilters(conversations: ConversationListItem[], filters: InboxFilters): ConversationListItem[] {
  let filtered = [...conversations];

  if (filters.status.length > 0) {
    filtered = filtered.filter(conv => 
      filters.status.includes(conv.status || '')
    );
  }

  if (filters.aiOptIn !== null) {
    filtered = filtered.filter(conv => 
      Boolean(conv.aiOptIn) === filters.aiOptIn
    );
  }

  if (filters.assigned) {
    if (filters.assigned === 'assigned') {
      filtered = filtered.filter(conv => conv.salespersonId);
    } else if (filters.assigned === 'unassigned') {
      filtered = filtered.filter(conv => !conv.salespersonId);
    }
  }

  if (filters.priority) {
    if (filters.priority === 'unread') {
      filtered = filtered.filter(conv => conv.unreadCount > 0);
    } else if (filters.priority === 'high') {
      filtered = filtered.filter(conv => conv.unreadCount > 2 || conv.status === 'engaged');
    } else if (filters.priority === 'responded') {
      filtered = filtered.filter(conv => conv.lastMessageDirection === 'out');
    }
  }

  if (filters.messageDirection) {
    if (filters.messageDirection === 'inbound') {
      filtered = filtered.filter(conv => conv.lastMessageDirection === 'in');
    } else if (filters.messageDirection === 'outbound') {
      filtered = filtered.filter(conv => conv.lastMessageDirection === 'out');
    } else if (filters.messageDirection === 'needs_response') {
      filtered = filtered.filter(conv => 
        conv.lastMessageDirection === 'in' && conv.unreadCount > 0
      );
    }
  }

  return filtered;
}

/**
 * Apply date range filter to conversation list
 */
function applyDateRangeFilter(conversations: ConversationListItem[], dateRange: InboxFilters['dateRange']): ConversationListItem[] {
  if (dateRange === 'all') return conversations;

  const now = new Date();
  const startDate = new Date();
  
  switch (dateRange) {
    case 'today':
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'week':
      startDate.setDate(now.getDate() - 7);
      break;
    case 'month':
      startDate.setDate(now.getDate() - 30);
      break;
  }
  
  return conversations.filter(conv => {
    const convDate = new Date(conv.lastMessageTime || conv.lastMessageDate);
    return convDate >= startDate;
  });
}

/**
 * Apply sorting to conversation list
 */
function applySorting(conversations: ConversationListItem[], sortBy: InboxFilters['sortBy']): ConversationListItem[] {
  return conversations.sort((a, b) => {
    const aTime = new Date(a.lastMessageTime || a.lastMessageDate).getTime();
    const bTime = new Date(b.lastMessageTime || b.lastMessageDate).getTime();
    
    switch (sortBy) {
      case 'newest':
        return bTime - aTime;
      case 'oldest':
        return aTime - bTime;
      case 'unread':
        return (b.unreadCount || 0) - (a.unreadCount || 0);
      case 'activity':
        return bTime - aTime;
      default:
        return bTime - aTime;
    }
  });
}
