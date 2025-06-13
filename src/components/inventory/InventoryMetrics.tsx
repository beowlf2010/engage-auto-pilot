
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Car, DollarSign, Clock, TrendingUp } from "lucide-react";
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

const InventoryMetrics = () => {
  const [inventoryStats, setInventoryStats] = useState<InventoryStats | null>(null);
  const [financialStats, setFinancialStats] = useState<FinancialStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        console.log('Fetching inventory stats...');
        
        // Fetch inventory stats using the new service
        const stats = await getInventoryStats();
        console.log('Inventory stats:', stats);
        setInventoryStats(stats);

        // Fetch financial stats
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
        {[1, 2, 3, 4].map((i) => (
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
          <CardTitle className="text-sm font-medium">Average Price</CardTitle>
          <DollarSign className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatCurrency(inventoryStats?.averagePrice || 0)}
          </div>
          <CardDescription>
            {formatCurrency(inventoryStats?.totalValue || 0)} total value
          </CardDescription>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Avg Days in Stock</CardTitle>
          <Clock className="h-4 w-4 text-orange-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {inventoryStats?.averageDaysInStock || 0}
          </div>
          <CardDescription>
            {inventoryStats?.inProductionTransit || 0} in production/transit
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
  );
};

export default InventoryMetrics;
