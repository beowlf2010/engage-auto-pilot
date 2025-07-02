import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Lead } from '@/types/lead';
import { processLeadData } from './useLeadsDataProcessor';

export interface LeadFilters {
  search?: string;
  status?: string;
  aiOptIn?: boolean;
  doNotContact?: boolean;
  source?: string;
  vehicleInterest?: string;
  city?: string;
  state?: string;
  dateFilter?: 'today' | 'yesterday' | 'this_week' | 'all';
  hiddenLeads?: boolean;
}

export interface PaginationConfig {
  page: number;
  pageSize: number;
  hasMore: boolean;
  total: number;
}

export interface DatabaseStats {
  total: number;
  aiEnabled: number;
  noContact: number;
  contacted: number;
  responded: number;
  fresh: number;
  soldCustomers: number;
}

interface LeadsResponse {
  data: Lead[];
  count: number;
  hasMore: boolean;
}

export const useOptimizedLeads = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [filters, setFilters] = useState<LeadFilters>({
    status: 'all',
    dateFilter: 'all',
    hiddenLeads: false
  });
  
  const [pagination, setPagination] = useState<PaginationConfig>({
    page: 0,
    pageSize: 50,
    hasMore: true,
    total: 0
  });

  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [databaseStats, setDatabaseStats] = useState<DatabaseStats>({
    total: 0,
    aiEnabled: 0,
    noContact: 0,
    contacted: 0,
    responded: 0,
    fresh: 0,
    soldCustomers: 0
  });

  // Build optimized database query with server-side filtering
  const buildQuery = useCallback((currentFilters: LeadFilters, page: number, pageSize: number) => {
    let query = supabase
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
        ),
        profiles (
          first_name,
          last_name
        )
      `, { count: 'exact' });

    // FILTER OUT INACTIVE LEADS BY DEFAULT (unless specifically requesting them)
    if (currentFilters.status !== 'lost' && currentFilters.status !== 'closed' && currentFilters.status !== 'sold_customers') {
      // For main leads view, exclude inactive statuses
      query = query.not('status', 'in', '(lost,closed)');
    }

    // Search filter (server-side ILIKE for better performance)
    if (currentFilters.search) {
      const searchTerm = currentFilters.search.trim();
      if (searchTerm) {
        query = query.or(`
          first_name.ilike.%${searchTerm}%,
          last_name.ilike.%${searchTerm}%,
          email.ilike.%${searchTerm}%,
          vehicle_interest.ilike.%${searchTerm}%
        `);
      }
    }

    // Status filter
    if (currentFilters.status && currentFilters.status !== 'all') {
      if (currentFilters.status === 'needs_ai') {
        query = query
          .in('status', ['new', 'engaged', 'active'])
          .eq('ai_opt_in', false)
          .eq('do_not_call', false)
          .eq('do_not_email', false)
          .eq('do_not_mail', false);
      } else if (currentFilters.status === 'do_not_contact') {
        query = query.or('do_not_call.eq.true,do_not_email.eq.true,do_not_mail.eq.true');
      } else if (currentFilters.status === 'sold_customers') {
        // Show sold/closed customers for customer service
        query = query.eq('status', 'closed');
      } else {
        query = query.eq('status', currentFilters.status);
      }
    }

    // AI opt-in filter
    if (currentFilters.aiOptIn !== undefined) {
      query = query.eq('ai_opt_in', currentFilters.aiOptIn);
    }

    // Do not contact filter
    if (currentFilters.doNotContact !== undefined) {
      if (currentFilters.doNotContact) {
        query = query.or('do_not_call.eq.true,do_not_email.eq.true,do_not_mail.eq.true');
      } else {
        query = query
          .eq('do_not_call', false)
          .eq('do_not_email', false)
          .eq('do_not_mail', false);
      }
    }

    // Source filter
    if (currentFilters.source) {
      query = query.ilike('source', `%${currentFilters.source}%`);
    }

    // Vehicle interest filter
    if (currentFilters.vehicleInterest) {
      query = query.ilike('vehicle_interest', `%${currentFilters.vehicleInterest}%`);
    }

    // City filter
    if (currentFilters.city) {
      query = query.ilike('city', `%${currentFilters.city}%`);
    }

    // State filter
    if (currentFilters.state) {
      query = query.ilike('state', `%${currentFilters.state}%`);
    }

    // Date filter
    if (currentFilters.dateFilter && currentFilters.dateFilter !== 'all') {
      const now = new Date();
      let startDate: Date;

      switch (currentFilters.dateFilter) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'yesterday':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
          const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          query = query.gte('created_at', startDate.toISOString()).lt('created_at', endDate.toISOString());
          break;
        case 'this_week':
          startDate = new Date(now);
          startDate.setDate(now.getDate() - now.getDay());
          startDate.setHours(0, 0, 0, 0);
          query = query.gte('created_at', startDate.toISOString());
          break;
        default:
          break;
      }

      if (currentFilters.dateFilter === 'today') {
        query = query.gte('created_at', startDate.toISOString());
      }
    }

    // Hidden leads filter
    if (!currentFilters.hiddenLeads) {
      query = query.or('is_hidden.is.null,is_hidden.eq.false');
    }

    // Pagination
    query = query
      .range(page * pageSize, (page + 1) * pageSize - 1)
      .order('created_at', { ascending: false });

    return query;
  }, []);

  // Fetch leads with server-side filtering and pagination
  const fetchLeads = useCallback(async (
    currentFilters: LeadFilters = filters,
    page: number = 0,
    append: boolean = false
  ): Promise<LeadsResponse> => {
    try {
      if (!append) {
        setLoading(true);
        setError(null);
      }

      const query = buildQuery(currentFilters, page, pagination.pageSize);
      const { data: leadsData, error: leadsError, count } = await query;

      if (leadsError) throw leadsError;

      // Fetch conversation counts for these leads
      const leadIds = leadsData?.map(lead => lead.id) || [];
      const { data: conversationCounts, error: countError } = await supabase
        .from('conversations')
        .select('lead_id, direction, read_at, body, sent_at')
        .in('lead_id', leadIds);

      if (countError) throw countError;

      const processedLeads = processLeadData(leadsData || [], conversationCounts || []);
      const hasMore = count ? ((page + 1) * pagination.pageSize) < count : false;

      return {
        data: processedLeads,
        count: count || 0,
        hasMore
      };
    } catch (err) {
      console.error('Error fetching leads:', err);
      const error = err instanceof Error ? err : new Error('Failed to fetch leads');
      setError(error);
      throw error;
    }
  }, [filters, pagination.pageSize, buildQuery]);

  // Fetch database-wide stats
  const fetchDatabaseStats = useCallback(async (): Promise<void> => {
    try {
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();

      // Get total count (ACTIVE LEADS ONLY - exclude lost/closed)
      const { count: totalCount } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .not('status', 'in', '(lost,closed)')
        .or('is_hidden.is.null,is_hidden.eq.false');

      // Get AI enabled count (ACTIVE LEADS ONLY)
      const { count: aiEnabledCount } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('ai_opt_in', true)
        .not('status', 'in', '(lost,closed)')
        .or('is_hidden.is.null,is_hidden.eq.false');

      // Get no contact count (status = 'new', ACTIVE ONLY)
      const { count: noContactCount } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'new')
        .or('is_hidden.is.null,is_hidden.eq.false');

      // Get fresh leads count (created today, ACTIVE ONLY)
      const { count: freshCount } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', todayStart)
        .not('status', 'in', '(lost,closed)')
        .or('is_hidden.is.null,is_hidden.eq.false');

      // Get leads with outgoing messages (contacted)
      const { data: contactedLeads } = await supabase
        .from('conversations')
        .select('lead_id')
        .eq('direction', 'out')
        .not('lead_id', 'is', null);

      const contactedLeadIds = [...new Set(contactedLeads?.map(c => c.lead_id) || [])];
      const contactedCount = contactedLeadIds.length;

      // Get leads with incoming messages (responded)
      const { data: respondedLeads } = await supabase
        .from('conversations')
        .select('lead_id')
        .eq('direction', 'in')
        .not('lead_id', 'is', null);

      const respondedLeadIds = [...new Set(respondedLeads?.map(c => c.lead_id) || [])];
      const respondedCount = respondedLeadIds.length;

      // Get sold customers count
      const { count: soldCount } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'closed')
        .or('is_hidden.is.null,is_hidden.eq.false');

      setDatabaseStats({
        total: totalCount || 0,
        aiEnabled: aiEnabledCount || 0,
        noContact: noContactCount || 0,
        contacted: contactedCount,
        responded: respondedCount,
        fresh: freshCount || 0,
        soldCustomers: soldCount || 0
      });
    } catch (error) {
      console.error('Error fetching database stats:', error);
    }
  }, []);

  // Load initial data
  const loadLeads = useCallback(async (newFilters?: LeadFilters) => {
    try {
      const filtersToUse = newFilters || filters;
      const response = await fetchLeads(filtersToUse, 0, false);
      
      setLeads(response.data);
      setPagination(prev => ({
        ...prev,
        page: 0,
        hasMore: response.hasMore,
        total: response.count
      }));

      if (newFilters) {
        setFilters(newFilters);
      }

      // Fetch database stats whenever filters change
      await fetchDatabaseStats();
    } catch (err) {
      // Error already handled in fetchLeads
    } finally {
      setLoading(false);
    }
  }, [filters, fetchLeads, fetchDatabaseStats]);

  // Load more data for infinite scroll
  const loadMore = useCallback(async () => {
    if (!pagination.hasMore || loading) return;

    try {
      const nextPage = pagination.page + 1;
      const response = await fetchLeads(filters, nextPage, true);
      
      setLeads(prev => [...prev, ...response.data]);
      setPagination(prev => ({
        ...prev,
        page: nextPage,
        hasMore: response.hasMore
      }));
    } catch (err) {
      // Error already handled in fetchLeads
    }
  }, [pagination.hasMore, pagination.page, loading, fetchLeads, filters]);

  // Update filters and reload
  const updateFilters = useCallback((newFilters: Partial<LeadFilters>) => {
    const updatedFilters = { ...filters, ...newFilters };
    loadLeads(updatedFilters);
  }, [filters, loadLeads]);

  // Clear filters
  const clearFilters = useCallback(() => {
    const defaultFilters: LeadFilters = {
      status: 'all',
      dateFilter: 'all',
      hiddenLeads: false
    };
    loadLeads(defaultFilters);
  }, [loadLeads]);

  // Selection functions
  const toggleLeadSelection = useCallback((leadId: string) => {
    setSelectedLeads(prev => 
      prev.includes(leadId) 
        ? prev.filter(id => id !== leadId)
        : [...prev, leadId]
    );
  }, []);

  const selectAllVisible = useCallback(() => {
    const visibleIds = leads.map(lead => lead.id);
    setSelectedLeads(visibleIds);
  }, [leads]);

  const clearSelection = useCallback(() => {
    setSelectedLeads([]);
  }, []);

  // Calculate stats
  const stats = useMemo(() => {
    return {
      total: pagination.total,
      visible: leads.length,
      selected: selectedLeads.length,
      hasMore: pagination.hasMore
    };
  }, [pagination.total, leads.length, selectedLeads.length, pagination.hasMore]);

  // Initialize data on mount
  useEffect(() => {
    loadLeads();
  }, []); // Only run once on mount

  return {
    leads,
    loading,
    error,
    filters,
    pagination,
    selectedLeads,
    stats,
    databaseStats,
    
    // Actions
    updateFilters,
    clearFilters,
    loadMore,
    refetch: () => loadLeads(),
    
    // Selection
    toggleLeadSelection,
    selectAllVisible,
    clearSelection
  };
};