import React, { useState } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAdvancedLeads } from '@/hooks/useAdvancedLeads';
import { Lead } from '@/types/lead';
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { RefreshCw, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
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

const LoadingProgressDisplay = ({ progress, onRetry }: { progress: any[], onRetry: () => void }) => {
  const hasError = progress.some(p => p.error);
  
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">Loading Leads</h3>
          {hasError && (
            <Button variant="outline" size="sm" onClick={onRetry}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {progress.map((step, index) => (
          <div key={index} className="flex items-center space-x-3">
            {step.error ? (
              <AlertCircle className="w-4 h-4 text-red-500" />
            ) : step.completed ? (
              <CheckCircle2 className="w-4 h-4 text-green-500" />
            ) : (
              <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
            )}
            <span className={`text-sm ${step.error ? 'text-red-600' : step.completed ? 'text-green-600' : 'text-gray-600'}`}>
              {step.step}
            </span>
            {step.error && (
              <span className="text-xs text-red-500">({step.error})</span>
            )}
          </div>
        ))}
        {hasError && (
          <Alert className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              There was an issue loading your leads. This could be due to a network connection problem or server timeout. Please try refreshing the page or check your internet connection.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

const LeadsDataProvider = ({ 
  isVINImportModalOpen, 
  setIsVINImportModalOpen,
  showFreshLeadsOnly = false
}: LeadsDataProviderProps) => {
  const {
    leads: allLeads,
    loading,
    error,
    loadingProgress,
    retry,
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

  // Show loading with progress if still loading
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingProgressDisplay progress={loadingProgress} onRetry={retry} />
        </div>
      </div>
    );
  }

  // Show error state if there's an error
  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <Card className="w-full max-w-md mx-auto">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <h3 className="text-lg font-medium text-red-600">Failed to Load Leads</h3>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
              <div className="space-y-2">
                <Button onClick={retry} className="w-full">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
                <Button variant="outline" onClick={() => window.location.reload()} className="w-full">
                  Refresh Page
                </Button>
              </div>
              <div className="text-xs text-gray-500 space-y-1">
                <p>If this problem persists:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Check your internet connection</li>
                  <li>Try refreshing the page</li>
                  <li>Contact support if the issue continues</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

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
