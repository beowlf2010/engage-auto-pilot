
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useAdvancedLeads } from '@/hooks/useAdvancedLeads';
import { useLeadsOperations } from '@/hooks/leads/useLeadsOperations';
import LeadsStatsCards from '@/components/leads/LeadsStatsCards';
import LeadsFiltersBar from '@/components/leads/LeadsFiltersBar';
import LeadsStatusTabs from '@/components/leads/LeadsStatusTabs';
import LeadQuickView from '@/components/leads/LeadQuickView';
import BulkActionsPanel from '@/components/leads/BulkActionsPanel';
import FilterRestorationBanner from '@/components/leads/FilterRestorationBanner';
import { Lead } from '@/types/lead';

const LeadsList = () => {
  const { user } = useAuth();
  const { updateAiOptIn, updateDoNotContact } = useLeadsOperations();
  
  const {
    leads: finalFilteredLeads,
    loading,
    selectedLeads,
    quickViewLead,
    statusFilter,
    searchFilters,
    filtersLoaded,
    setStatusFilter,
    setSearchFilters,
    clearFilters,
    selectAllFiltered,
    clearSelection,
    toggleLeadSelection,
    showQuickView,
    hideQuickView,
    getEngagementScore,
    refetch
  } = useAdvancedLeads();

  const [refreshKey, setRefreshKey] = useState(0);

  const canEdit = user?.role === 'admin' || user?.role === 'manager';

  // Enhanced AI opt-in handler with immediate UI update
  const handleAiOptInChange = async (leadId: string, value: boolean) => {
    console.log('🔄 [LEADS LIST] Handling AI opt-in change:', { leadId, value });
    
    const success = await updateAiOptIn(leadId, value);
    
    if (success) {
      console.log('✅ [LEADS LIST] AI opt-in updated successfully, triggering refresh');
      // Force a refresh to update the filtered leads
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
    // This will be handled by the HideLeadButton component
    // and the leads will be automatically filtered by the hook
    setRefreshKey(prev => prev + 1);
    await refetch();
  };

  // Check if we have active filters
  const hasActiveFilters = statusFilter !== 'all' || 
    searchFilters.searchTerm !== '' ||
    searchFilters.dateFilter !== 'all' ||
    searchFilters.source ||
    searchFilters.aiOptIn !== undefined ||
    searchFilters.contactStatus ||
    searchFilters.vehicleInterest ||
    searchFilters.city ||
    searchFilters.state ||
    searchFilters.engagementScoreMin !== undefined ||
    searchFilters.engagementScoreMax !== undefined ||
    searchFilters.doNotContact !== undefined;

  const filtersCount = [
    statusFilter !== 'all' ? 1 : 0,
    searchFilters.searchTerm ? 1 : 0,
    searchFilters.dateFilter !== 'all' ? 1 : 0,
    searchFilters.source ? 1 : 0,
    searchFilters.aiOptIn !== undefined ? 1 : 0,
    searchFilters.contactStatus ? 1 : 0,
    searchFilters.vehicleInterest ? 1 : 0,
    searchFilters.city ? 1 : 0,
    searchFilters.state ? 1 : 0,
    searchFilters.engagementScoreMin !== undefined ? 1 : 0,
    searchFilters.engagementScoreMax !== undefined ? 1 : 0,
    searchFilters.doNotContact !== undefined ? 1 : 0
  ].reduce((sum, count) => sum + count, 0);

  if (!filtersLoaded) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading filters...</p>
        </div>
      </div>
    );
  }

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
        leads={finalFilteredLeads}
        loading={loading}
      />

      {/* Filters Bar */}
      <LeadsFiltersBar
        searchFilters={searchFilters}
        onFiltersChange={setSearchFilters}
        totalResults={finalFilteredLeads.length}
      />

      {/* Bulk Actions Panel */}
      {selectedLeads.length > 0 && (
        <BulkActionsPanel
          selectedLeadIds={selectedLeads}
          onClearSelection={clearSelection}
          onRefresh={() => {
            setRefreshKey(prev => prev + 1);
            refetch();
          }}
        />
      )}

      {/* Status Tabs with Leads Table */}
      <LeadsStatusTabs
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        finalFilteredLeads={finalFilteredLeads}
        loading={loading}
        selectedLeads={selectedLeads}
        selectAllFiltered={selectAllFiltered}
        toggleLeadSelection={toggleLeadSelection}
        handleAiOptInChange={handleAiOptInChange}
        handleDoNotContactChange={handleDoNotContactChange}
        canEdit={canEdit}
        searchTerm={searchFilters.searchTerm}
        onQuickView={showQuickView}
        getEngagementScore={getEngagementScore}
        onToggleHidden={handleToggleHidden}
      />

      {/* Quick View Modal */}
      {quickViewLead && (
        <LeadQuickView
          lead={quickViewLead}
          isOpen={!!quickViewLead}
          onClose={hideQuickView}
        />
      )}
    </div>
  );
};

export default LeadsList;
