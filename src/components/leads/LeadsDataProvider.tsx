import React, { useState } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAdvancedLeads } from '@/hooks/useAdvancedLeads';
import { Lead } from '@/types/lead';
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import LeadsStatsCards from './LeadsStatsCards';
import EnhancedLeadSearch from './EnhancedLeadSearch';
import LeadsBulkActionsHandler from './LeadsBulkActionsHandler';
import LeadsStatusTabs from './LeadsStatusTabs';
import LeadQuickView from './LeadQuickView';
import VINImportModal from './VINImportModal';

interface LeadsDataProviderProps {
  isVINImportModalOpen: boolean;
  setIsVINImportModalOpen: (open: boolean) => void;
  showFreshLeadsOnly?: boolean;
}

const LeadsDataProvider = ({ 
  isVINImportModalOpen, 
  setIsVINImportModalOpen,
  showFreshLeadsOnly = false
}: LeadsDataProviderProps) => {
  const {
    leads: allLeads,
    loading,
    selectedLeads,
    quickViewLead,
    statusFilter,
    searchFilters,
    refetch,
    getEngagementScore,
    setStatusFilter,
    setSearchFilters,
    selectAllFiltered,
    clearSelection,
    toggleLeadSelection,
    showQuickView,
    hideQuickView
  } = useAdvancedLeads();

  const { profile } = useAuth();
  const canEdit = profile?.role === 'manager' || profile?.role === 'admin';

  // Track active stats card filter
  const [activeStatsFilter, setActiveStatsFilter] = useState<string | null>(null);

  // Filter leads based on fresh leads toggle and search filters
  const getFilteredLeads = () => {
    let filtered = [...allLeads];

    // Apply fresh leads filter
    if (showFreshLeadsOnly) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      filtered = filtered.filter(lead => {
        const leadDate = new Date(lead.createdAt);
        leadDate.setHours(0, 0, 0, 0);
        return leadDate.getTime() === today.getTime();
      });
    }

    // Apply date filter from search
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

    return filtered;
  };

  const leads = getFilteredLeads();

  // Handle stats card clicks
  const handleStatsCardClick = (filterType: 'fresh' | 'all' | 'no_contact' | 'contact_attempted' | 'response_received' | 'ai_enabled') => {
    setActiveStatsFilter(filterType);
    
    switch (filterType) {
      case 'fresh':
        setSearchFilters({ ...searchFilters, dateFilter: 'today' });
        setStatusFilter('all');
        break;
      case 'all':
        setSearchFilters({ ...searchFilters, dateFilter: 'all' });
        setStatusFilter('all');
        break;
      case 'no_contact':
        setSearchFilters({ ...searchFilters, contactStatus: 'no_contact' });
        setStatusFilter('all');
        break;
      case 'contact_attempted':
        setSearchFilters({ ...searchFilters, contactStatus: 'contact_attempted' });
        setStatusFilter('all');
        break;
      case 'response_received':
        setSearchFilters({ ...searchFilters, contactStatus: 'response_received' });
        setStatusFilter('all');
        break;
      case 'ai_enabled':
        setSearchFilters({ ...searchFilters, aiOptIn: true });
        setStatusFilter('all');
        break;
    }
  };

  // Smart sorting: Fresh leads first, then by contact status, then by creation time
  const sortedLeads = [...leads].sort((a, b) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const aDate = new Date(a.createdAt);
    aDate.setHours(0, 0, 0, 0);
    const bDate = new Date(b.createdAt);
    bDate.setHours(0, 0, 0, 0);
    
    const aIsFresh = aDate.getTime() === today.getTime();
    const bIsFresh = bDate.getTime() === today.getTime();
    
    // Fresh leads first
    if (aIsFresh && !bIsFresh) return -1;
    if (!aIsFresh && bIsFresh) return 1;
    
    // Then by contact status
    const statusOrder = { 'no_contact': 0, 'contact_attempted': 1, 'response_received': 2 };
    if (a.contactStatus !== b.contactStatus) {
      return statusOrder[a.contactStatus] - statusOrder[b.contactStatus];
    }
    
    // Finally by creation time (newest first)
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const handleAiOptInChange = async (leadId: string, value: boolean) => {
    try {
      const { error } = await supabase
        .from('leads')
        .update({ ai_opt_in: value })
        .eq('id', leadId);

      if (error) throw error;

      toast({
        title: "Lead updated",
        description: `Finn AI ${value ? 'enabled' : 'disabled'} for this lead`,
      });

      refetch();
    } catch (error) {
      console.error('Error updating lead:', error);
      toast({
        title: "Error",
        description: "Failed to update lead",
        variant: "destructive",
      });
    }
  };

  const handleMessage = (lead: Lead) => {
    window.location.href = `/inbox?leadId=${lead.id}`;
  };

  const handleCall = (phoneNumber: string) => {
    window.open(`tel:${phoneNumber}`);
  };

  const handleSchedule = (lead: Lead) => {
    toast({
      title: "Schedule appointment",
      description: `Opening calendar for ${lead.firstName} ${lead.lastName}`,
    });
  };

  const handleVINImportSuccess = () => {
    refetch();
    toast({
      title: "Import successful",
      description: "VIN data has been imported and leads have been updated",
    });
  };

  // Calculate stats from all leads (not filtered) including fresh count
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const stats = {
    total: allLeads.length,
    noContact: allLeads.filter(l => l.contactStatus === 'no_contact').length,
    contacted: allLeads.filter(l => l.contactStatus === 'contact_attempted').length,
    responded: allLeads.filter(l => l.contactStatus === 'response_received').length,
    aiEnabled: allLeads.filter(l => l.aiOptIn).length,
    fresh: allLeads.filter(l => {
      const leadDate = new Date(l.createdAt);
      leadDate.setHours(0, 0, 0, 0);
      return leadDate.getTime() === today.getTime();
    }).length
  };

  // Mock functions for the enhanced search
  const handleSavePreset = async (name: string, filters: any) => {
    console.log('Saving preset:', name, filters);
  };

  const handleLoadPreset = (preset: any) => {
    console.log('Loading preset:', preset);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-16" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-12" />
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards with Fresh Leads */}
      <LeadsStatsCards 
        stats={stats} 
        onCardClick={handleStatsCardClick}
        activeFilter={activeStatsFilter}
      />

      {/* Enhanced Search & Filters */}
      <EnhancedLeadSearch
        onFiltersChange={setSearchFilters}
        savedPresets={[]}
        onSavePreset={handleSavePreset}
        onLoadPreset={handleLoadPreset}
        totalResults={sortedLeads.length}
        isLoading={loading}
      />

      {/* Bulk Actions Panel */}
      <LeadsBulkActionsHandler
        selectedLeads={selectedLeads}
        leads={sortedLeads}
        clearSelection={clearSelection}
        refetch={refetch}
      />

      {/* Status Filter Tabs */}
      <LeadsStatusTabs
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        finalFilteredLeads={sortedLeads}
        loading={loading}
        selectedLeads={selectedLeads}
        selectAllFiltered={selectAllFiltered}
        toggleLeadSelection={toggleLeadSelection}
        handleAiOptInChange={handleAiOptInChange}
        canEdit={canEdit}
        searchTerm={searchFilters.searchTerm}
        onQuickView={showQuickView}
        getEngagementScore={getEngagementScore}
      />

      {/* Quick View Modal */}
      {quickViewLead && (
        <LeadQuickView
          lead={quickViewLead}
          onClose={hideQuickView}
          onMessage={handleMessage}
          onCall={handleCall}
          onSchedule={handleSchedule}
        />
      )}

      {/* VIN Import Modal */}
      <VINImportModal
        isOpen={isVINImportModalOpen}
        onClose={() => setIsVINImportModalOpen(false)}
        onImportSuccess={handleVINImportSuccess}
      />
    </div>
  );
};

export default LeadsDataProvider;
