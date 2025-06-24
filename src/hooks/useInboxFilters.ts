
import { useState, useCallback, useMemo } from 'react';
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
  // Add properties that SmartFilters expects
  status: string[];
  aiOptIn: boolean;
  priority: string;
  assigned: string;
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
  sortBy: 'newest', // Default to newest first
  status: [],
  aiOptIn: false,
  priority: '',
  assigned: ''
};

export const useInboxFilters = (userId?: string, userRole?: string) => {
  const [filters, setFilters] = useState<InboxFilters>(defaultFilters);

  const updateFilter = useCallback(<K extends keyof InboxFilters>(
    key: K,
    value: InboxFilters[K]
  ) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({ ...defaultFilters, sortBy: 'newest' }); // Keep newest first as default
  }, []);

  const hasActiveFilters = useMemo(() => {
    return Object.keys(filters).some(key => {
      if (key === 'sortBy') return filters[key] !== 'newest'; // Default is newest
      if (key === 'dateRange') return filters[key] !== 'all';
      if (key === 'leadSource' || key === 'vehicleType' || key === 'priority' || key === 'assigned') return filters[key] !== '';
      if (key === 'status') return (filters[key] as string[]).length > 0;
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

    if (filters.assigned) {
      if (filters.assigned === 'assigned') {
        filtered = filtered.filter(conv => conv.salespersonId);
      } else if (filters.assigned === 'unassigned') {
        filtered = filtered.filter(conv => !conv.salespersonId);
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
          return bTime - aTime; // Newest first (default)
        case 'oldest':
          return aTime - bTime;
        case 'unread':
          return (b.unreadCount || 0) - (a.unreadCount || 0);
        case 'activity':
          return bTime - aTime; // Same as newest for now
        default:
          return bTime - aTime; // Default to newest first
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
    if (filters.assigned) summary.push(`Assigned: ${filters.assigned}`);
    if (filters.sortBy !== 'newest') summary.push(`Sort: ${filters.sortBy}`);
    
    return summary;
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
