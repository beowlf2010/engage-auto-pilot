import { useState, useEffect, useMemo } from 'react';
import { Lead } from '@/types/lead';
import { useLeads } from '@/hooks/useLeads';
import { useFilterPersistence } from '@/hooks/useFilterPersistence';

export interface SearchFilters {
  searchTerm: string;
  status?: string;
  source?: string;
  aiOptIn?: boolean;
  activeNotOptedIn?: boolean;
  dateFilter?: 'today' | 'yesterday' | 'this_week' | 'all';
  vehicleInterest?: string;
  city?: string;
  state?: string;
  engagementScoreMin?: number;
  engagementScoreMax?: number;
  doNotContact?: boolean;
}

export interface SavedPreset {
  id: string;
  name: string;
  filters: SearchFilters;
  createdAt: string;
}

// Combined persistent filter state
interface PersistentFilterState {
  searchFilters: SearchFilters;
  statusFilter: string;
}

const DEFAULT_FILTERS: PersistentFilterState = {
  searchFilters: { 
    searchTerm: '',
    dateFilter: 'all'
  },
  statusFilter: 'all'
};

export const useAdvancedLeads = () => {
  const { leads, loading, error, refetch, showHidden } = useLeads();
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [quickViewLead, setQuickViewLead] = useState<Lead | null>(null);
  const [savedPresets, setSavedPresets] = useState<SavedPreset[]>([]);
  
  // Use persistent filters
  const {
    state: persistentFilters,
    saveState: savePersistentFilters,
    clearState: clearPersistentFilters,
    isLoaded: filtersLoaded
  } = useFilterPersistence<PersistentFilterState>(DEFAULT_FILTERS, 'leads-filters-v1');

  // Extract individual states for compatibility
  const searchFilters = persistentFilters.searchFilters;
  const statusFilter = persistentFilters.statusFilter;

  // Load saved presets from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('lead-filter-presets');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSavedPresets(parsed);
      } catch (error) {
        console.error('Error loading saved presets:', error);
      }
    }
  }, []);

  // Calculate engagement score for a lead
  const getEngagementScore = (lead: Lead) => {
    let score = 0;
    if (lead.incomingCount > 0) score += 40;
    if (lead.outgoingCount > 0) score += 20;
    if (lead.lastMessageTime) score += 20;
    if (lead.aiOptIn) score += 10;
    if (lead.status === 'engaged') score += 10;
    return Math.min(score, 100);
  };

  // Filter leads based on current filters and status
  const filteredLeads = useMemo(() => {
    if (!filtersLoaded) return [];
    
    let filtered = [...leads];
    
    // Check if user is searching by name or phone number
    const isSearchingByNameOrPhone = searchFilters.searchTerm && (
      /^[\d\s\-\(\)\+]+$/.test(searchFilters.searchTerm) || // Phone number pattern
      /^[a-zA-Z\s]+$/.test(searchFilters.searchTerm) // Name pattern
    );

    // Apply search term filter first
    if (searchFilters.searchTerm) {
      const searchTerm = searchFilters.searchTerm.toLowerCase();
      filtered = filtered.filter(lead => 
        lead.firstName.toLowerCase().includes(searchTerm) ||
        lead.lastName.toLowerCase().includes(searchTerm) ||
        lead.email?.toLowerCase().includes(searchTerm) ||
        lead.primaryPhone?.includes(searchTerm) ||
        lead.vehicleInterest.toLowerCase().includes(searchTerm)
      );
    }

    // Handle hidden tab specifically
    if (statusFilter === 'hidden') {
      // Show only hidden leads
      filtered = filtered.filter(lead => lead.is_hidden);
    } else {
      // For all other tabs, exclude hidden leads unless searching by name/phone
      if (!isSearchingByNameOrPhone) {
        filtered = filtered.filter(lead => !lead.is_hidden);
      }
    }

    // Apply Active Not Opted In filter
    if (searchFilters.activeNotOptedIn) {
      filtered = filtered.filter(lead => 
        // Must be active status (not lost, paused, or closed) - including 'active' status
        (lead.status === 'new' || lead.status === 'engaged' || lead.status === 'active') &&
        // Must not be opted into AI
        !lead.aiOptIn &&
        // Must not have do-not-contact restrictions
        !lead.doNotCall && !lead.doNotEmail && !lead.doNotMail &&
        // Must not be hidden
        !lead.is_hidden
      );
    }

    // Enhanced status-based filtering with new tab support
    if (statusFilter !== 'all' && statusFilter !== 'hidden') {
      switch (statusFilter) {
        case 'new':
          // Show leads with 'new' status, excluding lost leads and do-not-contact
          filtered = filtered.filter(lead => 
            lead.status === 'new' &&
            !lead.doNotCall && !lead.doNotEmail && !lead.doNotMail
          );
          break;
        case 'needs_ai':
          // Leads that are active but not opted into AI
          filtered = filtered.filter(lead => 
            (lead.status === 'new' || lead.status === 'engaged' || lead.status === 'active') &&
            !lead.aiOptIn &&
            !lead.doNotCall && !lead.doNotEmail && !lead.doNotMail
          );
          break;
        case 'engaged':
          // Show leads with 'engaged' status, excluding lost leads
          filtered = filtered.filter(lead => 
            lead.status === 'engaged'
          );
          break;
        case 'sold_customers':
          // Filter for sold customers
          filtered = filtered.filter(lead => 
            lead.source?.toLowerCase().includes('sold') || 
            (lead.status === 'closed' && lead.aiPauseReason === 'marked_sold')
          );
          break;
        case 'paused':
          filtered = filtered.filter(lead => lead.status === 'paused');
          break;
        case 'closed':
          filtered = filtered.filter(lead => lead.status === 'closed');
          break;
        case 'lost':
          filtered = filtered.filter(lead => lead.status === 'lost');
          break;
        case 'do_not_contact':
          filtered = filtered.filter(lead => 
            lead.doNotCall || lead.doNotEmail || lead.doNotMail
          );
          break;
        default:
          filtered = filtered.filter(lead => lead.status === statusFilter);
      }
    } else if (statusFilter === 'all') {
      // For "All" tab: include new, engaged, active, paused, closed - exclude only lost leads and do-not-contact leads unless searching by name/phone
      if (!isSearchingByNameOrPhone && !searchFilters.activeNotOptedIn) {
        filtered = filtered.filter(lead => 
          // Include all active statuses
          (lead.status === 'new' || lead.status === 'engaged' || lead.status === 'active' || lead.status === 'paused' || lead.status === 'closed') &&
          // Exclude lost leads
          lead.status !== 'lost' && 
          // Exclude do-not-contact leads
          !lead.doNotCall && !lead.doNotEmail && !lead.doNotMail
        );
      }
    }

    // Apply other search filters only if tab status is 'all' or 'hidden' (to avoid conflicts)
    if ((statusFilter === 'all' || statusFilter === 'hidden') && searchFilters.status && !isSearchingByNameOrPhone) {
      filtered = filtered.filter(lead => lead.status === searchFilters.status);
    }

    // Do not contact filter
    if (searchFilters.doNotContact !== undefined) {
      if (searchFilters.doNotContact) {
        filtered = filtered.filter(lead => lead.doNotCall || lead.doNotEmail || lead.doNotMail);
      } else {
        filtered = filtered.filter(lead => !lead.doNotCall && !lead.doNotEmail && !lead.doNotMail);
      }
    }

    // Source filter
    if (searchFilters.source) {
      filtered = filtered.filter(lead => lead.source === searchFilters.source);
    }

    // AI opt-in filter
    if (searchFilters.aiOptIn !== undefined) {
      filtered = filtered.filter(lead => lead.aiOptIn === searchFilters.aiOptIn);
    }

    // Date filter
    if (searchFilters.dateFilter && searchFilters.dateFilter !== 'all') {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);

      filtered = filtered.filter(lead => {
        const leadDate = new Date(lead.createdAt);
        
        switch (searchFilters.dateFilter) {
          case 'today':
            return today.toDateString() === leadDate.toDateString();
          case 'yesterday':
            return yesterday.toDateString() === leadDate.toDateString();
          case 'this_week':
            return leadDate >= weekAgo;
          default:
            return true;
        }
      });
    }

    // Vehicle interest filter
    if (searchFilters.vehicleInterest) {
      filtered = filtered.filter(lead => 
        lead.vehicleInterest?.toLowerCase().includes(searchFilters.vehicleInterest!.toLowerCase())
      );
    }

    // City filter
    if (searchFilters.city) {
      filtered = filtered.filter(lead => 
        lead.city?.toLowerCase().includes(searchFilters.city!.toLowerCase())
      );
    }

    // State filter
    if (searchFilters.state) {
      filtered = filtered.filter(lead => 
        lead.state?.toLowerCase().includes(searchFilters.state!.toLowerCase())
      );
    }

    // Engagement score filter
    if (searchFilters.engagementScoreMin !== undefined || searchFilters.engagementScoreMax !== undefined) {
      filtered = filtered.filter(lead => {
        const score = getEngagementScore(lead);
        const min = searchFilters.engagementScoreMin ?? 0;
        const max = searchFilters.engagementScoreMax ?? 100;
        return score >= min && score <= max;
      });
    }

    return filtered;
  }, [leads, statusFilter, searchFilters, filtersLoaded, showHidden]);

  const savePreset = (name: string, filters: SearchFilters) => {
    const newPreset: SavedPreset = {
      id: Date.now().toString(),
      name,
      filters,
      createdAt: new Date().toISOString()
    };
    const newPresets = [...savedPresets, newPreset];
    setSavedPresets(newPresets);
    localStorage.setItem('lead-filter-presets', JSON.stringify(newPresets));
  };

  const loadPreset = (preset: SavedPreset) => {
    const newState = {
      searchFilters: preset.filters,
      statusFilter: 'all'
    };
    savePersistentFilters(newState);
  };

  const clearFilters = () => {
    clearPersistentFilters();
    setSelectedLeads([]);
  };

  const setStatusFilter = (status: string) => {
    const newState = {
      ...persistentFilters,
      statusFilter: status
    };
    savePersistentFilters(newState);
  };

  const setSearchFilters = (filters: SearchFilters) => {
    const newState = {
      ...persistentFilters,
      searchFilters: filters
    };
    savePersistentFilters(newState);
  };

  const selectAllFiltered = () => {
    setSelectedLeads(filteredLeads.map(lead => lead.id.toString()));
  };

  const clearSelection = () => {
    setSelectedLeads([]);
  };

  const toggleLeadSelection = (leadId: string) => {
    setSelectedLeads(prev => 
      prev.includes(leadId) 
        ? prev.filter(id => id !== leadId)
        : [...prev, leadId]
    );
  };

  const showQuickView = (lead: Lead) => {
    setQuickViewLead(lead);
  };

  const hideQuickView = () => {
    setQuickViewLead(null);
  };

  return {
    // Data
    leads: filteredLeads,
    loading,
    error,
    loadingProgress: 0,
    selectedLeads,
    quickViewLead,
    savedPresets,
    statusFilter,
    searchFilters,
    filtersLoaded,
    
    // Actions
    setStatusFilter,
    setSearchFilters,
    savePreset,
    loadPreset,
    clearFilters,
    selectAllFiltered,
    clearSelection,
    toggleLeadSelection,
    showQuickView,
    hideQuickView,
    refetch,
    retry: refetch,
    
    // Utilities
    getEngagementScore
  };
};
