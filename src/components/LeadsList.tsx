
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
import AIInsightBanner from '@/components/leads/AIInsightBanner';
import TodayOnlyToggle from '@/components/leads/TodayOnlyToggle';
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
    aiInsightFilters,
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
    searchFilters.vehicleInterest ? 1 : 0,
    searchFilters.city ? 1 : 0,
    searchFilters.state ? 1 : 0,
    searchFilters.engagementScoreMin !== undefined ? 1 : 0,
    searchFilters.engagementScoreMax !== undefined ? 1 : 0,
    searchFilters.doNotContact !== undefined ? 1 : 0
  ].reduce((sum, count) => sum + count, 0);

  // Calculate stats for LeadsStatsCards
  const calculateStats = () => {
    const today = new Date();
    const todayString = today.toDateString();
    
    return {
      total: finalFilteredLeads.length,
      noContact: finalFilteredLeads.filter(lead => lead.status === 'new').length,
      contacted: finalFilteredLeads.filter(lead => lead.outgoingCount > 0).length,
      responded: finalFilteredLeads.filter(lead => lead.incomingCount > 0).length,
      aiEnabled: finalFilteredLeads.filter(lead => lead.aiOptIn).length,
      fresh: finalFilteredLeads.filter(lead => new Date(lead.createdAt).toDateString() === todayString).length
    };
  };

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

  // Transform selected leads for BulkActionsPanel
  const selectedLeadObjects = finalFilteredLeads.filter(lead => 
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
    // This will be implemented by the BulkActionsPanel
    setRefreshKey(prev => prev + 1);
    await refetch();
  };

  const handleBulkDelete = async () => {
    // This will be implemented by the BulkActionsPanel
    setRefreshKey(prev => prev + 1);
    await refetch();
  };

  const handleBulkMessage = async () => {
    // This will be implemented by the BulkActionsPanel
    console.log('Bulk message action triggered');
  };

  return (
    <div className="space-y-6" key={refreshKey}>
      {/* AI Insight Banner */}
      {aiInsightFilters.source === 'ai_insight' && aiInsightFilters.leadIds && (
        <AIInsightBanner
          insightType={aiInsightFilters.insightType}
          leadCount={aiInsightFilters.leadIds.length}
          onClearFilters={clearFilters}
        />
      )}
      
      {/* Filter Restoration Banner */}
      {hasActiveFilters && aiInsightFilters.source !== 'ai_insight' && (
        <FilterRestorationBanner
          onClearFilters={clearFilters}
          filtersCount={filtersCount}
        />
      )}

      {/* Stats Cards */}
      <LeadsStatsCards 
        stats={calculateStats()}
      />

      {/* Filters Bar - Remove this component since we have proper tabs now */}
      {/* <LeadsFiltersBar
        filter={searchFilters.searchTerm}
        setFilter={(term) => setSearchFilters({ ...searchFilters, searchTerm: term })}
      /> */}

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
          onClose={hideQuickView}
          onMessage={() => {}}
          onCall={() => {}}
          onSchedule={() => {}}
        />
      )}
    </div>
  );
};

export default LeadsList;
