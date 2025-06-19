
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Car } from "lucide-react";
import EnhancedInventoryMetrics from "./EnhancedInventoryMetrics";
import AIInventoryMetrics from "./AIInventoryMetrics";
import InventoryFiltersCard from "./InventoryFiltersCard";
import SummaryDataQualityCard from "./SummaryDataQualityCard";
import InventoryTable from "./InventoryTable";
import DataCompletenessModal from "./DataCompletenessModal";
import VehicleQRCodeModal from "./VehicleQRCodeModal";

interface InventoryFilters {
  make?: string;
  model?: string;
  inventoryType?: 'new' | 'used' | 'all';
  sourceReport?: 'new_car_main_view' | 'merch_inv_view' | 'orders_all';
  rpoCode?: string;
  yearMin?: number;
  yearMax?: number;
  priceMin?: number;
  priceMax?: number;
  sortBy?: 'age' | 'price' | 'year' | 'make' | 'model' | 'completeness';
  sortOrder?: 'asc' | 'desc';
  dataQuality?: 'all' | 'complete' | 'incomplete';
}

interface InventoryDashboardContentProps {
  inventory: any[];
  isLoading: boolean;
  filters: InventoryFilters;
  setFilters: (filters: InventoryFilters) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  toggleSort: (sortBy: string) => void;
  handleDataQualityFilter: (quality: "all" | "complete" | "incomplete") => void;
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
  const [completenessModalOpen, setCompletenessModalOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<any | null>(null);
  const [qrModalOpen, setQRModalOpen] = useState(false);
  const [qrVehicle, setQRVehicle] = useState<any | null>(null);

  // Compute data quality stats with error handling
  const completenessStats = (() => {
    if (!Array.isArray(inventory)) return { total: 0, complete: 0, incomplete: 0 };
    let complete = 0, incomplete = 0;
    
    try {
      inventory.forEach(v => {
        if ((v.data_completeness ?? 0) >= 80) complete++;
        else incomplete++;
      });
    } catch (error) {
      console.error('Error calculating completeness stats:', error);
    }
    
    return {
      total: inventory.length,
      complete,
      incomplete,
    };
  })();

  const handleOpenCompletenessModal = (vehicle: any) => {
    setSelectedVehicle(vehicle);
    setCompletenessModalOpen(true);
  };

  const handleOpenQRCodeModal = (vehicle: any) => {
    setQRVehicle(vehicle);
    setQRModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Enhanced Stats with New/Used Breakdown */}
      <EnhancedInventoryMetrics />

      {/* AI Inventory Intelligence */}
      <AIInventoryMetrics totalVehicles={inventory?.length || 0} />

      {/* Enhanced Filters */}
      <InventoryFiltersCard
        filters={filters}
        setFilters={setFilters}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
      />

      {/* Summary Stat Card with Quick Filters */}
      <SummaryDataQualityCard
        stats={completenessStats}
        dataQuality={filters.dataQuality || "all"}
        onFilterChange={handleDataQualityFilter}
      />

      {/* Inventory Table with Enhanced Error Handling */}
      <Card>
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
            <p className="text-slate-600">Loading inventory...</p>
          </div>
        ) : inventory && inventory.length > 0 ? (
          <InventoryTable
            inventory={inventory}
            isLoading={isLoading}
            onSort={toggleSort}
            openCompletenessModal={handleOpenCompletenessModal}
            onQRCode={handleOpenQRCodeModal}
          />
        ) : (
          <div className="p-8 text-center">
            <Car className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <p className="text-slate-600 mb-2">No vehicles found matching your criteria</p>
            <p className="text-sm text-slate-400">Try adjusting your filters or search terms</p>
          </div>
        )}
      </Card>

      {/* Modals */}
      <VehicleQRCodeModal
        open={qrModalOpen}
        onOpenChange={setQRModalOpen}
        vehicle={qrVehicle}
      />
      
      <DataCompletenessModal
        open={completenessModalOpen}
        onOpenChange={(open) => setCompletenessModalOpen(open)}
        vehicle={selectedVehicle}
      />
    </div>
  );
};

export default InventoryDashboardContent;
