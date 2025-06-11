import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Search, Filter, Car, Eye, BarChart3 } from "lucide-react";
import { Link } from "react-router-dom";

interface InventoryFilters {
  make?: string;
  model?: string;
  status?: string;
  sourceReport?: 'new_car_main_view' | 'merch_inv_view' | 'orders_all';
  rpoCode?: string;
  yearMin?: number;
  yearMax?: number;
  priceMin?: number;
  priceMax?: number;
}

const InventoryDashboard = () => {
  const [filters, setFilters] = useState<InventoryFilters>({});
  const [searchTerm, setSearchTerm] = useState("");

  const { data: inventory, isLoading } = useQuery({
    queryKey: ['inventory', filters, searchTerm],
    queryFn: async () => {
      let query = supabase
        .from('inventory')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters.make) {
        query = query.ilike('make', `%${filters.make}%`);
      }
      if (filters.model) {
        query = query.ilike('model', `%${filters.model}%`);
      }
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.sourceReport) {
        query = query.eq('source_report', filters.sourceReport);
      }
      if (filters.rpoCode) {
        query = query.contains('rpo_codes', [filters.rpoCode]);
      }
      if (filters.yearMin) {
        query = query.gte('year', filters.yearMin);
      }
      if (filters.yearMax) {
        query = query.lte('year', filters.yearMax);
      }
      if (filters.priceMin) {
        query = query.gte('price', filters.priceMin);
      }
      if (filters.priceMax) {
        query = query.lte('price', filters.priceMax);
      }
      if (searchTerm) {
        query = query.or(`vin.ilike.%${searchTerm}%,stock_number.ilike.%${searchTerm}%,make.ilike.%${searchTerm}%,model.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    }
  });

  const { data: stats } = useQuery({
    queryKey: ['inventory-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_rpo_analytics');
      if (error) throw error;

      const { count: totalVehicles } = await supabase
        .from('inventory')
        .select('*', { count: 'exact', head: true });

      const { count: availableVehicles } = await supabase
        .from('inventory')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'available');

      const { count: soldVehicles } = await supabase
        .from('inventory')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'sold');

      return {
        totalVehicles: totalVehicles || 0,
        availableVehicles: availableVehicles || 0,
        soldVehicles: soldVehicles || 0,
        rpoAnalytics: data || []
      };
    }
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-800';
      case 'sold': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(price);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Inventory Dashboard</h1>
          <p className="text-slate-600 mt-1">Manage and analyze your vehicle inventory</p>
        </div>
        <div className="flex items-center space-x-3">
          <Link to="/rpo-insights">
            <Button variant="outline" className="flex items-center space-x-2">
              <BarChart3 className="w-4 h-4" />
              <span>RPO Insights</span>
            </Button>
          </Link>
          <Link to="/upload-inventory-report">
            <Button className="flex items-center space-x-2">
              <Car className="w-4 h-4" />
              <span>Upload Inventory</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Total Vehicles</p>
                <p className="text-2xl font-bold text-slate-800">{stats.totalVehicles}</p>
              </div>
              <Car className="w-8 h-8 text-blue-500" />
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Available</p>
                <p className="text-2xl font-bold text-green-600">{stats.availableVehicles}</p>
              </div>
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              </div>
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Sold</p>
                <p className="text-2xl font-bold text-blue-600">{stats.soldVehicles}</p>
              </div>
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Filter className="w-5 h-5 text-slate-600" />
          <h3 className="font-medium text-slate-800">Filters</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search VIN, Stock #, Make, Model..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={filters.status} onValueChange={(value) => setFilters({...filters, status: value})}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="available">Available</SelectItem>
              <SelectItem value="sold">Sold</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filters.sourceReport} onValueChange={(value: 'new_car_main_view' | 'merch_inv_view' | 'orders_all') => setFilters({...filters, sourceReport: value})}>
            <SelectTrigger>
              <SelectValue placeholder="Source Report" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="new_car_main_view">New Car Main View</SelectItem>
              <SelectItem value="merch_inv_view">Merch Inv View</SelectItem>
              <SelectItem value="orders_all">Orders All</SelectItem>
            </SelectContent>
          </Select>

          <Input
            placeholder="RPO Code (e.g., Z71)"
            value={filters.rpoCode || ''}
            onChange={(e) => setFilters({...filters, rpoCode: e.target.value})}
          />
        </div>
      </Card>

      {/* Inventory Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="p-6 animate-pulse">
              <div className="h-4 bg-slate-200 rounded mb-3"></div>
              <div className="h-6 bg-slate-200 rounded mb-2"></div>
              <div className="h-4 bg-slate-200 rounded mb-4"></div>
              <div className="flex space-x-2">
                <div className="h-6 bg-slate-200 rounded w-16"></div>
                <div className="h-6 bg-slate-200 rounded w-20"></div>
              </div>
            </Card>
          ))
        ) : (
          inventory?.map((vehicle) => (
            <Card key={vehicle.id} className="p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-medium text-slate-800">
                    {vehicle.year} {vehicle.make} {vehicle.model}
                  </h4>
                  <p className="text-sm text-slate-600">
                    {vehicle.stock_number && `Stock: ${vehicle.stock_number} • `}
                    {vehicle.vin ? `VIN: ${vehicle.vin.slice(-8)}` : 'No VIN (GM Global Order)'}
                  </p>
                </div>
                <Badge className={getStatusColor(vehicle.status)}>
                  {vehicle.status}
                </Badge>
              </div>

              {vehicle.price && (
                <p className="text-lg font-semibold text-slate-800 mb-2">
                  {formatPrice(vehicle.price)}
                </p>
              )}

              {vehicle.rpo_codes && vehicle.rpo_codes.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {vehicle.rpo_codes.slice(0, 5).map((code) => (
                    <Badge key={code} variant="outline" className="text-xs">
                      {code}
                    </Badge>
                  ))}
                  {vehicle.rpo_codes.length > 5 && (
                    <Badge variant="outline" className="text-xs">
                      +{vehicle.rpo_codes.length - 5} more
                    </Badge>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="text-sm text-slate-600">
                  {vehicle.days_in_inventory !== null && (
                    <span>{vehicle.days_in_inventory} days in inventory</span>
                  )}
                  {vehicle.leads_count > 0 && (
                    <span className="ml-3">{vehicle.leads_count} leads</span>
                  )}
                </div>
                <Link to={`/vehicle-detail/${vehicle.stock_number || vehicle.vin || vehicle.id}`}>
                  <Button variant="outline" size="sm" className="flex items-center space-x-1">
                    <Eye className="w-4 h-4" />
                    <span>View</span>
                  </Button>
                </Link>
              </div>
            </Card>
          ))
        )}
      </div>

      {inventory && inventory.length === 0 && (
        <Card className="p-8 text-center">
          <Car className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <p className="text-slate-600">No vehicles found matching your criteria</p>
        </Card>
      )}
    </div>
  );
};

export default InventoryDashboard;
