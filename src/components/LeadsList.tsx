
import React, { useState } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useLeads } from '@/hooks/useLeads';
import { useLeadFilters } from '@/hooks/useLeadFilters';
import LeadsPageHeader from './leads/LeadsPageHeader';
import ProcessManagementPanel from './leads/ProcessManagementPanel';
import MultiFileLeadUploadModal from './leads/MultiFileLeadUploadModal';
import VINImportModal from './leads/VINImportModal';
import LeadsFiltersBar from './leads/LeadsFiltersBar';
import LeadsTableWithSelection from './leads/LeadsTableWithSelection';
import LeadsLoadingState from './leads/LeadsLoadingState';
import ShowHiddenLeadsToggle from './leads/ShowHiddenLeadsToggle';

const LeadsList = () => {
  const { profile } = useAuth();
  const [isVINImportModalOpen, setIsVINImportModalOpen] = useState(false);
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [isMultiFileModalOpen, setIsMultiFileModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const canImport = profile?.role === 'manager' || profile?.role === 'admin';

  // Use the enhanced leads hook to fetch data with message counts and hidden functionality
  const { 
    leads, 
    loading, 
    error, 
    refetch, 
    showHidden, 
    setShowHidden, 
    hiddenCount,
    toggleLeadHidden 
  } = useLeads();

  // Use filters hook
  const { filter, setFilter, filterLeads } = useLeadFilters();

  // Filter leads based on current filter and search term
  const filteredLeads = React.useMemo(() => {
    let filtered = filterLeads(leads);
    
    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(lead =>
        lead.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.primaryPhone.includes(searchTerm) ||
        lead.vehicleInterest.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return filtered;
  }, [leads, filter, filterLeads, searchTerm]);

  const handleFreshLeadsClick = () => {
    setFilter(filter === 'all' ? 'new' : 'all');
  };

  const handleLeadSelect = (leadId: string) => {
    setSelectedLeads(prev => 
      prev.includes(leadId)
        ? prev.filter(id => id !== leadId)
        : [...prev, leadId]
    );
  };

  const handleProcessAssigned = () => {
    setSelectedLeads([]);
    refetch(); // Refresh leads after process assignment
  };

  const handleRefresh = async () => {
    await refetch();
  };

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error.message}</p>
          <button 
            onClick={handleRefresh}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <LeadsPageHeader 
        canImport={canImport}
        onVINImportClick={() => setIsVINImportModalOpen(true)}
        onLeadUploadClick={() => setIsMultiFileModalOpen(true)}
        onFreshLeadsClick={handleFreshLeadsClick}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
      />

      <div className="flex justify-between items-center">
        <LeadsFiltersBar 
          filter={filter}
          setFilter={setFilter}
          leads={leads} // Pass all leads for count calculation
        />
        
        <ShowHiddenLeadsToggle
          showHidden={showHidden}
          onToggle={setShowHidden}
          hiddenCount={hiddenCount}
        />
      </div>

      {/* Process Management Panel - only show when leads are selected */}
      {selectedLeads.length > 0 && (
        <ProcessManagementPanel 
          selectedLeadIds={selectedLeads}
          onProcessAssigned={handleProcessAssigned}
        />
      )}

      {/* Loading State */}
      {loading && <LeadsLoadingState />}

      {/* Leads Table */}
      {!loading && (
        <LeadsTableWithSelection
          leads={filteredLeads}
          loading={loading}
          selectedLeads={selectedLeads}
          onLeadSelect={handleLeadSelect}
          searchTerm={searchTerm}
          onToggleHidden={toggleLeadHidden}
        />
      )}

      <MultiFileLeadUploadModal
        isOpen={isMultiFileModalOpen}
        onClose={() => setIsMultiFileModalOpen(false)}
        onSuccess={() => {
          refetch(); // Refresh leads after upload
        }}
      />

      <VINImportModal
        isOpen={isVINImportModalOpen}
        onClose={() => setIsVINImportModalOpen(false)}
        onImportSuccess={() => {
          refetch(); // Refresh leads after import
        }}
      />
    </div>
  );
};

export default LeadsList;
