
import React, { useState } from 'react';
import InventoryStats from './InventoryStats';
import InventoryFilters from './InventoryFilters';
import AdvancedInventoryFilters from './AdvancedInventoryFilters';
import EnhancedInventoryTable from './EnhancedInventoryTable';
import QuickActionsToolbar from './QuickActionsToolbar';
import BulkOperationsDialog from './BulkOperationsDialog';
import RealTimeAlertsCenter from './RealTimeAlertsCenter';
import InventoryCleanupButton from './InventoryCleanupButton';
import UsedInventoryDiagnostics from './UsedInventoryDiagnostics';
import EnhancedInventoryDashboard from './advanced/EnhancedInventoryDashboard';
import { InventoryItem, InventoryFilters as IInventoryFilters } from '@/services/inventory/types';
import { useToast } from '@/hooks/use-toast';

interface InventoryDashboardContentProps {
  inventory: InventoryItem[];
  isLoading: boolean;
  filters: IInventoryFilters;
  setFilters: (filters: IInventoryFilters) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  toggleSort: (field: string) => void;
  handleDataQualityFilter: (level: string) => void;
}

const InventoryDashboardContent = ({
  inventory,
  isLoading,
  filters,
  setFilters,
  searchTerm,
  setSearchTerm,
  toggleSort,
  handleDataQualityFilter
}: InventoryDashboardContentProps) => {
  const [selectedVehicles, setSelectedVehicles] = useState<InventoryItem[]>([]);
  const [bulkOperation, setBulkOperation] = useState<string>('');
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const { toast } = useToast();

  const handleSelectVehicle = (vehicle: InventoryItem, selected: boolean) => {
    if (selected) {
      setSelectedVehicles([...selectedVehicles, vehicle]);
    } else {
      setSelectedVehicles(selectedVehicles.filter(v => v.id !== vehicle.id));
    }
  };

  const handleSelectAll = () => {
    if (selectedVehicles.length === inventory.length) {
      setSelectedVehicles([]);
    } else {
      setSelectedVehicles(inventory);
    }
  };

  const handleClearSelection = () => {
    setSelectedVehicles([]);
  };

  const handleBulkAction = async (action: string, data?: any) => {
    switch (action) {
      case 'refresh':
        window.location.reload();
        break;
      case 'export_excel':
      case 'export_pdf':
      case 'export_list':
      case 'export_marketing':
      case 'bulk_price_update':
      case 'bulk_status_change':
      case 'bulk_marketing':
      case 'bulk_archive':
        setBulkOperation(action);
        setShowBulkDialog(true);
        break;
      case 'quick_price_update':
        toast({
          title: "Price Update Initiated",
          description: `Updating prices for ${selectedVehicles.length} vehicles with ${data.adjustment}`
        });
        break;
      case 'quick_status_change':
        toast({
          title: "Status Update Initiated",
          description: `Changing status to "${data.status}" for ${selectedVehicles.length} vehicles`
        });
        break;
      default:
        console.log('Bulk action:', action, data);
    }
  };

  const handleVehicleAction = (action: string, vehicle: InventoryItem) => {
    switch (action) {
      case 'view_detail':
        // Navigate to vehicle detail
        break;
      case 'edit':
        toast({
          title: "Edit Vehicle",
          description: `Opening editor for ${vehicle.year} ${vehicle.make} ${vehicle.model}`
        });
        break;
      case 'view_leads':
        toast({
          title: "View Leads",
          description: `Showing ${vehicle.leads_count || 0} leads for this vehicle`
        });
        break;
      case 'add_to_marketing':
        toast({
          title: "Added to Marketing",
          description: `${vehicle.year} ${vehicle.make} ${vehicle.model} added to marketing queue`
        });
        break;
      case 'price_analysis':
        toast({
          title: "Price Analysis",
          description: `Analyzing pricing for ${vehicle.year} ${vehicle.make} ${vehicle.model}`
        });
        break;
      default:
        console.log('Vehicle action:', action, vehicle);
    }
  };

  const handleQuickFilter = (filter: any) => {
    setFilters({ ...filters, ...filter });
    toast({
      title: "Filter Applied",
      description: "Quick filter has been applied to the inventory"
    });
  };

  const handleAiMatch = (criteria: any) => {
    toast({
      title: "AI Matching Initiated",
      description: "Finding the best vehicle matches based on your criteria..."
    });
    // Implement AI matching logic
  };

  const executeBulkOperation = async (operation: string, data: any) => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    toast({
      title: "Bulk Operation Completed",
      description: `${operation} completed for ${data.vehicles.length} vehicles`
    });
    
    setSelectedVehicles([]);
    setShowBulkDialog(false);
  };

  return (
    <>
      {/* Real-time Alerts Center */}
      <RealTimeAlertsCenter />
      
      {/* Enhanced AI-Powered Inventory Intelligence */}
      <EnhancedInventoryDashboard />
      
      <InventoryStats inventory={inventory} loading={isLoading} />
      
      <div className="space-y-4">
        {/* Quick Actions Toolbar */}
        <QuickActionsToolbar
          selectedVehicles={selectedVehicles}
          totalVehicles={inventory.length}
          onSelectAll={handleSelectAll}
          onClearSelection={handleClearSelection}
          onBulkAction={handleBulkAction}
          onQuickFilter={handleQuickFilter}
        />
        
        {/* Add diagnostics section */}
        <UsedInventoryDiagnostics />
        
        {/* Advanced Filters */}
        <AdvancedInventoryFilters
          filters={filters}
          setFilters={setFilters}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          onDataQualityFilter={handleDataQualityFilter}
          onAiMatch={handleAiMatch}
        />
        
        {/* Enhanced Inventory Table */}
        <EnhancedInventoryTable
          inventory={inventory}
          isLoading={isLoading}
          selectedVehicles={selectedVehicles}
          onSort={toggleSort}
          onSelectVehicle={handleSelectVehicle}
          onSelectAll={handleSelectAll}
          onVehicleAction={handleVehicleAction}
          sortBy={filters.sortBy}
          sortOrder={filters.sortOrder}
        />
      </div>

      {/* Bulk Operations Dialog */}
      <BulkOperationsDialog
        isOpen={showBulkDialog}
        onClose={() => setShowBulkDialog(false)}
        selectedVehicles={selectedVehicles}
        operation={bulkOperation}
        onExecute={executeBulkOperation}
      />
    </>
  );
};

export default InventoryDashboardContent;
