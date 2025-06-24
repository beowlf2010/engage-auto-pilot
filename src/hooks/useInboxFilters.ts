
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
  // Properties that SmartFilters expects
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
      
      // Check if any filters were actually restored
      const hasRestoredFilters = Object.keys(persistedFilters).some(key => {
        if (key === 'sortBy') return persistedFilters[key] !== 'newest';
        if (key === 'dateRange') return persistedFilters[key] !== 'all';
        if (key === 'leadSource' || key === 'vehicleType') return persistedFilters[key] !== '';
        if (key === 'status') return (persistedFilters[key] as string[]).length > 0;
        if (key === 'aiOptIn' || key === 'priority' || key === 'assigned' || key === 'messageDirection') {
          return persistedFilters[key] !== null;
        }
        return persistedFilters[key as keyof InboxFilters] === true;
      });
      
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
    console.log(`🔧 [INBOX FILTERS] Updated filter ${key}:`, value);
  }, [filters, savePersistentFilters]);

  const clearFilters = useCallback(() => {
    const clearedFilters = { ...defaultFilters, sortBy: 'newest' as const };
    setFilters(clearedFilters);
    clearPersistentFilters();
    setIsRestored(false);
    console.log('🗑️ [INBOX FILTERS] Cleared all filters');
  }, [clearPersistentFilters]);

  const hasActiveFilters = useMemo(() => {
    return Object.keys(filters).some(key => {
      if (key === 'sortBy') return filters[key] !== 'newest';
      if (key === 'dateRange') return filters[key] !== 'all';
      if (key === 'leadSource' || key === 'vehicleType') return filters[key] !== '';
      if (key === 'status') return (filters[key] as string[]).length > 0;
      if (key === 'aiOptIn' || key === 'priority' || key === 'assigned' || key === 'messageDirection') {
        return filters[key] !== null;
      }
      return filters[key as keyof InboxFilters] === true;
    });
  }, [filters]);

  const applyFilters = useCallback((conversations: ConversationListItem[]) => {
    let filtered = [...conversations];

    // Apply filters
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

    // Apply new filter properties
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

    // Apply date range filter
    if (filters.dateRange !== 'all') {
      const now = new Date();
      const startDate = new Date();
      
      switch (filters.dateRange) {
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
      
      filtered = filtered.filter(conv => {
        const convDate = new Date(conv.lastMessageTime || conv.lastMessageDate);
        return convDate >= startDate;
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      const aTime = new Date(a.lastMessageTime || a.lastMessageDate).getTime();
      const bTime = new Date(b.lastMessageTime || b.lastMessageDate).getTime();
      
      switch (filters.sortBy) {
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
