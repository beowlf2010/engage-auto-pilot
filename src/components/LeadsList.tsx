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
import AdvancedFilters from './leads/AdvancedFilters';
import BulkActionsPanel from './leads/BulkActionsPanel';
import { useAdvancedLeads } from '@/hooks/useAdvancedLeads';
import { Lead } from '@/types/lead';

const LeadsList = () => {
  const {
    leads,
    loading,
    selectedLeads,
    quickViewLead,
    savedPresets,
    filters,
    setFilters,
    savePreset,
    loadPreset,
    clearFilters,
    selectAllFiltered,
    clearSelection,
    toggleLeadSelection,
    showQuickView,
    hideQuickView,
    refetch,
    getEngagementScore
  } = useAdvancedLeads();

  const { profile } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

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

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = searchTerm === '' || 
      `${lead.firstName} ${lead.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.primaryPhone?.includes(searchTerm) ||
      lead.vehicleInterest?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: leads.length,
    noContact: leads.filter(l => l.contactStatus === 'no_contact').length,
    contacted: leads.filter(l => l.contactStatus === 'contact_attempted').length,
    responded: leads.filter(l => l.contactStatus === 'response_received').length,
    aiEnabled: leads.filter(l => l.aiOptIn).length
  };

  // Mock salespeople data - in real app, fetch from API
  const salespeople = [
    { id: '1', name: 'John Smith' },
    { id: '2', name: 'Jane Doe' },
    { id: '3', name: 'Mike Johnson' }
  ];

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

  const handleBulkMessage = async (message: string) => {
    // This would integrate with your messaging system
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

  // Quick view handlers
  const handleMessage = (lead: Lead) => {
    // Navigate to inbox with lead selected
    window.location.href = `/inbox?leadId=${lead.id}`;
  };

  const handleCall = (phoneNumber: string) => {
    // Trigger phone call - could integrate with softphone
    window.open(`tel:${phoneNumber}`);
  };

  const handleSchedule = (lead: Lead) => {
    // Open scheduling modal or navigate to calendar
    toast({
      title: "Schedule appointment",
      description: `Opening calendar for ${lead.firstName} ${lead.lastName}`,
    });
  };

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

      {/* Advanced Filters */}
      <AdvancedFilters
        filters={filters}
        onFiltersChange={setFilters}
        onSavePreset={savePreset}
        savedPresets={savedPresets}
        onLoadPreset={loadPreset}
        onClearFilters={clearFilters}
      />

      {/* Bulk Actions Panel */}
      {selectedLeads.length > 0 && (
        <BulkActionsPanel
          selectedCount={selectedLeads.length}
          onClose={clearSelection}
          onBulkStatusUpdate={handleBulkStatusUpdate}
          onBulkAiToggle={handleBulkAiToggle}
          onBulkMessage={handleBulkMessage}
          onBulkAssign={handleBulkAssign}
          onBulkExport={handleBulkExport}
          salespeople={salespeople}
        />
      )}

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search leads by name, email, phone, or vehicle interest..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        {filteredLeads.length > 0 && (
          <Button
            variant="outline"
            onClick={selectAllFiltered}
            disabled={selectedLeads.length === filteredLeads.length}
          >
            Select All ({filteredLeads.length})
          </Button>
        )}
      </div>

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
                {filteredLeads.length} lead{filteredLeads.length !== 1 ? 's' : ''}
              </Badge>
              {searchTerm && (
                <Badge variant="secondary">
                  Filtered by: "{searchTerm}"
                </Badge>
              )}
            </div>
          </div>

          <LeadsTable
            leads={filteredLeads}
            onAiOptInChange={handleAiOptInChange}
            canEdit={canEdit}
            loading={loading}
            searchTerm={searchTerm}
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
