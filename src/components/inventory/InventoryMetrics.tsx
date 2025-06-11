
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Car, TrendingUp, Clock, DollarSign } from "lucide-react";

interface InventoryMetricsProps {
  className?: string;
}

const InventoryMetrics = ({ className }: InventoryMetricsProps) => {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['inventory-metrics'],
    queryFn: async () => {
      const { count: totalVehicles } = await supabase
        .from('inventory')
        .select('*', { count: 'exact', head: true });

      const { count: availableVehicles } = await supabase
        .from('inventory')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'available');

      const { data: avgDaysData } = await supabase
        .from('inventory')
        .select('days_in_inventory')
        .eq('status', 'available')
        .not('days_in_inventory', 'is', null);

      const { data: priceData } = await supabase
        .from('inventory')
        .select('price')
        .eq('status', 'available')
        .not('price', 'is', null);

      const avgDays = avgDaysData?.length 
        ? Math.round(avgDaysData.reduce((sum, item) => sum + (item.days_in_inventory || 0), 0) / avgDaysData.length)
        : 0;

      const avgPrice = priceData?.length
        ? Math.round(priceData.reduce((sum, item) => sum + (item.price || 0), 0) / priceData.length)
        : 0;

      return {
        totalVehicles: totalVehicles || 0,
        availableVehicles: availableVehicles || 0,
        avgDaysInInventory: avgDays,
        avgPrice: avgPrice
      };
    }
  });

  if (isLoading) {
    return (
      <div className={`grid grid-cols-1 md:grid-cols-4 gap-4 ${className}`}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-slate-200 rounded w-24"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-slate-200 rounded w-16 mb-2"></div>
              <div className="h-3 bg-slate-200 rounded w-20"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!metrics) return null;

  return (
    <div className={`grid grid-cols-1 md:grid-cols-4 gap-4 ${className}`}>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-slate-600">
            Total Inventory
          </CardTitle>
          <Car className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-slate-800">{metrics.totalVehicles}</div>
          <p className="text-xs text-slate-500">All vehicles</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-slate-600">
            Available
          </CardTitle>
          <div className="w-4 h-4 bg-green-500 rounded-full"></div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">{metrics.availableVehicles}</div>
          <p className="text-xs text-slate-500">Ready for sale</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-slate-600">
            Avg Days in Stock
          </CardTitle>
          <Clock className="h-4 w-4 text-orange-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-slate-800">{metrics.avgDaysInInventory}</div>
          <p className="text-xs text-slate-500">Days on lot</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-slate-600">
            Avg Price
          </CardTitle>
          <DollarSign className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-slate-800">
            ${metrics.avgPrice.toLocaleString()}
          </div>
          <p className="text-xs text-slate-500">Available inventory</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default InventoryMetrics;
