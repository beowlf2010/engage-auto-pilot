
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

  // Error boundary
  if (error) {
    return <InventoryErrorDisplay error={error} onRetry={() => refetch()} />;
  }

  return (
    <div className="min-h-screen bg-background relative">
      {/* Animated mesh gradient background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-primary-glow/5 -z-10" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-accent/5 via-transparent to-transparent -z-10" />
      
      <div className="container mx-auto p-6 space-y-6">
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
    </div>
  );
};

export default InventoryDashboard;
