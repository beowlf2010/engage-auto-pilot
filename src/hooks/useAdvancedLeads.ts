
import { useState, useEffect, useMemo } from 'react';
import { Lead } from '@/types/lead';
import { useLeads } from '@/hooks/useLeads';
import { useFilterPersistence } from '@/hooks/useFilterPersistence';

export interface SearchFilters {
  searchTerm: string;
  status?: string;
  source?: string;
  aiOptIn?: boolean;
  activeNotOptedIn?: boolean; // New filter for active leads not opted into AI
  contactStatus?: string;
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
  const { leads, loading, error, refetch } = useLeads();
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
    if (!filtersLoaded) return []; // Don't filter until filters are loaded
    
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

    // Apply Active Not Opted In filter
    if (searchFilters.activeNotOptedIn) {
      filtered = filtered.filter(lead => 
        // Must be active status (not lost, paused, or closed)
        (lead.status === 'new' || lead.status === 'engaged') &&
        // Must not be opted into AI
        !lead.aiOptIn &&
        // Must not have do-not-contact restrictions
        !lead.doNotCall && !lead.doNotEmail && !lead.doNotMail &&
        // Must not be hidden
        !lead.is_hidden
      );
    }

    // Enhanced status-based filtering with special handling for lost leads and do not contact
    if (statusFilter !== 'all') {
      switch (statusFilter) {
        case 'new':
          // Only show leads with no contact attempted and not lost or do-not-contact
          filtered = filtered.filter(lead => 
            lead.contactStatus === 'no_contact' && 
            lead.status !== 'lost' &&
            !lead.doNotCall && !lead.doNotEmail && !lead.doNotMail
          );
          break;
        case 'engaged':
          // Show leads that have received responses or are marked as engaged
          filtered = filtered.filter(lead => 
            (lead.contactStatus === 'response_received' || lead.status === 'engaged') && 
            lead.status !== 'lost'
          );
          break;
        case 'paused':
          filtered = filtered.filter(lead => lead.status === 'paused');
          break;
        case 'closed':
          filtered = filtered.filter(lead => lead.status === 'closed');
          break;
        case 'lost':
          // Only show lost leads in the Lost tab
          filtered = filtered.filter(lead => lead.status === 'lost');
          break;
        case 'do_not_contact':
          // Show leads with any do-not-contact restrictions
          filtered = filtered.filter(lead => 
            lead.doNotCall || lead.doNotEmail || lead.doNotMail
          );
          break;
        default:
          // For any other status filter
          filtered = filtered.filter(lead => lead.status === statusFilter);
      }
    } else {
      // For "All" tab: exclude lost leads and do-not-contact leads unless searching by name/phone
      if (!isSearchingByNameOrPhone && !searchFilters.activeNotOptedIn) {
        filtered = filtered.filter(lead => 
          lead.status !== 'lost' && 
          !lead.doNotCall && !lead.doNotEmail && !lead.doNotMail
        );
      }
    }

    // Apply other search filters only if tab status is 'all' (to avoid conflicts)
    if (statusFilter === 'all' && searchFilters.status && !isSearchingByNameOrPhone) {
      filtered = filtered.filter(lead => lead.status === searchFilters.status);
    }

    // Contact status filter (only apply if not conflicting with tab-based filtering)
    if (searchFilters.contactStatus && statusFilter === 'all') {
      filtered = filtered.filter(lead => lead.contactStatus === searchFilters.contactStatus);
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
  }, [leads, statusFilter, searchFilters, filtersLoaded]);

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
      statusFilter: 'all' // Reset status filter when loading preset
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
    loadingProgress: 0, // Add default value for compatibility
    selectedLeads,
    quickViewLead,
    savedPresets,
    statusFilter,
    searchFilters,
    filtersLoaded, // Expose filter loading state
    
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
    retry: refetch, // Map refetch to retry for compatibility
    
    // Utilities
    getEngagementScore
  };
};
