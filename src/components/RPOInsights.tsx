
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Download, BarChart3, TrendingUp, DollarSign, Clock } from "lucide-react";
import { Link } from "react-router-dom";

const RPOInsights = () => {
  const { data: rpoAnalytics, isLoading } = useQuery({
    queryKey: ['rpo-analytics'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_rpo_analytics');
      if (error) throw error;
      return data;
    }
  });

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(price);
  };

  const exportToCSV = () => {
    if (!rpoAnalytics) return;

    const headers = ['RPO Code', 'Total Vehicles', 'Sold Vehicles', 'Avg Days to Sell', 'Total Sales Value'];
    const csvContent = [
      headers.join(','),
      ...rpoAnalytics.map(row => [
        row.rpo_code,
        row.total_vehicles,
        row.sold_vehicles,
        row.avg_days_to_sell?.toFixed(1) || 'N/A',
        row.total_sales_value?.toFixed(2) || '0'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `rpo-analytics-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const topPerformers = rpoAnalytics?.slice(0, 5) || [];
  const fastestSelling = rpoAnalytics?.filter(r => r.avg_days_to_sell).sort((a, b) => (a.avg_days_to_sell || 0) - (b.avg_days_to_sell || 0)).slice(0, 5) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">RPO Code Insights</h1>
          <p className="text-slate-600 mt-1">Analyze option code performance and sales trends</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button onClick={exportToCSV} variant="outline" className="flex items-center space-x-2">
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </Button>
          <Link to="/inventory-dashboard">
            <Button variant="outline">Back to Inventory</Button>
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Total RPO Codes</p>
              <p className="text-2xl font-bold text-slate-800">{rpoAnalytics?.length || 0}</p>
            </div>
            <BarChart3 className="w-8 h-8 text-blue-500" />
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Best Selling RPO</p>
              <p className="text-lg font-bold text-slate-800">{topPerformers[0]?.rpo_code || 'N/A'}</p>
              <p className="text-sm text-slate-600">{topPerformers[0]?.sold_vehicles || 0} sold</p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-500" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Fastest Selling</p>
              <p className="text-lg font-bold text-slate-800">{fastestSelling[0]?.rpo_code || 'N/A'}</p>
              <p className="text-sm text-slate-600">
                {fastestSelling[0]?.avg_days_to_sell?.toFixed(1) || 'N/A'} days avg
              </p>
            </div>
            <Clock className="w-8 h-8 text-purple-500" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Top Sales Value</p>
              <p className="text-lg font-bold text-slate-800">
                {rpoAnalytics?.find(r => r.total_sales_value === Math.max(...rpoAnalytics.map(x => x.total_sales_value || 0)))?.rpo_code || 'N/A'}
              </p>
              <p className="text-sm text-slate-600">
                {formatPrice(Math.max(...(rpoAnalytics?.map(x => x.total_sales_value || 0) || [])))}
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-yellow-500" />
          </div>
        </Card>
      </div>

      {/* Analytics Table */}
      <Card className="p-6">
        <h3 className="text-lg font-medium text-slate-800 mb-4">RPO Code Performance</h3>
        
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="h-12 bg-slate-200 rounded animate-pulse"></div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 font-medium text-slate-800">RPO Code</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-800">Total Vehicles</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-800">Sold</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-800">Sell Rate</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-800">Avg Days to Sell</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-800">Total Sales Value</th>
                </tr>
              </thead>
              <tbody>
                {rpoAnalytics?.map((rpo, index) => {
                  const sellRate = rpo.total_vehicles > 0 ? (rpo.sold_vehicles / rpo.total_vehicles * 100) : 0;
                  return (
                    <tr key={rpo.rpo_code} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline" className="font-mono">
                            {rpo.rpo_code}
                          </Badge>
                          {index < 3 && (
                            <Badge className="bg-yellow-100 text-yellow-800">
                              Top {index + 1}
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-800">{rpo.total_vehicles}</td>
                      <td className="py-3 px-4 text-slate-800">{rpo.sold_vehicles}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          <div className="w-16 bg-slate-200 rounded-full h-2">
                            <div 
                              className="bg-green-500 h-2 rounded-full" 
                              style={{ width: `${Math.min(sellRate, 100)}%` }}
                            ></div>
                          </div>
                          <span className="text-sm text-slate-600">{sellRate.toFixed(1)}%</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-800">
                        {rpo.avg_days_to_sell ? `${rpo.avg_days_to_sell.toFixed(1)} days` : 'N/A'}
                      </td>
                      <td className="py-3 px-4 text-slate-800">
                        {rpo.total_sales_value ? formatPrice(rpo.total_sales_value) : 'N/A'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {rpoAnalytics && rpoAnalytics.length === 0 && (
          <div className="text-center py-8">
            <BarChart3 className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <p className="text-slate-600">No RPO code data available</p>
            <p className="text-sm text-slate-500 mt-1">Upload inventory with RPO codes to see analytics</p>
          </div>
        )}
      </Card>
    </div>
  );
};

export default RPOInsights;
