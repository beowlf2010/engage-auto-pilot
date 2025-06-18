
import { useInventoryFilters } from "@/hooks/useInventoryFilters";
import { useInventoryData } from "@/hooks/useInventoryData";
import InventoryDashboardHeader from "./inventory/InventoryDashboardHeader";
import InventoryErrorDisplay from "./inventory/InventoryErrorDisplay";
import InventoryDashboardContent from "./inventory/InventoryDashboardContent";

const InventoryDashboard = () => {
  const {
    filters,
    setFilters,
    searchTerm,
    setSearchTerm,
    toggleSort,
    handleDataQualityFilter
  } = useInventoryFilters();

  const { data: inventory, isLoading, error, refetch } = useInventoryData(filters, searchTerm);

  if (error) {
    return <InventoryErrorDisplay error={error} onRetry={() => refetch()} />;
  }

  return (
    <div className="space-y-6">
      <InventoryDashboardHeader />
      
      <InventoryDashboardContent
        inventory={inventory || []}
        isLoading={isLoading}
        filters={filters}
        setFilters={setFilters}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        toggleSort={toggleSort}
        handleDataQualityFilter={handleDataQualityFilter}
      />
    </div>
  );
};

export default InventoryDashboard;
