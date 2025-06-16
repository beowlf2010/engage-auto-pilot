
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Car, DollarSign, Clock, TrendingUp, Package, Truck, Factory } from "lucide-react";
import { getInventoryStats, type InventoryStats } from "@/services/inventory/inventoryStatsService";
import { getMonthlyRetailSummary } from "@/utils/financialDataOperations";

interface FinancialStats {
  new_units_mtd: number;
  new_gross_mtd: number;
  used_units_mtd: number;
  used_gross_mtd: number;
  total_units_mtd: number;
  total_profit_mtd: number;
}

const EnhancedInventoryMetrics = () => {
  const [inventoryStats, setInventoryStats] = useState<InventoryStats | null>(null);
  const [financialStats, setFinancialStats] = useState<FinancialStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        console.log('Fetching enhanced inventory stats...');
        
        const stats = await getInventoryStats();
        console.log('Enhanced inventory stats:', stats);
        setInventoryStats(stats);

        console.log('Fetching financial stats...');
        const financialData = await getMonthlyRetailSummary();
        console.log('Financial stats:', financialData);
        setFinancialStats(financialData);

      } catch (error) {
        console.error('Error fetching metrics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-3/4"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="space-y-6">
      {/* Overview Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Vehicles</CardTitle>
            <Car className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inventoryStats?.totalVehicles || 0}</div>
            <CardDescription>
              {inventoryStats?.availableVehicles || 0} available for sale
            </CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New Vehicles Available</CardTitle>
            <Package className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {inventoryStats?.newVehicles.available || 0}
            </div>
            <CardDescription>
              {inventoryStats?.newVehicles.gmGlobalByStatus.available || 0} GM Global + {inventoryStats?.newVehicles.regularNew || 0} regular
            </CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Used Vehicles Available</CardTitle>
            <Car className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {inventoryStats?.usedVehicles.available || 0}
            </div>
            <CardDescription>
              {formatCurrency(inventoryStats?.usedVehicleStats.averagePrice || 0)} avg price
            </CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Units Sold MTD</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {financialStats?.total_units_mtd || 0}
            </div>
            <CardDescription>
              {formatCurrency(financialStats?.total_profit_mtd || 0)} profit MTD
            </CardDescription>
          </CardContent>
        </Card>
      </div>

      {/* GM Global Orders Breakdown */}
      <div>
        <h3 className="text-lg font-semibold text-slate-800 mb-3">GM Global Orders Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-green-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-700">Available</CardTitle>
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {inventoryStats?.newVehicles.gmGlobalByStatus.available || 0}
              </div>
              <CardDescription>
                6000 + 5000-5999 status
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="border-blue-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-700">In Transit</CardTitle>
              <Truck className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {inventoryStats?.newVehicles.gmGlobalByStatus.inTransit || 0}
              </div>
              <CardDescription>
                3800-4999 status
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="border-yellow-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-yellow-700">In Production</CardTitle>
              <Factory className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {inventoryStats?.newVehicles.gmGlobalByStatus.inProduction || 0}
              </div>
              <CardDescription>
                2500-3799 status
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="border-orange-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-orange-700">Placed/Waiting</CardTitle>
              <Clock className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {inventoryStats?.newVehicles.gmGlobalByStatus.placed || 0}
              </div>
              <CardDescription>
                2000-2499 status
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Pricing Breakdown */}
      <div>
        <h3 className="text-lg font-semibold text-slate-800 mb-3">Pricing & Age Analysis</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">New Vehicle Pricing</CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(inventoryStats?.newVehicleStats.averagePrice || 0)}
              </div>
              <CardDescription>
                {formatCurrency(inventoryStats?.newVehicleStats.totalValue || 0)} total value
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Used Vehicle Pricing</CardTitle>
              <DollarSign className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {formatCurrency(inventoryStats?.usedVehicleStats.averagePrice || 0)}
              </div>
              <CardDescription>
                {formatCurrency(inventoryStats?.usedVehicleStats.totalValue || 0)} total value
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Days in Stock</CardTitle>
              <Clock className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-green-600">New:</span>
                  <span className="font-semibold">{inventoryStats?.newVehicleStats.averageDaysInStock || 0} days</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-orange-600">Used:</span>
                  <span className="font-semibold">{inventoryStats?.usedVehicleStats.averageDaysInStock || 0} days</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default EnhancedInventoryMetrics;
