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
    savedPresets,
    refetch,
    getEngagementScore,
    setStatusFilter,
    setSearchFilters,
    savePreset,
    loadPreset,
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

  // Get the final filtered leads
  const leads = showFreshLeadsOnly ? allLeads.filter(lead => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const leadDate = new Date(lead.createdAt);
    leadDate.setHours(0, 0, 0, 0);
    return leadDate.getTime() === today.getTime();
  }) : allLeads;

  // Handle stats card clicks with proper filtering
  const handleStatsCardClick = (filterType: 'fresh' | 'all' | 'no_contact' | 'contact_attempted' | 'response_received' | 'ai_enabled') => {
    setActiveStatsFilter(filterType);
    
    // Force a refresh to get the latest data from database
    console.log('🔄 [LEADS DATA] Forcing refresh for stats card click:', filterType);
    refetch();
    
    switch (filterType) {
      case 'fresh':
        setSearchFilters({ ...searchFilters, dateFilter: 'today', contactStatus: undefined });
        setStatusFilter('all');
        break;
      case 'all':
        setSearchFilters({ ...searchFilters, dateFilter: 'all', contactStatus: undefined });
        setStatusFilter('all');
        break;
      case 'no_contact':
        setSearchFilters({ ...searchFilters, contactStatus: 'no_contact', dateFilter: 'all' });
        setStatusFilter('all');
        break;
      case 'contact_attempted':
        setSearchFilters({ ...searchFilters, contactStatus: 'contact_attempted', dateFilter: 'all' });
        setStatusFilter('all');
        break;
      case 'response_received':
        setSearchFilters({ ...searchFilters, contactStatus: 'response_received', dateFilter: 'all' });
        setStatusFilter('all');
        break;
      case 'ai_enabled':
        setSearchFilters({ ...searchFilters, aiOptIn: true, contactStatus: undefined, dateFilter: 'all' });
        setStatusFilter('all');
        break;
    }
  };

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

      // Force refresh to get updated data
      console.log('🔄 [LEADS DATA] Forcing refresh after AI opt-in change');
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

  const handleDoNotContactChange = async (leadId: string, field: 'doNotCall' | 'doNotEmail' | 'doNotMail', value: boolean) => {
    try {
      const updateData = {
        [field === 'doNotCall' ? 'do_not_call' : field === 'doNotEmail' ? 'do_not_email' : 'do_not_mail']: value
      };

      const { error } = await supabase
        .from('leads')
        .update(updateData)
        .eq('id', leadId);

      if (error) throw error;

      const actionText = value ? 'enabled' : 'disabled';
      const restrictionType = field === 'doNotCall' ? 'call' : field === 'doNotEmail' ? 'email' : 'mail';

      toast({
        title: "Contact restriction updated",
        description: `Do not ${restrictionType} ${actionText} for this lead`,
      });

      // Force refresh to get updated data
      console.log('🔄 [LEADS DATA] Forcing refresh after do-not-contact change');
      refetch();
    } catch (error) {
      console.error('Error updating lead contact restrictions:', error);
      toast({
        title: "Error",
        description: "Failed to update contact restrictions",
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
    window.location.href = `/appointments/schedule?leadId=${lead.id}`;
  };

  const handleVINImportSuccess = () => {
    console.log('🔄 [LEADS DATA] Forcing refresh after VIN import');
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
        savedPresets={savedPresets}
        onSavePreset={savePreset}
        onLoadPreset={loadPreset}
        totalResults={leads.length}
        isLoading={loading}
      />

      {/* Bulk Actions Panel */}
      <LeadsBulkActionsHandler
        selectedLeads={selectedLeads}
        leads={leads}
        clearSelection={clearSelection}
        refetch={refetch}
      />

      {/* Status Filter Tabs */}
      <LeadsStatusTabs
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        finalFilteredLeads={leads}
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
