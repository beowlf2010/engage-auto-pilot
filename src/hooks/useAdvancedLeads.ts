import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Lead } from '@/types/lead';
import { useAuth } from '@/components/auth/AuthProvider';
import { useToast } from '@/hooks/use-toast';

export interface SearchFilters {
  searchTerm: string;
  dateFilter: 'all' | 'today' | 'yesterday' | 'this_week';
  source?: string;
  aiOptIn?: boolean;
  vehicleInterest?: string;
  city?: string;
  state?: string;
  engagementScoreMin?: number;
  engagementScoreMax?: number;
  doNotContact?: boolean;
  status?: string;
  activeNotOptedIn?: boolean;
}

export interface SavedPreset {
  id: string;
  name: string;
  filters: SearchFilters;
  created_at: string;
}

const ITEMS_PER_PAGE = 20;

export const useAdvancedLeads = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);
  const [finalFilteredLeads, setFinalFilteredLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [quickViewLead, setQuickViewLead] = useState<Lead | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({
    searchTerm: '',
    dateFilter: 'all'
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalLeads, setTotalLeads] = useState(0);
  const [filtersLoaded, setFiltersLoaded] = useState(false);
  const [savedPresets, setSavedPresets] = useState<SavedPreset[]>([]);
  const { profile } = useAuth();
  const { toast } = useToast();

  // Load saved presets on mount
  useEffect(() => {
    const loadPresets = async () => {
      if (!profile) return;
      try {
        const { data, error } = await supabase
          .from('lead_search_presets')
          .select('*')
          .eq('user_id', profile.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error loading saved presets:', error);
        } else {
          setSavedPresets(data || []);
        }
      } catch (err) {
        console.error('Error loading saved presets:', err);
      }
    };

    loadPresets();
  }, [profile]);

  // Save a search preset
  const saveSearchPreset = async (name: string, filters: SearchFilters) => {
    if (!profile) return;
    try {
      const { data, error } = await supabase
        .from('lead_search_presets')
        .insert([{
          user_id: profile.id,
          name: name,
          filters: filters
        }])
        .select('*')
        .single();

      if (error) {
        console.error('Error saving search preset:', error);
        toast({
          title: "Error saving preset",
          description: "Failed to save the search preset. Please try again.",
          variant: "destructive"
        });
      } else {
        setSavedPresets(prev => [data, ...prev]);
        toast({
          title: "Preset saved",
          description: "Your search preset has been saved successfully.",
        });
      }
    } catch (err) {
      console.error('Error saving search preset:', err);
      toast({
        title: "Error saving preset",
        description: "Failed to save the search preset. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Load a search preset
  const loadSearchPreset = (preset: SavedPreset) => {
    setSearchFilters(preset.filters);
  };

  // Fetch leads from Supabase
  const fetchLeads = useCallback(async () => {
    if (!profile) return;

    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('leads')
        .select('*', { count: 'exact' })
        .eq('salesperson_id', profile.id)
        .order('created_at', { ascending: false });

      if (searchFilters.activeNotOptedIn) {
        // Filter for active leads not opted into AI
        query = query.not('ai_opt_in', 'is', true);
      }

      const { data, error, count } = await query;

      if (error) {
        console.error('Error fetching leads:', error);
        setError('Failed to fetch leads');
      } else {
        setLeads(data || []);
        setTotalLeads(count || 0);
      }
    } catch (err) {
      console.error('Error fetching leads:', err);
      setError('Failed to fetch leads');
    } finally {
      setLoading(false);
      setFiltersLoaded(true);
    }
  }, [profile, searchFilters.activeNotOptedIn]);

  // Fetch leads only once on component mount
  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  // Apply local filtering
  useEffect(() => {
    let filtered: Lead[] = [...leads];

    const isSearchingByNameOrPhone = searchFilters.searchTerm !== '' && (
      searchFilters.searchTerm.length >= 3 && !isNaN(Number(searchFilters.searchTerm))
    );

    // Apply AI Opt-In filter
    if (searchFilters.aiOptIn !== undefined) {
      filtered = filtered.filter(lead => lead.aiOptIn === searchFilters.aiOptIn);
    }

    // Apply Do Not Contact filter
    if (searchFilters.doNotContact !== undefined) {
      filtered = filtered.filter(lead => {
        const doNotContact = lead.doNotCall || lead.doNotEmail || lead.doNotMail;
        return doNotContact === searchFilters.doNotContact;
      });
    }

    // Apply engagement score filter
    if (searchFilters.engagementScoreMin !== undefined) {
      filtered = filtered.filter(lead => getEngagementScore(lead) >= searchFilters.engagementScoreMin!);
    }

    if (searchFilters.engagementScoreMax !== undefined) {
      filtered = filtered.filter(lead => getEngagementScore(lead) <= searchFilters.engagementScoreMax!);
    }

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

    // Apply search term filter
    if (searchFilters.searchTerm) {
      const searchTermLower = searchFilters.searchTerm.toLowerCase();
      filtered = filtered.filter(lead =>
        lead.firstName.toLowerCase().includes(searchTermLower) ||
        lead.lastName.toLowerCase().includes(searchTermLower) ||
        lead.email.toLowerCase().includes(searchTermLower) ||
        lead.primaryPhone.includes(searchFilters.searchTerm) ||
        lead.vehicleInterest.toLowerCase().includes(searchTermLower)
      );
    }

    // Apply date filter
    if (searchFilters.dateFilter !== 'all') {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay()); // Start of the week (Sunday)

      filtered = filtered.filter(lead => {
        const leadDate = new Date(lead.createdAt);
        if (searchFilters.dateFilter === 'today') {
          return leadDate.toDateString() === today.toDateString();
        } else if (searchFilters.dateFilter === 'yesterday') {
          return leadDate.toDateString() === yesterday.toDateString();
        } else if (searchFilters.dateFilter === 'this_week') {
          return leadDate >= startOfWeek && leadDate <= today;
        }
        return true;
      });
    }

    // Apply source filter
    if (searchFilters.source) {
      const sourceLower = searchFilters.source.toLowerCase();
      filtered = filtered.filter(lead =>
        lead.source.toLowerCase().includes(sourceLower)
      );
    }

    // Apply vehicle interest filter
    if (searchFilters.vehicleInterest) {
      const vehicleInterestLower = searchFilters.vehicleInterest.toLowerCase();
      filtered = filtered.filter(lead =>
        lead.vehicleInterest.toLowerCase().includes(vehicleInterestLower)
      );
    }

    // Apply city filter
    if (searchFilters.city) {
      const cityLower = searchFilters.city.toLowerCase();
      filtered = filtered.filter(lead =>
        lead.city?.toLowerCase().includes(cityLower)
      );
    }

     // Apply state filter
     if (searchFilters.state) {
      const stateLower = searchFilters.state.toLowerCase();
      filtered = filtered.filter(lead =>
        lead.state?.toLowerCase().includes(stateLower)
      );
    }

    setFilteredLeads(filtered);
  }, [leads, statusFilter, searchFilters]);

  // Apply pagination
  useEffect(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    setFinalFilteredLeads(filteredLeads.slice(startIndex, endIndex));
  }, [filteredLeads, currentPage]);

  // Clear all filters
  const clearFilters = () => {
    setStatusFilter('all');
    setSearchFilters({ searchTerm: '', dateFilter: 'all' });
  };

  // Select all filtered leads
  const selectAllFiltered = () => {
    const allIds = finalFilteredLeads.map(lead => lead.id.toString());
    setSelectedLeads(allIds);
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedLeads([]);
  };

  // Toggle lead selection
  const toggleLeadSelection = (leadId: string) => {
    if (selectedLeads.includes(leadId)) {
      setSelectedLeads(selectedLeads.filter(id => id !== leadId));
    } else {
      setSelectedLeads([...selectedLeads, leadId]);
    }
  };

  // Show quick view
  const showQuickView = (lead: Lead) => {
    setQuickViewLead(lead);
  };

  // Hide quick view
  const hideQuickView = () => {
    setQuickViewLead(null);
  };

   // Function to calculate engagement score
   const getEngagementScore = (lead: Lead): number => {
    let score = 0;

    // Award points based on communication activity
    score += lead.incomingCount * 5;  // Incoming messages are valuable
    score += lead.outgoingCount * 2;  // Outgoing messages also count

    // Deduct points for DNC status
    if (lead.doNotCall || lead.doNotEmail || lead.doNotMail) {
        score -= 10; // Substantial penalty for DNC
    }

    // Add points if AI is enabled
    if (lead.aiOptIn) {
        score += 5;
    }

    // Adjustments based on lead status
    if (lead.status === 'new') {
        score -= 2; // Slightly lower score for new leads
    } else if (lead.status === 'engaged') {
        score += 8; // Higher score for engaged leads
    } else if (lead.status === 'closed') {
        score += 10; // Highest score for closed leads
    }

    // Ensure score is non-negative
    return Math.max(0, score);
  };

  const refetch = async () => {
    await fetchLeads();
  };

  return {
    leads,
    filteredLeads,
    finalFilteredLeads,
    loading,
    error,
    selectedLeads,
    quickViewLead,
    statusFilter,
    searchFilters,
    currentPage,
    totalLeads,
    filtersLoaded,
    savedPresets,
    setStatusFilter,
    setSearchFilters,
    setCurrentPage,
    clearFilters,
    selectAllFiltered,
    clearSelection,
    toggleLeadSelection,
    showQuickView,
    hideQuickView,
    saveSearchPreset,
    loadSearchPreset,
    getEngagementScore,
    refetch
  };
};
