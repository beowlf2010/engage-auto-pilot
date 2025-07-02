import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useOptimizedLeads } from '@/hooks/leads/useOptimizedLeads';
import { useLeadsOperations } from '@/hooks/leads/useLeadsOperations';
import { useIsMobile } from '@/hooks/use-mobile';
import LeadsStatsCards from '@/components/leads/LeadsStatsCards';
import LeadsStatusTabs from '@/components/leads/LeadsStatusTabs';
import LeadQuickView from '@/components/leads/LeadQuickView';
import BulkActionsPanel from '@/components/leads/BulkActionsPanel';
import FilterRestorationBanner from '@/components/leads/FilterRestorationBanner';
import MobileLeadsList from '@/components/leads/MobileLeadsList';
import { InlineLoading } from '@/components/ui/loading/InlineLoading';
import { InlineErrorState } from '@/components/ui/error/InlineErrorState';
import { Lead } from '@/types/lead';

const EnhancedLeadsList = () => {
  const { user } = useAuth();
  const { updateAiOptIn, updateDoNotContact } = useLeadsOperations();
  
  const {
    leads,
    loading,
    error,
    filters,
    selectedLeads,
    stats,
    databaseStats,
    updateFilters,
    clearFilters,
    loadMore,
    refetch,
    toggleLeadSelection,
    selectAllVisible,
    clearSelection
  } = useOptimizedLeads();

  const [quickViewLead, setQuickViewLead] = useState<Lead | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const canEdit = user?.role === 'admin' || user?.role === 'manager';

  // Enhanced AI opt-in handler with immediate UI update
  const handleAiOptInChange = async (leadId: string, value: boolean) => {
    console.log('🔄 [ENHANCED LEADS LIST] Handling AI opt-in change:', { leadId, value });
    
    const success = await updateAiOptIn(leadId, value);
    
    if (success) {
      console.log('✅ [ENHANCED LEADS LIST] AI opt-in updated successfully, triggering refresh');
      setRefreshKey(prev => prev + 1);
      await refetch();
    }
  };

  const handleDoNotContactChange = async (leadId: string, field: 'doNotCall' | 'doNotEmail' | 'doNotMail', value: boolean) => {
    const success = await updateDoNotContact(leadId, field, value);
    if (success) {
      setRefreshKey(prev => prev + 1);
      await refetch();
    }
  };

  const handleToggleHidden = async (leadId: string, hidden: boolean) => {
    setRefreshKey(prev => prev + 1);
    await refetch();
  };

  // Status filter handler
  const handleStatusFilterChange = (status: string) => {
    updateFilters({ status });
  };

  // Stats card click handler
  const handleStatsCardClick = (filterType: 'fresh' | 'all' | 'no_contact' | 'contact_attempted' | 'response_received' | 'ai_enabled' | 'sold_customers') => {
    switch (filterType) {
      case 'fresh':
        updateFilters({ dateFilter: 'today', status: 'all' });
        break;
      case 'all':
        clearFilters();
        break;
      case 'no_contact':
        updateFilters({ status: 'new' });
        break;
      case 'contact_attempted':
        updateFilters({ status: 'all' }); // Will show leads with outgoingCount > 0
        break;
      case 'response_received':
        updateFilters({ status: 'all' }); // Will show leads with incomingCount > 0  
        break;
      case 'ai_enabled':
        updateFilters({ aiOptIn: true, status: 'all' });
        break;
      case 'sold_customers':
        updateFilters({ status: 'sold_customers' });
        break;
      default:
        break;
    }
  };

  // Check if we have active filters
  const hasActiveFilters = filters.status !== 'all' || 
    filters.search !== '' ||
    filters.dateFilter !== 'all' ||
    filters.source ||
    filters.aiOptIn !== undefined ||
    filters.vehicleInterest ||
    filters.city ||
    filters.state ||
    filters.doNotContact !== undefined;

  const filtersCount = [
    filters.status !== 'all' ? 1 : 0,
    filters.search ? 1 : 0,
    filters.dateFilter !== 'all' ? 1 : 0,
    filters.source ? 1 : 0,
    filters.aiOptIn !== undefined ? 1 : 0,
    filters.vehicleInterest ? 1 : 0,
    filters.city ? 1 : 0,
    filters.state ? 1 : 0,
    filters.doNotContact !== undefined ? 1 : 0
  ].reduce((sum, count) => sum + count, 0);

  // Use database stats instead of calculating from paginated leads
  const statsForCards = {
    total: databaseStats.total,
    noContact: databaseStats.noContact,
    contacted: databaseStats.contacted,
    responded: databaseStats.responded,
    aiEnabled: databaseStats.aiEnabled,
    fresh: databaseStats.fresh
  };

  // Engagement score calculation (simplified)
  const getEngagementScore = (lead: Lead): number => {
    let score = 0;
    if (lead.incomingCount > 0) score += 30;
    if (lead.outgoingCount > 0) score += 20;
    if (lead.aiOptIn) score += 15;
    if (lead.status === 'engaged') score += 25;
    if (lead.lastMessageTime) {
      const daysSinceLastMessage = Math.floor(
        (Date.now() - new Date(lead.lastMessageTime).getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSinceLastMessage <= 1) score += 10;
      else if (daysSinceLastMessage <= 7) score += 5;
    }
    return Math.min(score, 100);
  };

  // Quick view handlers
  const showQuickView = (lead: Lead) => {
    setQuickViewLead(lead);
  };

  const hideQuickView = () => {
    setQuickViewLead(null);
  };

  // Transform selected leads for BulkActionsPanel
  const selectedLeadObjects = leads.filter(lead => 
    selectedLeads.includes(lead.id.toString())
  ).map(lead => ({
    id: lead.id.toString(),
    first_name: lead.firstName,
    last_name: lead.lastName,
    email: lead.email,
    status: lead.status,
    vehicle_interest: lead.vehicleInterest
  }));

  // Bulk action handlers
  const handleBulkStatusUpdate = async (status: string) => {
    setRefreshKey(prev => prev + 1);
    await refetch();
  };

  const handleBulkDelete = async () => {
    setRefreshKey(prev => prev + 1);
    await refetch();
  };

  const handleBulkMessage = async () => {
    console.log('Bulk message action triggered');
  };

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <InlineErrorState
          title="Failed to load leads"
          message={error.message}
          onAction={refetch}
          actionLabel="Retry"
        />
      </div>
    );
  }

  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <div className="h-full">
        {/* Mobile Layout */}
        <div className="mobile-container space-y-4">
          {/* Filter Restoration Banner */}
          {hasActiveFilters && (
            <FilterRestorationBanner
              onClearFilters={clearFilters}
              filtersCount={filtersCount}
            />
          )}

          {/* Mobile Stats Cards - 2x4 Grid */}
          <div className="grid grid-cols-2 gap-3">
            <LeadsStatsCards 
              stats={statsForCards}
              onCardClick={handleStatsCardClick}
              activeFilter={
                filters.dateFilter === 'today' && filters.status === 'all' ? 'fresh' :
                filters.status === 'new' ? 'no_contact' :
                filters.aiOptIn === true && filters.status === 'all' ? 'ai_enabled' :
                !hasActiveFilters ? 'all' :
                null
              }
            />
          </div>

          {/* Mobile Bulk Actions */}
          {selectedLeads.length > 0 && (
            <BulkActionsPanel
              selectedLeads={selectedLeadObjects}
              onClearSelection={clearSelection}
              onBulkStatusUpdate={handleBulkStatusUpdate}
              onBulkDelete={handleBulkDelete}
              onBulkMessage={handleBulkMessage}
              onRefresh={() => {
                setRefreshKey(prev => prev + 1);
                refetch();
              }}
            />
          )}

          {/* Mobile Status Tabs - Scrollable */}
          <div className="overflow-x-auto mobile-scroll">
            <LeadsStatusTabs
              statusFilter={filters.status || 'all'}
              setStatusFilter={handleStatusFilterChange}
              finalFilteredLeads={leads}
              loading={loading}
              selectedLeads={selectedLeads}
              selectAllFiltered={selectAllVisible}
              toggleLeadSelection={toggleLeadSelection}
              handleAiOptInChange={handleAiOptInChange}
              handleDoNotContactChange={handleDoNotContactChange}
              canEdit={canEdit}
              searchTerm={filters.search || ''}
              onQuickView={showQuickView}
              getEngagementScore={getEngagementScore}
              onToggleHidden={handleToggleHidden}
            />
          </div>
        </div>

        {/* Mobile Leads List */}
        <MobileLeadsList
          leads={leads}
          selectedLeads={selectedLeads}
          onLeadSelect={toggleLeadSelection}
          onQuickView={showQuickView}
          getEngagementScore={getEngagementScore}
          isFresh={(lead) => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const createdAt = new Date(lead.createdAt);
            return createdAt >= today;
          }}
          canEdit={canEdit}
        />

        {/* Mobile Load More */}
        {stats.hasMore && !loading && (
          <div className="p-4">
            <button
              onClick={loadMore}
              className="w-full py-3 text-sm font-medium text-primary border border-primary rounded-lg hover:bg-primary/10 transition-colors touch-target"
            >
              Load More Leads ({stats.total - stats.visible} remaining)
            </button>
          </div>
        )}

        {/* Mobile Loading */}
        {loading && leads.length > 0 && (
          <div className="p-4">
            <InlineLoading text="Loading more leads..." />
          </div>
        )}

        {/* Mobile Quick View Modal */}
        {quickViewLead && (
          <LeadQuickView
            lead={quickViewLead}
            onClose={hideQuickView}
            onMessage={() => {}}
            onCall={() => {}}
            onSchedule={() => {}}
            
          />
        )}
      </div>
    );
  }

  // Desktop Layout
  return (
    <div className="space-y-6" key={refreshKey}>
      {/* Filter Restoration Banner */}
      {hasActiveFilters && (
        <FilterRestorationBanner
          onClearFilters={clearFilters}
          filtersCount={filtersCount}
        />
      )}

      {/* Stats Cards */}
      <LeadsStatsCards 
        stats={statsForCards}
        onCardClick={handleStatsCardClick}
        activeFilter={
          filters.dateFilter === 'today' && filters.status === 'all' ? 'fresh' :
          filters.status === 'new' ? 'no_contact' :
          filters.aiOptIn === true && filters.status === 'all' ? 'ai_enabled' :
          !hasActiveFilters ? 'all' :
          null
        }
      />

      {/* Bulk Actions Panel */}
      {selectedLeads.length > 0 && (
        <BulkActionsPanel
          selectedLeads={selectedLeadObjects}
          onClearSelection={clearSelection}
          onBulkStatusUpdate={handleBulkStatusUpdate}
          onBulkDelete={handleBulkDelete}
          onBulkMessage={handleBulkMessage}
          onRefresh={() => {
            setRefreshKey(prev => prev + 1);
            refetch();
          }}
        />
      )}

      {/* Status Tabs with Leads Table */}
      <LeadsStatusTabs
        statusFilter={filters.status || 'all'}
        setStatusFilter={handleStatusFilterChange}
        finalFilteredLeads={leads}
        loading={loading}
        selectedLeads={selectedLeads}
        selectAllFiltered={selectAllVisible}
        toggleLeadSelection={toggleLeadSelection}
        handleAiOptInChange={handleAiOptInChange}
        handleDoNotContactChange={handleDoNotContactChange}
        canEdit={canEdit}
        searchTerm={filters.search || ''}
        onQuickView={showQuickView}
        getEngagementScore={getEngagementScore}
        onToggleHidden={handleToggleHidden}
      />

      {/* Load More Button for Pagination */}
      {stats.hasMore && !loading && (
        <div className="flex justify-center py-4">
          <button
            onClick={loadMore}
            className="px-6 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
          >
            Load More Leads ({stats.total - stats.visible} remaining)
          </button>
        </div>
      )}

      {/* Loading indicator for load more */}
      {loading && leads.length > 0 && (
        <div className="flex justify-center py-4">
          <InlineLoading text="Loading more leads..." />
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
    </div>
  );
};

export default EnhancedLeadsList;