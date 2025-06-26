
import React, { useState, useMemo } from 'react';
import { useAuth } from './auth/AuthProvider';
import { useLeads } from '@/hooks/useLeads';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Users, Eye, EyeOff } from 'lucide-react';
import LeadsTable from './LeadsTable';
import LeadsStatsCards from './leads/LeadsStatsCards';
import EnhancedLeadSearch from './leads/EnhancedLeadSearch';
import MultiFileLeadUploadModal from './leads/MultiFileLeadUploadModal';
import { Lead } from '@/types/lead';
import { useToast } from '@/hooks/use-toast';

const LeadsList = () => {
  const { profile, initializeUserForCSV } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [quickViewLead, setQuickViewLead] = useState<Lead | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  const {
    leads,
    loading,
    error,
    refetch,
    updateAiOptIn,
    updateDoNotContact,
    showHidden,
    setShowHidden,
    hiddenCount
  } = useLeads();

  // Initialize user for CSV operations when component mounts
  React.useEffect(() => {
    const initUser = async () => {
      if (profile) {
        try {
          const result = await initializeUserForCSV();
          if (!result.success) {
            console.warn('Failed to initialize user for CSV:', result.error);
          }
        } catch (error) {
          console.error('Error initializing user for CSV:', error);
        }
      }
    };

    initUser();
  }, [profile, initializeUserForCSV]);

  // Filtering logic, event handlers, etc.
  const filteredLeads = useMemo(() => {
    if (!leads) return [];
    
    return leads.filter(lead => {
      const matchesSearch = !searchTerm || 
        lead.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.vehicleInterest?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesHiddenFilter = showHidden || !lead.is_hidden;
      
      return matchesSearch && matchesHiddenFilter;
    });
  }, [leads, searchTerm, showHidden]);

  const handleLeadSelect = (leadId: string) => {
    setSelectedLeads(prev => 
      prev.includes(leadId) 
        ? prev.filter(id => id !== leadId)
        : [...prev, leadId]
    );
  };

  const handleQuickView = (lead: Lead) => {
    setQuickViewLead(lead);
  };

  const getEngagementScore = (lead: Lead) => {
    let score = 0;
    if (lead.lastMessageTime) score += 30;
    if (lead.phoneNumbers && lead.phoneNumbers.length > 0) score += 20;
    if (lead.email) score += 15;
    if (lead.vehicleInterest && lead.vehicleInterest !== 'finding the right vehicle for your needs') score += 25;
    return Math.min(score, 100);
  };

  // Calculate stats for LeadsStatsCards
  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return {
      total: filteredLeads.length,
      noContact: filteredLeads.filter(lead => lead.contactStatus === 'no_contact').length,
      contacted: filteredLeads.filter(lead => lead.contactStatus === 'contact_attempted').length,
      responded: filteredLeads.filter(lead => lead.contactStatus === 'response_received').length,
      aiEnabled: filteredLeads.filter(lead => lead.aiOptIn).length,
      fresh: filteredLeads.filter(lead => {
        const leadDate = new Date(lead.createdAt);
        leadDate.setHours(0, 0, 0, 0);
        return leadDate.getTime() === today.getTime();
      }).length,
    };
  }, [filteredLeads]);

  const canEdit = profile?.role === 'admin' || profile?.role === 'manager';

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg font-medium text-gray-700">Loading leads...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Error Loading Leads</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">{error.message}</p>
            <Button onClick={() => refetch()} className="w-full">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 mb-2">Lead Management</h1>
            <p className="text-slate-600">
              {filteredLeads.length} leads • {selectedLeads.length} selected
              {hiddenCount > 0 && !showHidden && ` • ${hiddenCount} hidden`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {hiddenCount > 0 && (
              <Button
                variant="outline"
                onClick={() => setShowHidden(!showHidden)}
                className="flex items-center gap-2"
              >
                {showHidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {showHidden ? 'Hide Hidden' : `Show Hidden (${hiddenCount})`}
              </Button>
            )}
            <Button
              onClick={() => setIsUploadModalOpen(true)}
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Upload Leads
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <LeadsStatsCards stats={stats} />

        {/* Search */}
        <EnhancedLeadSearch
          value={searchTerm}
          onChange={setSearchTerm}
          totalLeads={filteredLeads.length}
        />

        {/* Leads Table */}
        <LeadsTable
          leads={filteredLeads}
          onAiOptInChange={updateAiOptIn}
          onDoNotContactChange={updateDoNotContact}
          canEdit={canEdit}
          loading={loading}
          searchTerm={searchTerm}
          selectedLeads={selectedLeads}
          onLeadSelect={handleLeadSelect}
          onQuickView={handleQuickView}
          getEngagementScore={getEngagementScore}
        />
      </div>

      {/* Upload Modal */}
      <MultiFileLeadUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSuccess={() => {
          refetch();
          toast({
            title: "Success",
            description: "Leads uploaded successfully",
          });
        }}
      />
    </div>
  );
};

export default LeadsList;
