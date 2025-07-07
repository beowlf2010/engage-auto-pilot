import React, { useState, useCallback, useMemo } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useOptimizedLeads } from '@/hooks/leads/useOptimizedLeads';
import { useLeadFilters } from '@/hooks/useLeadFilters';
import { useLeadsSelection } from '@/components/leads/useLeadsSelection';
import LeadsStatsCards from '@/components/leads/LeadsStatsCards';
import LeadsStatusTabs from '@/components/leads/LeadsStatusTabs';
import LeadQuickView from '@/components/leads/LeadQuickView';
import BulkActionsPanel from '@/components/leads/BulkActionsPanel';
import FilterRestorationBanner from '@/components/leads/FilterRestorationBanner';
import { Button } from '@/components/ui/button';
import { RefreshCw, Download } from 'lucide-react';
import { Lead } from '@/types/lead';

const OptimizedLeadsList = () => {
  const { user } = useAuth();
  const [quickViewLead, setQuickViewLead] = useState<Lead | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Optimized leads hook with virtual scrolling and caching
  const {
    leads,
    loading,
    loadingMore,
    error,
    hasMore,
    stats,
    currentPage,
    showHidden,
    setShowHidden,
    refetch,
    loadMore,
    updateAiOptIn,
    updateDoNotContact,
    toggleLeadHidden,
    clearCache
  } = useOptimizedLeads({
    pageSize: 50,
    enableVirtualization: true,
    prefetchNextPage: true
  });

  // Lead filtering (create a simple version for now)
  const [filters, setFilters] = useState({
    status: 'all' as string,
    searchTerm: '',
    dateFilter: 'all' as string,
    source: undefined as string | undefined,
    aiOptIn: undefined as boolean | undefined,
    vehicleInterest: undefined as string | undefined,
    city: undefined as string | undefined,
    state: undefined as string | undefined,
    engagementScoreMin: undefined as number | undefined,
    engagementScoreMax: undefined as number | undefined,
    doNotContact: undefined as boolean | undefined
  });

  const updateFilters = useCallback((newFilters: Partial<typeof filters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({
      status: 'all',
      searchTerm: '',
      dateFilter: 'all',
      source: undefined,
      aiOptIn: undefined,
      vehicleInterest: undefined,
      city: undefined,
      state: undefined,
      engagementScoreMin: undefined,
      engagementScoreMax: undefined,
      doNotContact: undefined
    });
  }, []);

  const hasActiveFilters = useMemo(() => {
    return filters.status !== 'all' || 
      filters.searchTerm !== '' ||
      filters.dateFilter !== 'all' ||
      filters.source ||
      filters.aiOptIn !== undefined ||
      filters.vehicleInterest ||
      filters.city ||
      filters.state ||
      filters.engagementScoreMin !== undefined ||
      filters.engagementScoreMax !== undefined ||
      filters.doNotContact !== undefined;
  }, [filters]);

  const getFilterSummary = useCallback(() => {
    const summary: Record<string, any> = {};
    if (filters.status !== 'all') summary.status = filters.status;
    if (filters.searchTerm) summary.searchTerm = filters.searchTerm;
    if (filters.dateFilter !== 'all') summary.dateFilter = filters.dateFilter;
    if (filters.source) summary.source = filters.source;
    if (filters.aiOptIn !== undefined) summary.aiOptIn = filters.aiOptIn;
    if (filters.vehicleInterest) summary.vehicleInterest = filters.vehicleInterest;
    if (filters.city) summary.city = filters.city;
    if (filters.state) summary.state = filters.state;
    if (filters.engagementScoreMin !== undefined) summary.engagementScoreMin = filters.engagementScoreMin;
    if (filters.engagementScoreMax !== undefined) summary.engagementScoreMax = filters.engagementScoreMax;
    if (filters.doNotContact !== undefined) summary.doNotContact = filters.doNotContact;
    return summary;
  }, [filters]);

  // Lead selection (create a simple version for now)
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);

  const toggleLeadSelection = useCallback((leadId: string) => {
    setSelectedLeads(prev => 
      prev.includes(leadId) 
        ? prev.filter(id => id !== leadId)
        : [...prev, leadId]
    );
  }, []);

  const selectAllVisible = useCallback((leadIds: string[]) => {
    setSelectedLeads(leadIds);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedLeads([]);
  }, []);

  const canEdit = user?.role === 'admin' || user?.role === 'manager';

  // Apply filters to leads
  const filteredLeads = useMemo(() => {
    let filtered = leads;

    if (filters.status !== 'all') {
      filtered = filtered.filter(lead => lead.status === filters.status);
    }

    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(lead => 
        lead.firstName.toLowerCase().includes(searchLower) ||
        lead.lastName.toLowerCase().includes(searchLower) ||
        lead.email?.toLowerCase().includes(searchLower) ||
        lead.vehicleInterest?.toLowerCase().includes(searchLower)
      );
    }

    if (filters.aiOptIn !== undefined) {
      filtered = filtered.filter(lead => lead.aiOptIn === filters.aiOptIn);
    }

    if (filters.doNotContact !== undefined) {
      filtered = filtered.filter(lead => {
        if (filters.doNotContact) {
          return lead.doNotCall || lead.doNotEmail || lead.doNotMail;
        } else {
          return !lead.doNotCall && !lead.doNotEmail && !lead.doNotMail;
        }
      });
    }

    return filtered;
  }, [leads, filters]);

  // Enhanced AI opt-in handler with optimistic updates
  const handleAiOptInChange = useCallback(async (leadId: string, value: boolean) => {
    console.log('🔄 [OPTIMIZED LEADS LIST] Handling AI opt-in change:', { leadId, value });
    
    const success = await updateAiOptIn(leadId, value);
    
    if (success) {
      console.log('✅ [OPTIMIZED LEADS LIST] AI opt-in updated successfully');
      setRefreshKey(prev => prev + 1);
    }
    
    return success;
  }, [updateAiOptIn]);

  // Enhanced do not contact handler
  const handleDoNotContactChange = useCallback(async (leadId: string, field: 'doNotCall' | 'doNotEmail' | 'doNotMail', value: boolean) => {
    const success = await updateDoNotContact(leadId, field, value);
    if (success) {
      setRefreshKey(prev => prev + 1);
    }
    return success;
  }, [updateDoNotContact]);

  // Toggle hidden with optimistic update
  const handleToggleHidden = useCallback(async (leadId: string, hidden: boolean) => {
    toggleLeadHidden(leadId, hidden);
    setRefreshKey(prev => prev + 1);
  }, [toggleLeadHidden]);

  // Quick view handlers
  const showQuickView = useCallback((lead: Lead) => {
    setQuickViewLead(lead);
  }, []);

  const hideQuickView = useCallback(() => {
    setQuickViewLead(null);
  }, []);

  // Load more handler for infinite scroll
  const handleLoadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      loadMore();
    }
  }, [loadMore, loadingMore, hasMore]);

  // Enhanced refresh with cache clearing
  const handleRefresh = useCallback(async () => {
    clearCache();
    clearSelection();
    await refetch();
    setRefreshKey(prev => prev + 1);
  }, [refetch, clearCache, clearSelection]);

  // Bulk actions handlers
  const handleBulkStatusUpdate = useCallback(async (status: string) => {
    setRefreshKey(prev => prev + 1);
    await refetch();
  }, [refetch]);

  const handleBulkDelete = useCallback(async () => {
    setRefreshKey(prev => prev + 1);
    await refetch();
  }, [refetch]);

  const handleBulkMessage = useCallback(async () => {
    console.log('Bulk message action triggered');
  }, []);

  // Calculate enhanced stats
  const enhancedStats = useMemo(() => {
    return {
      ...stats,
      visible: filteredLeads.length,
      selected: selectedLeads.length,
      hasMore,
      currentPage: currentPage + 1,
      totalPages: Math.ceil(stats.total / 50)
    };
  }, [stats, filteredLeads.length, selectedLeads.length, hasMore, currentPage]);

  // Transform selected leads for bulk actions
  const selectedLeadObjects = useMemo(() => {
    return filteredLeads.filter(lead => 
      selectedLeads.includes(lead.id.toString())
    ).map(lead => ({
      id: lead.id.toString(),
      first_name: lead.firstName,
      last_name: lead.lastName,
      email: lead.email,
      status: lead.status,
      vehicle_interest: lead.vehicleInterest
    }));
  }, [filteredLeads, selectedLeads]);

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="text-destructive mb-4">
            <p className="text-lg font-semibold">Error loading leads</p>
            <p className="text-sm">{error.message}</p>
          </div>
          <Button onClick={handleRefresh} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" key={refreshKey}>
      {/* Enhanced Header with Performance Metrics */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Leads Management</h1>
          <p className="text-sm text-muted-foreground">
            Showing {enhancedStats.visible} of {enhancedStats.total} leads
            {hasMore && ` (Page ${enhancedStats.currentPage} of ${enhancedStats.totalPages}+)`}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            onClick={handleRefresh}
            variant="outline"
            size="sm"
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Filter Restoration Banner */}
      {hasActiveFilters && (
        <FilterRestorationBanner
          onClearFilters={clearFilters}
          filtersCount={Object.keys(getFilterSummary()).length}
        />
      )}

      {/* Enhanced Stats Cards */}
      <LeadsStatsCards 
        stats={enhancedStats}
      />

      {/* Bulk Actions Panel */}
      {selectedLeads.length > 0 && (
        <BulkActionsPanel
          selectedLeads={selectedLeadObjects}
          onClearSelection={clearSelection}
          onBulkStatusUpdate={handleBulkStatusUpdate}
          onBulkDelete={handleBulkDelete}
          onBulkMessage={handleBulkMessage}
          onRefresh={handleRefresh}
        />
      )}

      {/* Optimized Status Tabs with Virtual Scrolling */}
      <LeadsStatusTabs
        statusFilter={filters.status || 'all'}
        setStatusFilter={(status) => updateFilters({ status })}
        finalFilteredLeads={filteredLeads}
        loading={loading}
        selectedLeads={selectedLeads}
        selectAllFiltered={() => selectAllVisible(filteredLeads.map(l => l.id.toString()))}
        toggleLeadSelection={toggleLeadSelection}
        handleAiOptInChange={handleAiOptInChange}
        handleDoNotContactChange={handleDoNotContactChange}
        canEdit={canEdit}
        searchTerm={filters.searchTerm || ''}
        onQuickView={showQuickView}
        getEngagementScore={(leadId) => {
          const lead = filteredLeads.find(l => l.id.toString() === leadId.toString());
          return lead ? 75 : 0; // Default engagement score
        }}
        onToggleHidden={handleToggleHidden}
      />

      {/* Load More Button for Infinite Scroll */}
      {hasMore && !loading && (
        <div className="flex justify-center py-8">
          <Button
            onClick={handleLoadMore}
            variant="outline"
            disabled={loadingMore}
            className="gap-2"
          >
            {loadingMore ? (
              <>
                <div className="w-4 h-4 border-2 border-muted-foreground border-t-foreground rounded-full animate-spin" />
                Loading more...
              </>
            ) : (
              <>
                Load More Leads ({enhancedStats.visible} of {enhancedStats.total}+)
              </>
            )}
          </Button>
        </div>
      )}

      {/* Quick View Modal */}
      {quickViewLead && (
        <LeadQuickView
          lead={quickViewLead}
          onClose={hideQuickView}
          onMessage={() => {}}
          onCall={() => {}}
          onSchedule={() => {}}
        />
      )}

      {/* Performance Debug Info (Development Only) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 right-4 bg-black/80 text-white p-3 rounded-lg text-xs font-mono">
          <div>Leads: {leads.length} | Filtered: {filteredLeads.length}</div>
          <div>Page: {currentPage + 1} | Has More: {hasMore ? 'Yes' : 'No'}</div>
          <div>Loading: {loading ? 'Yes' : 'No'} | Cache: Active</div>
        </div>
      )}
    </div>
  );
};

export default OptimizedLeadsList;