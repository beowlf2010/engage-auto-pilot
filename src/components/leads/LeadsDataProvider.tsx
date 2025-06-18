
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
}

const LeadsDataProvider = ({ 
  isVINImportModalOpen, 
  setIsVINImportModalOpen 
}: LeadsDataProviderProps) => {
  const {
    leads,
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

  // Calculate stats from all leads (not filtered)
  const stats = {
    total: leads.length,
    noContact: leads.filter(l => l.contactStatus === 'no_contact').length,
    contacted: leads.filter(l => l.contactStatus === 'contact_attempted').length,
    responded: leads.filter(l => l.contactStatus === 'response_received').length,
    aiEnabled: leads.filter(l => l.aiOptIn).length
  };

  // Mock functions for the enhanced search (these will be connected later)
  const handleSavePreset = async (name: string, filters: any) => {
    console.log('Saving preset:', name, filters);
  };

  const handleLoadPreset = (preset: any) => {
    console.log('Loading preset:', preset);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
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
      {/* Stats Cards */}
      <LeadsStatsCards stats={stats} />

      {/* Enhanced Search & Filters */}
      <EnhancedLeadSearch
        onFiltersChange={setSearchFilters}
        savedPresets={[]}
        onSavePreset={handleSavePreset}
        onLoadPreset={handleLoadPreset}
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
