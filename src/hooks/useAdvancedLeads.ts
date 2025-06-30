
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { processLeadData } from './leads/useLeadsDataProcessor';
import { Lead } from '@/types/lead';

export interface SearchFilters {
  searchTerm: string;
  dateFilter: string;
  source?: string;
  aiOptIn?: boolean;
  vehicleInterest?: string;
  city?: string;
  state?: string;
  engagementScoreMin?: number;
  engagementScoreMax?: number;
  doNotContact?: boolean;
  activeNotOptedIn?: boolean;
  status?: string;
}

export const useAdvancedLeads = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [quickViewLead, setQuickViewLead] = useState<Lead | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [filtersLoaded, setFiltersLoaded] = useState(false);
  
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({
    searchTerm: '',
    dateFilter: 'all'
  });

  const fetchLeads = useCallback(async () => {
    try {
      setLoading(true);
      
      const { data: leadsData, error } = await supabase
        .from('leads')
        .select(`
          *,
          phone_numbers (
            id,
            number,
            type,
            priority,
            status,
            is_primary
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching leads:', error);
        throw error;
      }

      if (leadsData) {
        const processedLeads = processLeadData(leadsData, []);
        setLeads(processedLeads);
      }
    } catch (error) {
      console.error('Error in fetchLeads:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const refetch = useCallback(() => {
    return fetchLeads();
  }, [fetchLeads]);

  useEffect(() => {
    const initializeData = async () => {
      await fetchLeads();
      setFiltersLoaded(true);
    };
    
    initializeData();
  }, [fetchLeads]);

  // Filter leads based on status and search criteria
  const finalFilteredLeads = useMemo(() => {
    let filtered = [...leads];

    // Apply search filters first
    if (searchFilters.searchTerm) {
      const searchTerm = searchFilters.searchTerm.toLowerCase();
      filtered = filtered.filter(lead => 
        lead.firstName?.toLowerCase().includes(searchTerm) ||
        lead.lastName?.toLowerCase().includes(searchTerm) ||
        lead.email?.toLowerCase().includes(searchTerm) ||
        lead.vehicleInterest?.toLowerCase().includes(searchTerm) ||
        lead.phoneNumbers?.some(phone => phone.number.includes(searchTerm))
      );
    }

    // Determine if we're searching by name or phone
    const isSearchingByNameOrPhone = searchFilters.searchTerm && (
      /^[\d\s\-\(\)\+]+$/.test(searchFilters.searchTerm) || // Phone number pattern
      /^[a-zA-Z\s]+$/.test(searchFilters.searchTerm) // Name pattern
    );

    // Apply status filter
    if (statusFilter === 'needs_ai') {
      // Show leads that are active but not opted into AI
      filtered = filtered.filter(lead => 
        (lead.status === 'new' || lead.status === 'engaged' || lead.status === 'active') && 
        !lead.aiOptIn &&
        !lead.doNotCall && !lead.doNotEmail && !lead.doNotMail
      );
    } else if (statusFilter === 'do_not_contact') {
      // Show leads with any do not contact restrictions
      filtered = filtered.filter(lead => 
        lead.doNotCall || lead.doNotEmail || lead.doNotMail
      );
    } else if (statusFilter === 'hidden') {
      // Show hidden leads
      filtered = filtered.filter(lead => lead.is_hidden === true);
    } else if (statusFilter === 'sold_customers') {
      // Show sold customers - this would need to be implemented based on your business logic
      // For now, filtering by a hypothetical 'sold' status or similar
      filtered = filtered.filter(lead => lead.status === 'closed');
    } else if (statusFilter !== 'all') {
      // For specific status filters
      if (statusFilter === 'active') {
        // If there's an 'active' filter, show only active leads
        filtered = filtered.filter(lead => lead.status === 'active');
      } else {
        // For other specific statuses (new, engaged, paused, closed, lost)
        filtered = filtered.filter(lead => lead.status === statusFilter);
      }
    } else if (statusFilter === 'all') {
      // For "All" tab: include new, engaged, active, paused, closed - exclude only lost leads and do-not-contact leads unless searching by name/phone
      if (!isSearchingByNameOrPhone && !searchFilters.activeNotOptedIn) {
        filtered = filtered.filter(lead => 
          // Include all active statuses, exclude lost and do-not-contact
          lead.status !== 'lost' && 
          !lead.doNotCall && !lead.doNotEmail && !lead.doNotMail
        );
      }
    }

    // Apply other search filters
    if (searchFilters.dateFilter !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      filtered = filtered.filter(lead => {
        const leadDate = new Date(lead.createdAt);
        const leadDateOnly = new Date(leadDate.getFullYear(), leadDate.getMonth(), leadDate.getDate());
        
        switch (searchFilters.dateFilter) {
          case 'today':
            return leadDateOnly.getTime() === today.getTime();
          case 'yesterday':
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            return leadDateOnly.getTime() === yesterday.getTime();
          case 'this_week':
            const weekStart = new Date(today);
            weekStart.setDate(today.getDate() - today.getDay());
            return leadDate >= weekStart;
          default:
            return true;
        }
      });
    }

    if (searchFilters.source) {
      filtered = filtered.filter(lead => 
        lead.source?.toLowerCase().includes(searchFilters.source!.toLowerCase())
      );
    }

    if (searchFilters.aiOptIn !== undefined) {
      filtered = filtered.filter(lead => lead.aiOptIn === searchFilters.aiOptIn);
    }

    if (searchFilters.vehicleInterest) {
      filtered = filtered.filter(lead => 
        lead.vehicleInterest?.toLowerCase().includes(searchFilters.vehicleInterest!.toLowerCase())
      );
    }

    if (searchFilters.city) {
      filtered = filtered.filter(lead => 
        lead.city?.toLowerCase().includes(searchFilters.city!.toLowerCase())
      );
    }

    if (searchFilters.state) {
      filtered = filtered.filter(lead => 
        lead.state?.toLowerCase().includes(searchFilters.state!.toLowerCase())
      );
    }

    if (searchFilters.doNotContact !== undefined) {
      filtered = filtered.filter(lead => {
        const hasDoNotContact = lead.doNotCall || lead.doNotEmail || lead.doNotMail;
        return searchFilters.doNotContact ? hasDoNotContact : !hasDoNotContact;
      });
    }

    if (searchFilters.activeNotOptedIn) {
      filtered = filtered.filter(lead => 
        (lead.status === 'new' || lead.status === 'engaged' || lead.status === 'active') && 
        !lead.aiOptIn
      );
    }

    return filtered;
  }, [leads, statusFilter, searchFilters]);

  // Lead selection functions
  const selectAllFiltered = useCallback(() => {
    const filteredIds = finalFilteredLeads.map(lead => lead.id.toString());
    setSelectedLeads(filteredIds);
  }, [finalFilteredLeads]);

  const clearSelection = useCallback(() => {
    setSelectedLeads([]);
  }, []);

  const toggleLeadSelection = useCallback((leadId: string) => {
    setSelectedLeads(prev => 
      prev.includes(leadId) 
        ? prev.filter(id => id !== leadId)
        : [...prev, leadId]
    );
  }, []);

  // Quick view functions
  const showQuickView = useCallback((lead: Lead) => {
    setQuickViewLead(lead);
  }, []);

  const hideQuickView = useCallback(() => {
    setQuickViewLead(null);
  }, []);

  // Clear filters function
  const clearFilters = useCallback(() => {
    setSearchFilters({
      searchTerm: '',
      dateFilter: 'all'
    });
    setStatusFilter('all');
  }, []);

  // Engagement score calculation
  const getEngagementScore = useCallback((lead: Lead) => {
    let score = 0;
    
    // Base score for having contact info
    if (lead.email) score += 10;
    if (lead.phoneNumbers && lead.phoneNumbers.length > 0) score += 10;
    
    // AI engagement
    if (lead.aiOptIn) score += 20;
    
    // Recent activity (within last 7 days)
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);
    if (new Date(lead.createdAt) > lastWeek) score += 15;
    
    // Vehicle interest specificity
    if (lead.vehicleInterest && lead.vehicleInterest.length > 10) score += 10;
    
    // Contact preferences (not having do-not-contact flags)
    if (!lead.doNotCall && !lead.doNotEmail && !lead.doNotMail) score += 15;
    
    return Math.min(score, 100);
  }, []);

  return {
    leads: finalFilteredLeads,
    loading,
    selectedLeads,
    quickViewLead,
    statusFilter,
    searchFilters,
    savedPresets: [], // Empty array since we removed preset functionality
    filtersLoaded,
    setStatusFilter,
    setSearchFilters,
    clearFilters,
    selectAllFiltered,
    clearSelection,
    toggleLeadSelection,
    showQuickView,
    hideQuickView,
    savePreset: () => {}, // No-op function
    loadPreset: () => {}, // No-op function
    getEngagementScore,
    refetch
  };
};
