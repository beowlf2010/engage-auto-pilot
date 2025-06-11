
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import PackAdjustmentControls from "./deal-management/PackAdjustmentControls";
import DealSummaryCards from "./deal-management/DealSummaryCards";
import DealFilters from "./deal-management/DealFilters";
import BulkActions from "./deal-management/BulkActions";
import DealsTable from "./deal-management/DealsTable";
import { useDealManagement } from "./deal-management/DealManagementLogic";
import { DealManagementProps } from "./deal-management/DealManagementTypes";
import { filterDeals, calculateSummaryTotals, formatCurrency, getAdjustedGrossProfit } from "./deal-management/DealManagementUtils";

const DealManagement = ({ user, packAdjustment = 0 }: DealManagementProps) => {
  const {
    deals,
    loading,
    searchTerm,
    setSearchTerm,
    filterType,
    setFilterType,
    showProfitChanges,
    setShowProfitChanges,
    selectedDeals,
    bulkDealType,
    setBulkDealType,
    localPackAdjustment,
    setLocalPackAdjustment,
    packAdjustmentEnabled,
    setPackAdjustmentEnabled,
    handleDealTypeUpdate,
    handleBulkDealTypeUpdate,
    handleSelectDeal,
    handleSelectAll
  } = useDealManagement(packAdjustment);

  // Check permissions
  if (!["manager", "admin"].includes(user.role)) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="text-lg font-medium text-slate-800 mb-2">Access Denied</div>
          <p className="text-slate-600">Only managers and admins can manage deals</p>
        </div>
      </div>
    );
  }

  const filteredDeals = filterDeals(deals, searchTerm, filterType, showProfitChanges);
  const summaryTotals = calculateSummaryTotals(filteredDeals, packAdjustment);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading deals...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PackAdjustmentControls
        packAdjustmentEnabled={packAdjustmentEnabled}
        setPackAdjustmentEnabled={setPackAdjustmentEnabled}
        localPackAdjustment={localPackAdjustment}
        setLocalPackAdjustment={setLocalPackAdjustment}
      />

      <DealSummaryCards
        summaryTotals={summaryTotals}
        packAdjustmentEnabled={packAdjustmentEnabled}
        localPackAdjustment={localPackAdjustment}
        formatCurrency={formatCurrency}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <span>Deal Management</span>
            <Badge variant="secondary">{filteredDeals.length} deals</Badge>
          </CardTitle>
          <CardDescription>
            Manage deal types and view financial performance by category
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DealFilters
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            filterType={filterType}
            setFilterType={setFilterType}
            showProfitChanges={showProfitChanges}
            setShowProfitChanges={setShowProfitChanges}
          />

          <BulkActions
            selectedDeals={selectedDeals}
            bulkDealType={bulkDealType}
            setBulkDealType={setBulkDealType}
            onBulkUpdate={handleBulkDealTypeUpdate}
          />

          <DealsTable
            deals={filteredDeals}
            selectedDeals={selectedDeals}
            onSelectDeal={handleSelectDeal}
            onSelectAll={() => handleSelectAll(filteredDeals)}
            onDealTypeUpdate={handleDealTypeUpdate}
            getAdjustedGrossProfit={(deal) => getAdjustedGrossProfit(deal, packAdjustment)}
            formatCurrency={formatCurrency}
            packAdjustmentEnabled={packAdjustmentEnabled}
            localPackAdjustment={localPackAdjustment}
          />

          {filteredDeals.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No deals found matching your criteria
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DealManagement;
