import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, DollarSign, Car, Banknote } from "lucide-react";
import { getMonthlyRetailSummary } from "@/utils/financialDataOperations";

interface MetricsData {
  new_units_mtd: number;
  new_gross_mtd: number;
  used_units_mtd: number;
  used_gross_mtd: number;
  total_units_mtd: number;
  total_profit_mtd: number;
}

interface FinancialMetricsProps {
  packAdjustment?: number;
}

const FinancialMetrics = ({ packAdjustment = 0 }: FinancialMetricsProps) => {
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const data = await getMonthlyRetailSummary(packAdjustment);
        setMetrics(data);
      } catch (error) {
        console.error('Error fetching financial metrics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, [packAdjustment]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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

  // F&I profit calculation using the already-adjusted metrics
  const fiProfit = (metrics?.total_profit_mtd || 0) - (metrics?.new_gross_mtd || 0) - (metrics?.used_gross_mtd || 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center justify-between">
            New Gross – MTD
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            {formatCurrency(metrics?.new_gross_mtd || 0)}
          </div>
          <CardDescription>
            {metrics?.new_units_mtd || 0} new units sold
          </CardDescription>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center justify-between">
            <div>
              Used Gross – MTD
              {packAdjustment > 0 && (
                <div className="text-xs text-green-600 font-normal">
                  (Pack Adj: +${packAdjustment}/unit)
                </div>
              )}
            </div>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600">
            {formatCurrency(metrics?.used_gross_mtd || 0)}
          </div>
          <CardDescription>
            {metrics?.used_units_mtd || 0} used units sold
          </CardDescription>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center justify-between">
            F&I Profit – MTD
            <Banknote className="h-4 w-4 text-purple-600" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-purple-600">
            {formatCurrency(fiProfit)}
          </div>
          <CardDescription>
            Finance & Insurance profits
          </CardDescription>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center justify-between">
            Total Profit – MTD
            <Car className="h-4 w-4 text-indigo-600" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-indigo-600">
            {formatCurrency(metrics?.total_profit_mtd || 0)}
          </div>
          <CardDescription>
            {metrics?.total_units_mtd || 0} total units sold
          </CardDescription>
        </CardContent>
      </Card>
    </div>
  );
};

export default FinancialMetrics;
