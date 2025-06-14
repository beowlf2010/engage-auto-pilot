
import { useState, useEffect, useMemo } from 'react';
import { Lead } from '@/types/lead';
import { useLeads } from '@/hooks/useLeads';
import { FilterOptions } from '@/components/leads/AdvancedFilters';

export const useAdvancedLeads = () => {
  const { leads, loading, refetch } = useLeads();
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [quickViewLead, setQuickViewLead] = useState<Lead | null>(null);
  const [savedPresets, setSavedPresets] = useState<Array<{ name: string; filters: FilterOptions }>>([]);
  
  const defaultFilters: FilterOptions = {
    status: [],
    contactStatus: [],
    source: [],
    aiOptIn: null,
    dateRange: { from: null, to: null },
    vehicleInterest: '',
    city: '',
    state: '',
    engagementScore: { min: null, max: null }
  };

  const [filters, setFilters] = useState<FilterOptions>(defaultFilters);

  // Load saved presets from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('lead-filter-presets');
    if (saved) {
      try {
        setSavedPresets(JSON.parse(saved));
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

  // Filter leads based on current filters
  const filteredLeads = useMemo(() => {
    let filtered = [...leads];

    // Status filter
    if (filters.status.length > 0) {
      filtered = filtered.filter(lead => filters.status.includes(lead.status));
    }

    // Contact status filter
    if (filters.contactStatus.length > 0) {
      filtered = filtered.filter(lead => filters.contactStatus.includes(lead.contactStatus));
    }

    // AI opt-in filter
    if (filters.aiOptIn !== null) {
      filtered = filtered.filter(lead => lead.aiOptIn === filters.aiOptIn);
    }

    // Date range filter
    if (filters.dateRange.from) {
      filtered = filtered.filter(lead => 
        new Date(lead.createdAt) >= filters.dateRange.from!
      );
    }
    if (filters.dateRange.to) {
      filtered = filtered.filter(lead => 
        new Date(lead.createdAt) <= filters.dateRange.to!
      );
    }

    // Vehicle interest filter
    if (filters.vehicleInterest) {
      filtered = filtered.filter(lead => 
        lead.vehicleInterest?.toLowerCase().includes(filters.vehicleInterest.toLowerCase())
      );
    }

    // City filter
    if (filters.city) {
      filtered = filtered.filter(lead => 
        lead.city?.toLowerCase().includes(filters.city.toLowerCase())
      );
    }

    // State filter
    if (filters.state) {
      filtered = filtered.filter(lead => 
        lead.state?.toLowerCase().includes(filters.state.toLowerCase())
      );
    }

    // Engagement score filter
    if (filters.engagementScore.min !== null || filters.engagementScore.max !== null) {
      filtered = filtered.filter(lead => {
        const score = getEngagementScore(lead);
        const min = filters.engagementScore.min ?? 0;
        const max = filters.engagementScore.max ?? 100;
        return score >= min && score <= max;
      });
    }

    return filtered;
  }, [leads, filters]);

  const savePreset = (name: string, filterOptions: FilterOptions) => {
    const newPresets = [...savedPresets, { name, filters: filterOptions }];
    setSavedPresets(newPresets);
    localStorage.setItem('lead-filter-presets', JSON.stringify(newPresets));
  };

  const loadPreset = (filterOptions: FilterOptions) => {
    setFilters(filterOptions);
  };

  const clearFilters = () => {
    setFilters(defaultFilters);
    setSelectedLeads([]);
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
    selectedLeads,
    quickViewLead,
    savedPresets,
    filters,
    
    // Actions
    setFilters,
    savePreset,
    loadPreset,
    clearFilters,
    selectAllFiltered,
    clearSelection,
    toggleLeadSelection,
    showQuickView,
    hideQuickView,
    refetch,
    
    // Utilities
    getEngagementScore
  };
};
