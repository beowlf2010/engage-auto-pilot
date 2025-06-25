
import React from 'react';
import InventoryStats from './InventoryStats';
import InventoryFilters from './InventoryFilters';
import InventoryTable from './InventoryTable';
import InventoryCleanupButton from './InventoryCleanupButton';
import UsedInventoryDiagnostics from './UsedInventoryDiagnostics';
import { InventoryItem, InventoryFilters as IInventoryFilters } from '@/services/inventory/types';

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
  return (
    <>
      <InventoryStats inventory={inventory} loading={isLoading} />
      
      <div className="space-y-4">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <h2 className="text-2xl font-semibold text-slate-800">Current Inventory</h2>
          <div className="flex flex-col sm:flex-row gap-2">
            <InventoryCleanupButton />
          </div>
        </div>
        
        {/* Add diagnostics section */}
        <UsedInventoryDiagnostics />
        
        <InventoryFilters
          filters={filters}
          setFilters={setFilters}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          onDataQualityFilter={handleDataQualityFilter}
        />
        
        <InventoryTable
          inventory={inventory}
          isLoading={isLoading}
          onSort={toggleSort}
        />
      </div>
    </>
  );
};

export default InventoryDashboardContent;
