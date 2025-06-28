
import React, { useState, useMemo } from 'react';
import { useAuth } from './auth/AuthProvider';
import { useLeads } from '@/hooks/useLeads';
import { useAdvancedLeads } from '@/hooks/useAdvancedLeads';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, UserCheck, UserX, Clock, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import LeadsTable from './LeadsTable';
import EnhancedLeadSearch from './leads/EnhancedLeadSearch';
import LeadsStatsCards from './leads/LeadsStatsCards';
import LeadQuickView from './leads/LeadQuickView';
import FilterRestorationBanner from './leads/FilterRestorationBanner';
import ShowHiddenLeadsToggle from './leads/ShowHiddenLeadsToggle';

const LeadsList = () => {
  const { user } = useAuth();
  const { 
    leads: allLeads, 
    updateAiOptIn, 
    updateDoNotContact, 
    refetch,
    showHidden,
    setShowHidden,
    hiddenCount,
    toggleLeadHidden
  } = useLeads();
  
  const {
    leads: filteredLeads,
    loading,
    statusFilter,
    setStatusFilter,
    searchFilters,
    setSearchFilters,
    selectedLeads,
    quickViewLead,
    savedPresets,
    savePreset,
    loadPreset,
    clearFilters,
    showQuickView,
    hideQuickView,
    getEngagementScore,
    filtersLoaded
  } = useAdvancedLeads();

  const canEdit = user?.role === 'admin' || user?.role === 'manager';

  // Check if filters were restored from persistence
  const hasRestoredFilters = filtersLoaded && (
    searchFilters.searchTerm ||
    searchFilters.status ||
    searchFilters.source ||
    searchFilters.aiOptIn !== undefined ||
    searchFilters.activeNotOptedIn ||
    searchFilters.contactStatus ||
    searchFilters.dateFilter !== 'all' ||
    searchFilters.vehicleInterest ||
    searchFilters.city ||
    searchFilters.state ||
    searchFilters.engagementScoreMin !== undefined ||
    searchFilters.engagementScoreMax !== undefined ||
    searchFilters.doNotContact !== undefined ||
    statusFilter !== 'all'
  );

  const restoredFiltersCount = [
    searchFilters.searchTerm,
    searchFilters.status,
    searchFilters.source,
    searchFilters.aiOptIn !== undefined,
    searchFilters.activeNotOptedIn,
    searchFilters.contactStatus,
    searchFilters.dateFilter !== 'all',
    searchFilters.vehicleInterest,
    searchFilters.city,
    searchFilters.state,
    searchFilters.engagementScoreMin !== undefined,
    searchFilters.engagementScoreMax !== undefined,
    searchFilters.doNotContact !== undefined,
    statusFilter !== 'all'
  ].filter(Boolean).length;

  // Enhanced AI opt-in handler with improved state management
  const handleAiOptInChange = async (leadId: string, aiOptIn: boolean) => {
    console.log('🤖 [LEADS LIST] AI opt-in change requested:', { leadId, aiOptIn });
    
    try {
      // First update the local state optimistically
      await updateAiOptIn(leadId, aiOptIn);
      console.log('✅ [LEADS LIST] Local state updated');
      
      // Add a longer delay to ensure database consistency before refetch
      setTimeout(async () => {
        console.log('🔄 [LEADS LIST] Refetching leads data');
        await refetch();
        console.log('✅ [LEADS LIST] Leads data refreshed');
      }, 1000);
      
    } catch (error) {
      console.error('❌ [LEADS LIST] Error updating AI opt-in:', error);
      toast({
        title: "Error",
        description: "Failed to update AI settings. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Calculate stats for LeadsStatsCards - structure it properly for the component
  const statsData = useMemo(() => {
    const today = new Date();
    const todayString = today.toDateString();
    
    // Filter out hidden leads unless specifically showing them
    const visibleLeads = showHidden ? allLeads : allLeads.filter(lead => !lead.is_hidden);
    
    const totalLeads = visibleLeads.filter(lead => 
      lead.status !== 'lost' && 
      !lead.doNotCall && !lead.doNotEmail && !lead.doNotMail
    ).length;
    
    const noContactLeads = visibleLeads.filter(lead => 
      lead.contactStatus === 'no_contact' && 
      lead.status !== 'lost' &&
      !lead.doNotCall && !lead.doNotEmail && !lead.doNotMail
    ).length;
    
    const contactedLeads = visibleLeads.filter(lead => 
      lead.contactStatus === 'contact_attempted' && 
      lead.status !== 'lost'
    ).length;
    
    const respondedLeads = visibleLeads.filter(lead => 
      (lead.contactStatus === 'response_received' || lead.status === 'engaged') && 
      lead.status !== 'lost'
    ).length;
    
    const aiEnabledLeads = visibleLeads.filter(lead => lead.aiOptIn).length;
    
    const freshLeads = visibleLeads.filter(lead => {
      const leadDate = new Date(lead.createdAt);
      return leadDate.toDateString() === todayString;
    }).length;

    return {
      stats: {
        total: totalLeads,
        noContact: noContactLeads,
        contacted: contactedLeads,
        responded: respondedLeads,
        aiEnabled: aiEnabledLeads,
        fresh: freshLeads
      }
    };
  }, [allLeads, showHidden]);

  const getTabCounts = () => {
    // Filter out hidden leads unless specifically showing them
    const visibleLeads = showHidden ? allLeads : allLeads.filter(lead => !lead.is_hidden);
    
    return {
      all: visibleLeads.filter(lead => 
        lead.status !== 'lost' && 
        !lead.doNotCall && !lead.doNotEmail && !lead.doNotMail
      ).length,
      new: visibleLeads.filter(lead => 
        lead.contactStatus === 'no_contact' && 
        lead.status !== 'lost' &&
        !lead.doNotCall && !lead.doNotEmail && !lead.doNotMail
      ).length,
      engaged: visibleLeads.filter(lead => 
        (lead.contactStatus === 'response_received' || lead.status === 'engaged') && 
        lead.status !== 'lost'
      ).length,
      paused: visibleLeads.filter(lead => lead.status === 'paused').length,
      closed: visibleLeads.filter(lead => lead.status === 'closed').length,
      lost: visibleLeads.filter(lead => lead.status === 'lost').length,
      do_not_contact: visibleLeads.filter(lead => 
        lead.doNotCall || lead.doNotEmail || lead.doNotMail
      ).length
    };
  };

  const tabCounts = getTabCounts();

  // Handler functions for LeadQuickView
  const handleMessage = (lead: any) => {
    // Navigate to lead detail or open messaging interface
    console.log('Message lead:', lead.id);
  };

  const handleCall = (phoneNumber: string) => {
    // Initiate call or copy phone number
    if (phoneNumber) {
      window.open(`tel:${phoneNumber}`);
    }
  };

  const handleSchedule = (lead: any) => {
    // Open scheduling interface
    console.log('Schedule with lead:', lead.id);
  };

  return (
    <div className="space-y-6">
      {/* Filter Restoration Banner */}
      {hasRestoredFilters && (
        <FilterRestorationBanner
          onClearFilters={clearFilters}
          filtersCount={restoredFiltersCount}
        />
      )}

      {/* Hidden Leads Toggle */}
      <ShowHiddenLeadsToggle
        showHidden={showHidden}
        onToggle={setShowHidden}
        hiddenCount={hiddenCount}
      />

      {/* Stats Cards */}
      <LeadsStatsCards {...statsData} />

      {/* Search & Filters */}
      <EnhancedLeadSearch
        onFiltersChange={setSearchFilters}
        savedPresets={savedPresets}
        onSavePreset={savePreset}
        onLoadPreset={loadPreset}
        totalResults={filteredLeads.length}
        isLoading={loading}
      />

      {/* Status Tabs */}
      <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-full">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="all" className="flex items-center space-x-1">
            <Users className="w-4 h-4" />
            <span>All</span>
            <Badge variant="secondary" className="ml-1">{tabCounts.all}</Badge>
          </TabsTrigger>
          <TabsTrigger value="new" className="flex items-center space-x-1">
            <UserCheck className="w-4 h-4" />
            <span>New</span>
            <Badge variant="secondary" className="ml-1">{tabCounts.new}</Badge>
          </TabsTrigger>
          <TabsTrigger value="engaged" className="flex items-center space-x-1">
            <CheckCircle className="w-4 h-4" />
            <span>Engaged</span>
            <Badge variant="secondary" className="ml-1">{tabCounts.engaged}</Badge>
          </TabsTrigger>
          <TabsTrigger value="paused" className="flex items-center space-x-1">
            <Clock className="w-4 h-4" />
            <span>Paused</span>
            <Badge variant="secondary" className="ml-1">{tabCounts.paused}</Badge>
          </TabsTrigger>
          <TabsTrigger value="closed" className="flex items-center space-x-1">
            <CheckCircle className="w-4 h-4" />
            <span>Closed</span>
            <Badge variant="secondary" className="ml-1">{tabCounts.closed}</Badge>
          </TabsTrigger>
          <TabsTrigger value="lost" className="flex items-center space-x-1">
            <XCircle className="w-4 h-4" />
            <span>Lost</span>
            <Badge variant="secondary" className="ml-1">{tabCounts.lost}</Badge>
          </TabsTrigger>
          <TabsTrigger value="do_not_contact" className="flex items-center space-x-1">
            <AlertTriangle className="w-4 h-4" />
            <span>DNC</span>
            <Badge variant="secondary" className="ml-1">{tabCounts.do_not_contact}</Badge>
          </TabsTrigger>
        </TabsList>

        {/* Tab Content - All tabs show the same table with different filters */}
        {['all', 'new', 'engaged', 'paused', 'closed', 'lost', 'do_not_contact'].map(tab => (
          <TabsContent key={tab} value={tab}>
            <Card>
              <CardContent className="p-0">
                {/* Leads Table */}
                <LeadsTable
                  leads={filteredLeads}
                  onAiOptInChange={handleAiOptInChange}
                  onDoNotContactChange={updateDoNotContact}
                  canEdit={canEdit}
                  loading={loading}
                  searchTerm={searchFilters.searchTerm}
                  selectedLeads={selectedLeads}
                  onLeadSelect={() => {}} // Implement if needed
                  onQuickView={showQuickView}
                  getEngagementScore={getEngagementScore}
                  onToggleHidden={toggleLeadHidden}
                />
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

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
    </div>
  );
};

export default LeadsList;
