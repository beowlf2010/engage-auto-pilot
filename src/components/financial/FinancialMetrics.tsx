
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

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">New Gross – MTD</CardTitle>
          <DollarSign className="h-4 w-4 text-green-600" />
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
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Used Gross – MTD
            {packAdjustment > 0 && (
              <span className="text-xs text-orange-600 ml-1">
                (Adj: ${packAdjustment})
              </span>
            )}
          </CardTitle>
          <TrendingUp className="h-4 w-4 text-blue-600" />
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
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">F&I Profit – MTD</CardTitle>
          <Banknote className="h-4 w-4 text-purple-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-purple-600">
            {formatCurrency((metrics?.total_profit_mtd || 0) - (metrics?.new_gross_mtd || 0) - (metrics?.used_gross_mtd || 0))}
          </div>
          <CardDescription>
            Finance & Insurance profits
          </CardDescription>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Retail Units – MTD</CardTitle>
          <Car className="h-4 w-4 text-indigo-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-indigo-600">
            {metrics?.total_units_mtd || 0}
          </div>
          <CardDescription>
            Total profit: {formatCurrency(metrics?.total_profit_mtd || 0)}
          </CardDescription>
        </CardContent>
      </Card>
    </div>
  );
};

export default FinancialMetrics;
