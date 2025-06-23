import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useLeads } from '@/hooks/useLeads';
import { useLeadsSelection } from './useLeadsSelection';
import { useLeadsSorting } from './useLeadsSorting';
import LeadsStatsCards from './LeadsStatsCards';
import LeadsStatusTabs from './LeadsStatusTabs';
import LeadsFiltersBar from './LeadsFiltersBar';
import LeadsTableHeader from './LeadsTableHeader';
import LeadsTableRow from './LeadsTableRow';
import LeadsTableEmptyState from './LeadsTableEmptyState';
import LeadsLoadingState from './LeadsLoadingState';
import EnhancedBulkActionsPanel from './EnhancedBulkActionsPanel';
import ProcessManagementPanel from './ProcessManagementPanel';
import MultiFileLeadUploadModal from './MultiFileLeadUploadModal';
import VINImportModal from './VINImportModal';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface LeadsDataProviderProps {
  isVINImportModalOpen: boolean;
  setIsVINImportModalOpen: (open: boolean) => void;
  showFreshLeadsOnly: boolean;
}

const LeadsDataProvider = ({ 
  isVINImportModalOpen, 
  setIsVINImportModalOpen, 
  showFreshLeadsOnly 
}: LeadsDataProviderProps) => {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isMultiFileModalOpen, setIsMultiFileModalOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);
  const [selectedDateRange, setSelectedDateRange] = useState<string | null>(null);

  const {
    leads,
    totalLeads,
    loading,
    error,
    refetch
  } = useLeads({
    status: selectedStatus,
    source: selectedSource,
    vehicle: selectedVehicle,
    dateRange: selectedDateRange,
    freshLeadsOnly: showFreshLeadsOnly
  });

  const {
    selectedLeads,
    setSelectedLeads,
    selectAllLeads,
    clearSelection
  } = useLeadsSelection(leads);

  const {
    sortConfig,
    handleSort
  } = useLeadsSorting();

  const leadsData = useMemo(() => {
    let filteredLeads = [...leads];

    if (searchQuery) {
      const lowerCaseQuery = searchQuery.toLowerCase();
      filteredLeads = filteredLeads.filter(lead =>
        lead.first_name?.toLowerCase().includes(lowerCaseQuery) ||
        lead.last_name?.toLowerCase().includes(lowerCaseQuery) ||
        lead.phone?.includes(searchQuery) ||
        lead.email?.toLowerCase().includes(lowerCaseQuery) ||
        lead.vehicle_of_interest?.toLowerCase().includes(lowerCaseQuery)
      );
    }

    if (activeTab !== 'all') {
      filteredLeads = filteredLeads.filter(lead => lead.status === activeTab);
    }

    if (sortConfig !== null) {
      filteredLeads.sort((a: any, b: any) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        if (aValue === null || aValue === undefined) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (bValue === null || bValue === undefined) return sortConfig.direction === 'ascending' ? 1 : -1;

        if (typeof aValue === 'string') aValue = aValue.toLowerCase();
        if (typeof bValue === 'string') bValue = bValue.toLowerCase();

        if (aValue < bValue) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }

    return filteredLeads;
  }, [leads, activeTab, searchQuery, sortConfig]);

  const handleStatusChange = (status: string | null) => {
    setSelectedStatus(status);
  };

  const handleSourceChange = (source: string | null) => {
    setSelectedSource(source);
  };

  const handleVehicleChange = (vehicle: string | null) => {
    setSelectedVehicle(vehicle);
  };

  const handleDateRangeChange = (dateRange: string | null) => {
    setSelectedDateRange(dateRange);
  };

  return (
    <div className="space-y-6">
      <LeadsStatsCards totalLeads={totalLeads} leadsData={leadsData} />

      <LeadsStatusTabs activeTab={activeTab} setActiveTab={setActiveTab} />

      <LeadsFiltersBar
        onStatusChange={handleStatusChange}
        onSourceChange={handleSourceChange}
        onVehicleChange={handleVehicleChange}
        onDateRangeChange={handleDateRangeChange}
        onSearch={setSearchQuery}
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main content area */}
        <div className="lg:col-span-3">
          <EnhancedBulkActionsPanel
            selectedLeads={selectedLeads}
            setSelectedLeads={setSelectedLeads}
            selectAllLeads={selectAllLeads}
            clearSelection={clearSelection}
            onMultiFileImportClick={() => setIsMultiFileModalOpen(true)}
            onRefresh={refetch}
          />

          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">
                      <input
                        type="checkbox"
                        className="h-4 w-4 border border-gray-300 rounded-sm focus:ring-2 focus:ring-blue-500"
                        onChange={(e) => selectAllLeads(e.target.checked)}
                        checked={selectedLeads.length === leadsData.length && leadsData.length > 0}
                        disabled={leadsData.length === 0}
                      />
                    </TableHead>
                    <LeadsTableHeader label="Name" key="first_name" sortKey="first_name" sortConfig={sortConfig} handleSort={handleSort} />
                    <LeadsTableHeader label="Phone" key="phone" sortKey="phone" sortConfig={sortConfig} handleSort={handleSort} />
                    <LeadsTableHeader label="Email" key="email" sortKey="email" sortConfig={sortConfig} handleSort={handleSort} />
                    <LeadsTableHeader label="Vehicle of Interest" key="vehicle_of_interest" sortKey="vehicle_of_interest" sortConfig={sortConfig} handleSort={handleSort} />
                    <LeadsTableHeader label="Status" key="status" sortKey="status" sortConfig={sortConfig} handleSort={handleSort} />
                    <LeadsTableHeader label="Source" key="source" sortKey="source" sortConfig={sortConfig} handleSort={handleSort} />
                    <LeadsTableHeader label="Created At" key="created_at" sortKey="created_at" sortConfig={sortConfig} handleSort={handleSort} />
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <LeadsLoadingState />
                  ) : leadsData.length === 0 ? (
                    <LeadsTableEmptyState />
                  ) : (
                    leadsData.map((lead) => (
                      <LeadsTableRow
                        key={lead.id}
                        lead={lead}
                        selectedLeads={selectedLeads}
                        setSelectedLeads={setSelectedLeads}
                        refetch={refetch}
                      />
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Right sidebar with process management */}
        <div className="lg:col-span-1">
          <ProcessManagementPanel 
            selectedLeadIds={selectedLeads}
            onProcessAssigned={() => {
              // Refresh leads data after process assignment
              if (refetch) refetch();
              clearSelection();
            }}
          />
        </div>
      </div>

      <MultiFileLeadUploadModal
        isOpen={isMultiFileModalOpen}
        onClose={() => setIsMultiFileModalOpen(false)}
        onUploadComplete={refetch}
      />

      <VINImportModal
        isOpen={isVINImportModalOpen}
        onClose={() => setIsVINImportModalOpen(false)}
        onUploadComplete={refetch}
      />
    </div>
  );
};

export default LeadsDataProvider;
