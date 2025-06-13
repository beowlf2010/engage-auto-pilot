
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { Search, Filter, Car, Eye, BarChart3, ArrowUpDown, Calendar, Clock, DollarSign } from "lucide-react";
import { Link } from "react-router-dom";
import VehicleIdentifier from "@/components/shared/VehicleIdentifier";
import EnhancedInventoryMetrics from "@/components/inventory/EnhancedInventoryMetrics";
import InventoryCleanupButton from "@/components/inventory/InventoryCleanupButton";
import { formatVehicleTitle, getVehicleDescription, formatPrice, getDataCompletenessScore, getVehicleStatusDisplay } from "@/services/inventory/vehicleFormattingService";

interface InventoryFilters {
  make?: string;
  model?: string;
  inventoryType?: 'new' | 'used' | 'all';
  sourceReport?: 'new_car_main_view' | 'merch_inv_view' | 'orders_all';
  rpoCode?: string;
  yearMin?: number;
  yearMax?: number;
  priceMin?: number;
  priceMax?: number;
  sortBy?: 'age' | 'price' | 'year' | 'make' | 'model' | 'completeness';
  sortOrder?: 'asc' | 'desc';
  dataQuality?: 'all' | 'complete' | 'incomplete';
}

const InventoryDashboard = () => {
  const [filters, setFilters] = useState<InventoryFilters>({
    sortBy: 'age',
    sortOrder: 'desc',
    dataQuality: 'all'
  });
  const [searchTerm, setSearchTerm] = useState("");

  const { data: inventory, isLoading } = useQuery({
    queryKey: ['inventory-enhanced', filters, searchTerm],
    queryFn: async () => {
      let query = supabase
        .from('inventory')
        .select(`
          *,
          deals!stock_number(
            id,
            upload_date,
            sale_amount,
            total_profit,
            deal_type
          )
        `);

      if (filters.make) {
        query = query.ilike('make', `%${filters.make}%`);
      }
      if (filters.model) {
        query = query.ilike('model', `%${filters.model}%`);
      }
      if (filters.inventoryType && filters.inventoryType !== 'all') {
        query = query.eq('condition', filters.inventoryType);
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
      
      // Process the data to include deal information and data quality
      let processedData = data?.map(vehicle => ({
        ...vehicle,
        deal_count: Array.isArray(vehicle.deals) ? vehicle.deals.length : 0,
        latest_deal: Array.isArray(vehicle.deals) && vehicle.deals.length > 0 
          ? vehicle.deals.sort((a, b) => new Date(b.upload_date).getTime() - new Date(a.upload_date).getTime())[0]
          : null,
        data_completeness: getDataCompletenessScore(vehicle)
      })) || [];

      // Apply data quality filter
      if (filters.dataQuality === 'complete') {
        processedData = processedData.filter(v => v.data_completeness >= 80);
      } else if (filters.dataQuality === 'incomplete') {
        processedData = processedData.filter(v => v.data_completeness < 80);
      }

      // Apply sorting
      processedData.sort((a, b) => {
        let aVal, bVal;
        
        switch (filters.sortBy) {
          case 'age':
            aVal = a.days_in_inventory || 0;
            bVal = b.days_in_inventory || 0;
            break;
          case 'price':
            aVal = a.price || 0;
            bVal = b.price || 0;
            break;
          case 'year':
            aVal = a.year || 0;
            bVal = b.year || 0;
            break;
          case 'make':
            aVal = a.make || '';
            bVal = b.make || '';
            break;
          case 'model':
            aVal = a.model || '';
            bVal = b.model || '';
            break;
          case 'completeness':
            aVal = a.data_completeness;
            bVal = b.data_completeness;
            break;
          default:
            return 0;
        }
        
        if (typeof aVal === 'string') {
          return filters.sortOrder === 'asc' 
            ? aVal.localeCompare(bVal) 
            : bVal.localeCompare(aVal);
        }
        
        return filters.sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
      });
      
      return processedData;
    }
  });

  const toggleSort = (sortBy: string) => {
    if (filters.sortBy === sortBy) {
      setFilters({
        ...filters,
        sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc'
      });
    } else {
      setFilters({
        ...filters,
        sortBy: sortBy as any,
        sortOrder: 'asc'
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Inventory Dashboard</h1>
          <p className="text-slate-600 mt-1">Manage and analyze your vehicle inventory with enhanced new/used breakdown</p>
        </div>
        <div className="flex items-center space-x-3">
          <InventoryCleanupButton />
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

      {/* Enhanced Stats with New/Used Breakdown */}
      <EnhancedInventoryMetrics />

      {/* Enhanced Filters */}
      <Card className="p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Filter className="w-5 h-5 text-slate-600" />
          <h3 className="font-medium text-slate-800">Filters & Sorting</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search VIN, Stock #, Make, Model..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={filters.inventoryType} onValueChange={(value: 'new' | 'used' | 'all') => setFilters({...filters, inventoryType: value})}>
            <SelectTrigger>
              <SelectValue placeholder="New/Used" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Inventory</SelectItem>
              <SelectItem value="new">New Only</SelectItem>
              <SelectItem value="used">Used Only</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filters.sourceReport} onValueChange={(value: 'new_car_main_view' | 'merch_inv_view' | 'orders_all') => setFilters({...filters, sourceReport: value})}>
            <SelectTrigger>
              <SelectValue placeholder="Source Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="new_car_main_view">New Car Inventory</SelectItem>
              <SelectItem value="merch_inv_view">Used Inventory</SelectItem>
              <SelectItem value="orders_all">GM Global Orders</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filters.dataQuality} onValueChange={(value: 'all' | 'complete' | 'incomplete') => setFilters({...filters, dataQuality: value})}>
            <SelectTrigger>
              <SelectValue placeholder="Data Quality" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Records</SelectItem>
              <SelectItem value="complete">Complete Data (80%+)</SelectItem>
              <SelectItem value="incomplete">Incomplete Data (&lt;80%)</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filters.sortBy} onValueChange={(value: 'age' | 'price' | 'year' | 'make' | 'model' | 'completeness') => setFilters({...filters, sortBy: value})}>
            <SelectTrigger>
              <SelectValue placeholder="Sort By" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="age">Age (Days in Stock)</SelectItem>
              <SelectItem value="price">Price</SelectItem>
              <SelectItem value="year">Year</SelectItem>
              <SelectItem value="make">Make</SelectItem>
              <SelectItem value="model">Model</SelectItem>
              <SelectItem value="completeness">Data Completeness</SelectItem>
            </SelectContent>
          </Select>

          <Input
            placeholder="RPO Code (e.g., Z71)"
            value={filters.rpoCode || ''}
            onChange={(e) => setFilters({...filters, rpoCode: e.target.value})}
          />
        </div>
      </Card>

      {/* Enhanced Inventory Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead className="font-semibold">
                <Button variant="ghost" size="sm" onClick={() => toggleSort('make')} className="p-0 h-auto font-semibold">
                  Vehicle <ArrowUpDown className="w-3 h-3 ml-1" />
                </Button>
              </TableHead>
              <TableHead className="font-semibold">Stock #</TableHead>
              <TableHead className="font-semibold">
                <Button variant="ghost" size="sm" onClick={() => toggleSort('price')} className="p-0 h-auto font-semibold">
                  Price <ArrowUpDown className="w-3 h-3 ml-1" />
                </Button>
              </TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="font-semibold">
                <Button variant="ghost" size="sm" onClick={() => toggleSort('age')} className="p-0 h-auto font-semibold">
                  Age <ArrowUpDown className="w-3 h-3 ml-1" />
                </Button>
              </TableHead>
              <TableHead className="font-semibold">Features</TableHead>
              <TableHead className="font-semibold">Deal History</TableHead>
              <TableHead className="font-semibold">
                <Button variant="ghost" size="sm" onClick={() => toggleSort('completeness')} className="p-0 h-auto font-semibold">
                  Data Quality <ArrowUpDown className="w-3 h-3 ml-1" />
                </Button>
              </TableHead>
              <TableHead className="font-semibold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 10 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 9 }).map((_, j) => (
                    <TableCell key={j}><div className="h-4 bg-slate-200 rounded animate-pulse"></div></TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              inventory?.map((vehicle) => {
                const vehicleDescription = getVehicleDescription(vehicle);
                const statusDisplay = getVehicleStatusDisplay(vehicle);
                
                return (
                  <TableRow key={vehicle.id} className="hover:bg-slate-50">
                    <TableCell>
                      <div>
                        <div className="font-medium text-slate-800">
                          {formatVehicleTitle(vehicle)}
                        </div>
                        {vehicle.color_exterior && (
                          <div className="text-sm text-slate-600">{vehicle.color_exterior}</div>
                        )}
                        {vehicleDescription && (
                          <div className="text-xs text-slate-500 mt-1">{vehicleDescription}</div>
                        )}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <VehicleIdentifier 
                        stockNumber={vehicle.stock_number}
                        vin={vehicle.vin}
                        variant="badge"
                        showIcon={true}
                      />
                      {vehicle.source_report === 'orders_all' && !vehicle.vin && (
                        <div className="text-xs text-slate-500 mt-1">GM Global Order</div>
                      )}
                    </TableCell>
                    
                    <TableCell>
                      <div className="font-semibold text-slate-800">
                        {formatPrice(vehicle.price)}
                      </div>
                      {vehicle.msrp && vehicle.msrp !== vehicle.price && (
                        <div className="text-sm text-slate-500 line-through">
                          MSRP: {formatPrice(vehicle.msrp)}
                        </div>
                      )}
                    </TableCell>
                    
                    <TableCell>
                      <Badge className={statusDisplay.color}>
                        {statusDisplay.label}
                      </Badge>
                      {vehicle.expected_sale_date && (
                        <div className="text-xs text-slate-500 mt-1 flex items-center">
                          <Calendar className="w-3 h-3 mr-1" />
                          ETA: {new Date(vehicle.expected_sale_date).toLocaleDateString()}
                        </div>
                      )}
                    </TableCell>
                    
                    <TableCell>
                      <div className="text-sm">
                        {vehicle.days_in_inventory !== null ? (
                          <div>{vehicle.days_in_inventory} days</div>
                        ) : (
                          <span className="text-slate-500">-</span>
                        )}
                        {vehicle.leads_count > 0 && (
                          <div className="text-blue-600">{vehicle.leads_count} leads</div>
                        )}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      {vehicle.rpo_codes && vehicle.rpo_codes.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {vehicle.rpo_codes.slice(0, 3).map((code) => (
                            <Badge key={code} variant="outline" className="text-xs">
                              {code}
                            </Badge>
                          ))}
                          {vehicle.rpo_codes.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{vehicle.rpo_codes.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}
                    </TableCell>
                    
                    <TableCell>
                      <div className="text-sm">
                        {vehicle.deal_count > 0 ? (
                          <div className="space-y-1">
                            <Badge variant="outline" className="text-xs">
                              {vehicle.deal_count} deal{vehicle.deal_count > 1 ? 's' : ''}
                            </Badge>
                            {vehicle.latest_deal && (
                              <div className="text-xs text-slate-600">
                                <div className="flex items-center space-x-1">
                                  <DollarSign className="w-3 h-3" />
                                  <span>
                                    {vehicle.latest_deal.sale_amount 
                                      ? formatPrice(vehicle.latest_deal.sale_amount)
                                      : 'No sale price'
                                    }
                                  </span>
                                </div>
                                <div className="text-slate-500">
                                  {new Date(vehicle.latest_deal.upload_date).toLocaleDateString()}
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-500 text-xs">No deals</span>
                        )}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${
                            vehicle.data_completeness >= 80 
                              ? 'bg-green-50 text-green-700 border-green-200' 
                              : vehicle.data_completeness >= 60
                                ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                                : 'bg-red-50 text-red-700 border-red-200'
                          }`}
                        >
                          {vehicle.data_completeness}%
                        </Badge>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <Link to={`/vehicle-detail/${vehicle.stock_number || vehicle.vin || vehicle.id}`}>
                        <Button variant="outline" size="sm" className="flex items-center space-x-1">
                          <Eye className="w-4 h-4" />
                          <span>View</span>
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        {inventory && inventory.length === 0 && (
          <div className="p-8 text-center">
            <Car className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <p className="text-slate-600">No vehicles found matching your criteria</p>
          </div>
        )}
      </Card>
    </div>
  );
};

export default InventoryDashboard;
