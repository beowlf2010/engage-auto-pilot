import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Users, MessageSquare, UserCheck, UserX, Plus } from "lucide-react";
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Skeleton } from "@/components/ui/skeleton";
import LeadsTable from './LeadsTable';
import LeadQuickView from './leads/LeadQuickView';
import BulkActionsPanel from './leads/BulkActionsPanel';
import EnhancedLeadSearch, { SearchFilters, SavedPreset } from './leads/EnhancedLeadSearch';
import { useAdvancedLeads } from '@/hooks/useAdvancedLeads';
import { Lead } from '@/types/lead';

const LeadsList = () => {
  const {
    leads,
    loading,
    selectedLeads,
    quickViewLead,
    refetch,
    getEngagementScore
  } = useAdvancedLeads();

  const { profile } = useAuth();
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({ searchTerm: '' });
  const [savedPresets] = useState<SavedPreset[]>([]);

  const canEdit = profile?.role === 'manager' || profile?.role === 'admin';

  // Simple filter implementation
  const filteredLeads = leads.filter(lead => {
    // Search term filter
    if (searchFilters.searchTerm) {
      const searchTerm = searchFilters.searchTerm.toLowerCase();
      const matchesSearch = 
        lead.firstName.toLowerCase().includes(searchTerm) ||
        lead.lastName.toLowerCase().includes(searchTerm) ||
        lead.email?.toLowerCase().includes(searchTerm) ||
        lead.primaryPhone?.includes(searchTerm) ||
        lead.vehicleInterest.toLowerCase().includes(searchTerm);
      
      if (!matchesSearch) return false;
    }

    // Status filter
    if (searchFilters.status && lead.status !== searchFilters.status) {
      return false;
    }

    // Source filter
    if (searchFilters.source && lead.source !== searchFilters.source) {
      return false;
    }

    // AI Opt-in filter
    if (searchFilters.aiOptIn !== undefined && lead.aiOptIn !== searchFilters.aiOptIn) {
      return false;
    }

    return true;
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

  // Apply status filter to the filtered leads from search
  const finalFilteredLeads = filteredLeads.filter(lead => {
    return statusFilter === 'all' || lead.status === statusFilter;
  });

  const stats = {
    total: leads.length,
    noContact: leads.filter(l => l.contactStatus === 'no_contact').length,
    contacted: leads.filter(l => l.contactStatus === 'contact_attempted').length,
    responded: leads.filter(l => l.contactStatus === 'response_received').length,
    aiEnabled: leads.filter(l => l.aiOptIn).length
  };

  // Mock functions for the enhanced search
  const handleSavePreset = async (name: string, filters: SearchFilters) => {
    console.log('Saving preset:', name, filters);
  };

  const handleLoadPreset = (preset: SavedPreset) => {
    setSearchFilters(preset.filters);
  };

  const clearSelection = () => {
    // Mock implementation
  };

  const toggleLeadSelection = (leadId: string) => {
    // Mock implementation
  };

  const showQuickView = (lead: Lead) => {
    // Mock implementation
  };

  const hideQuickView = () => {
    // Mock implementation
  };

  const selectAllFiltered = () => {
    // Mock implementation
  };

  // Bulk action handlers
  const handleBulkStatusUpdate = async (status: string) => {
    try {
      const { error } = await supabase
        .from('leads')
        .update({ status })
        .in('id', selectedLeads);

      if (error) throw error;

      toast({
        title: "Bulk update successful",
        description: `Updated ${selectedLeads.length} leads to ${status} status`,
      });

      refetch();
      clearSelection();
    } catch (error) {
      console.error('Error updating leads:', error);
      toast({
        title: "Error",
        description: "Failed to update leads",
        variant: "destructive",
      });
    }
  };

  const handleBulkAiToggle = async (enabled: boolean) => {
    try {
      const { error } = await supabase
        .from('leads')
        .update({ ai_opt_in: enabled })
        .in('id', selectedLeads);

      if (error) throw error;

      toast({
        title: "Bulk update successful",
        description: `${enabled ? 'Enabled' : 'Disabled'} AI for ${selectedLeads.length} leads`,
      });

      refetch();
      clearSelection();
    } catch (error) {
      console.error('Error updating leads:', error);
      toast({
        title: "Error",
        description: "Failed to update leads",
        variant: "destructive",
      });
    }
  };

  const handleBulkMessage = async () => {
    toast({
      title: "Bulk message queued",
      description: `Message queued for ${selectedLeads.length} leads`,
    });
    clearSelection();
  };

  const handleBulkAssign = async (salespersonId: string) => {
    try {
      const { error } = await supabase
        .from('leads')
        .update({ salesperson_id: salespersonId })
        .in('id', selectedLeads);

      if (error) throw error;

      toast({
        title: "Bulk assignment successful",
        description: `Assigned ${selectedLeads.length} leads`,
      });

      refetch();
      clearSelection();
    } catch (error) {
      console.error('Error assigning leads:', error);
      toast({
        title: "Error",
        description: "Failed to assign leads",
        variant: "destructive",
      });
    }
  };

  const handleBulkExport = () => {
    const selectedLeadData = leads.filter(lead => 
      selectedLeads.includes(lead.id.toString())
    );
    
    const csv = [
      ['Name', 'Email', 'Phone', 'Status', 'Vehicle Interest', 'Created At'].join(','),
      ...selectedLeadData.map(lead => [
        `"${lead.firstName} ${lead.lastName}"`,
        `"${lead.email || ''}"`,
        `"${lead.primaryPhone || ''}"`,
        `"${lead.status}"`,
        `"${lead.vehicleInterest}"`,
        `"${lead.createdAt}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leads-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Export successful",
      description: `Exported ${selectedLeads.length} leads`,
    });
  };

  const handleBulkDelete = async () => {
    try {
      const { error } = await supabase
        .from('leads')
        .delete()
        .in('id', selectedLeads);

      if (error) throw error;

      toast({
        title: "Bulk delete successful",
        description: `Deleted ${selectedLeads.length} leads`,
      });

      refetch();
      clearSelection();
    } catch (error) {
      console.error('Error deleting leads:', error);
      toast({
        title: "Error",
        description: "Failed to delete leads",
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

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Leads</h1>
        </div>
        
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
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Leads</h1>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Add Lead
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">No Contact</CardTitle>
            <UserX className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.noContact}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contacted</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.contacted}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Responded</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.responded}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Finn AI Enabled</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.aiEnabled}</div>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Search & Filters */}
      <EnhancedLeadSearch
        onFiltersChange={setSearchFilters}
        savedPresets={savedPresets}
        onSavePreset={handleSavePreset}
        onLoadPreset={handleLoadPreset}
        totalResults={finalFilteredLeads.length}
        isLoading={loading}
      />

      {/* Bulk Actions Panel */}
      {selectedLeads.length > 0 && (
        <BulkActionsPanel
          selectedLeads={selectedLeadObjects}
          onClearSelection={clearSelection}
          onBulkStatusUpdate={handleBulkStatusUpdate}
          onBulkDelete={handleBulkDelete}
          onBulkMessage={handleBulkMessage}
        />
      )}

      {/* Status Filter Tabs */}
      <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="new">New</TabsTrigger>
          <TabsTrigger value="engaged">Engaged</TabsTrigger>
          <TabsTrigger value="paused">Paused</TabsTrigger>
          <TabsTrigger value="closed">Closed</TabsTrigger>
          <TabsTrigger value="lost">Lost</TabsTrigger>
        </TabsList>

        <TabsContent value={statusFilter} className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Badge variant="outline">
                {finalFilteredLeads.length} lead{finalFilteredLeads.length !== 1 ? 's' : ''}
              </Badge>
            </div>
            {finalFilteredLeads.length > 0 && (
              <Button
                variant="outline"
                onClick={selectAllFiltered}
                disabled={selectedLeads.length === finalFilteredLeads.length}
              >
                Select All ({finalFilteredLeads.length})
              </Button>
            )}
          </div>

          <LeadsTable
            leads={finalFilteredLeads}
            onAiOptInChange={handleAiOptInChange}
            canEdit={canEdit}
            loading={loading}
            searchTerm={searchFilters.searchTerm}
            selectedLeads={selectedLeads}
            onLeadSelect={toggleLeadSelection}
            onQuickView={showQuickView}
            getEngagementScore={getEngagementScore}
          />
        </TabsContent>
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
