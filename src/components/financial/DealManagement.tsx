import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Printer } from "lucide-react";
import PackAdjustmentControls from "./deal-management/PackAdjustmentControls";
import DealSummaryCards from "./deal-management/DealSummaryCards";
import DealFilters from "./deal-management/DealFilters";
import BulkActions from "./deal-management/BulkActions";
import DealsTable from "./deal-management/DealsTable";
import ProfitChangesReport from "./deal-management/ProfitChangesReport";
import { useDealManagement } from "./deal-management/DealManagementLogic";
import { DealManagementProps } from "./deal-management/DealManagementTypes";
import { filterDeals, calculateSummaryTotals, formatCurrency, getAdjustedGrossProfit } from "./deal-management/DealManagementUtils";
import ExportDropdown from "./deal-management/ExportDropdown";

const DealManagement = ({ 
  user, 
  packAdjustment = 0,
  packAdjustmentEnabled = false,
  setPackAdjustmentEnabled,
  localPackAdjustment = 0,
  setLocalPackAdjustment
}: DealManagementProps) => {
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
    dateFilter,
    setDateFilter,
    customStartDate,
    setCustomStartDate,
    customEndDate,
    setCustomEndDate,
    dateField,
    setDateField,
    handleDealTypeUpdate,
    handleUnlockDeal,
    handleBulkDealTypeUpdate,
    handleSelectDeal,
    handleSelectAll,
    handleManagersUpdate
  } = useDealManagement();

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
  
  // Check if any selected deals are locked
  const hasLockedSelectedDeals = selectedDeals.some(dealId => 
    deals.find(deal => deal.id === dealId)?.deal_type_locked
  );

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

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Print Header - Only visible when printing */}
      <div className="print:block hidden">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Deal Management Report</h1>
          <p className="text-lg text-gray-600 mb-4">
            Generated on {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}
          </p>
          {packAdjustmentEnabled && (
            <p className="text-sm text-blue-600">
              Pack Adjustment Applied: {formatCurrency(localPackAdjustment)}
            </p>
          )}
        </div>

        {/* Print Summary Section */}
        <div className="mb-8 p-6 border-2 border-gray-300">
          <h2 className="text-xl font-bold mb-4 text-center">Summary Totals</h2>
          <div className="grid grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-sm font-medium text-gray-600 mb-1">New Retail</div>
              <div className="text-lg font-bold">{summaryTotals.newRetail.units} units</div>
              <div className="text-sm">{formatCurrency(summaryTotals.newRetail.total)}</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-medium text-gray-600 mb-1">Used Retail</div>
              <div className="text-lg font-bold">{summaryTotals.usedRetail.units} units</div>
              <div className="text-sm">{formatCurrency(summaryTotals.usedRetail.total)}</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-medium text-gray-600 mb-1">Total Retail</div>
              <div className="text-lg font-bold">{summaryTotals.totalRetail.units} units</div>
              <div className="text-sm">{formatCurrency(summaryTotals.totalRetail.total)}</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-medium text-gray-600 mb-1">Dealer Trade</div>
              <div className="text-lg font-bold">{summaryTotals.dealerTrade.units} units</div>
              <div className="text-sm">{formatCurrency(summaryTotals.dealerTrade.total)}</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-medium text-gray-600 mb-1">Wholesale</div>
              <div className="text-lg font-bold">{summaryTotals.wholesale.units} units</div>
              <div className="text-sm">{formatCurrency(summaryTotals.wholesale.total)}</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-medium text-gray-600 mb-1">Total Deals</div>
              <div className="text-lg font-bold">{filteredDeals.length} deals</div>
              <div className="text-sm">{formatCurrency(
                summaryTotals.totalRetail.total + 
                summaryTotals.dealerTrade.total + 
                summaryTotals.wholesale.total
              )}</div>
            </div>
          </div>
        </div>
      </div>

      {setPackAdjustmentEnabled && setLocalPackAdjustment && (
        <PackAdjustmentControls
          packAdjustmentEnabled={packAdjustmentEnabled}
          setPackAdjustmentEnabled={setPackAdjustmentEnabled}
          localPackAdjustment={localPackAdjustment}
          setLocalPackAdjustment={setLocalPackAdjustment}
        />
      )}

      <DealSummaryCards
        summaryTotals={summaryTotals}
        packAdjustmentEnabled={packAdjustmentEnabled}
        localPackAdjustment={localPackAdjustment}
        formatCurrency={formatCurrency}
      />

      <Tabs defaultValue="management" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="management">Deal Management</TabsTrigger>
          <TabsTrigger value="profit-changes">Profit Changes Report</TabsTrigger>
        </TabsList>

        <TabsContent value="management" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between print:block">
              <div>
                <CardTitle className="flex items-center space-x-2">
                  <span>Deal Management</span>
                  <Badge variant="secondary">{filteredDeals.length} deals</Badge>
                </CardTitle>
                <CardDescription>
                  Manage deal types and view financial performance by category. Wholesale and dealer trade deals are automatically locked but can be unlocked manually if needed.
                </CardDescription>
              </div>
              <ExportDropdown 
                deals={filteredDeals}
                packAdjustment={packAdjustment}
                packAdjustmentEnabled={packAdjustmentEnabled}
                reportType="deal-management"
              />
            </CardHeader>
            <CardContent>
              <DealFilters
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                filterType={filterType}
                setFilterType={setFilterType}
                showProfitChanges={showProfitChanges}
                setShowProfitChanges={setShowProfitChanges}
                dateFilter={dateFilter}
                setDateFilter={setDateFilter}
                customStartDate={customStartDate}
                setCustomStartDate={setCustomStartDate}
                customEndDate={customEndDate}
                setCustomEndDate={setCustomEndDate}
                dateField={dateField}
                setDateField={setDateField}
              />

              <BulkActions
                selectedDeals={selectedDeals}
                bulkDealType={bulkDealType}
                setBulkDealType={setBulkDealType}
                onBulkUpdate={handleBulkDealTypeUpdate}
                hasLockedDeals={hasLockedSelectedDeals}
              />

              <DealsTable
                deals={filteredDeals}
                selectedDeals={selectedDeals}
                onSelectDeal={handleSelectDeal}
                onSelectAll={() => handleSelectAll(filteredDeals)}
                onDealTypeUpdate={handleDealTypeUpdate}
                onUnlockDeal={handleUnlockDeal}
                onManagersUpdate={handleManagersUpdate}
                getAdjustedGrossProfit={(deal) => getAdjustedGrossProfit(deal, packAdjustment)}
                formatCurrency={formatCurrency}
                packAdjustmentEnabled={packAdjustmentEnabled}
                localPackAdjustment={packAdjustment}
              />

              {filteredDeals.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No deals found matching your criteria
                </div>
              )}

              {/* Print Footer */}
              <div className="print:block hidden mt-8 pt-4 border-t-2 border-gray-300">
                <div className="text-center">
                  <h3 className="text-lg font-bold mb-2">Deal Management Summary</h3>
                  <p className="text-sm">
                    This report shows {filteredDeals.length} deals with a total profit of{' '}
                    {formatCurrency(
                      summaryTotals.totalRetail.total + 
                      summaryTotals.dealerTrade.total + 
                      summaryTotals.wholesale.total
                    )}
                    {packAdjustmentEnabled && (
                      <span> (including pack adjustments of {formatCurrency(localPackAdjustment)} per used vehicle)</span>
                    )}.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profit-changes" className="space-y-6">
          <ProfitChangesReport />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DealManagement;
