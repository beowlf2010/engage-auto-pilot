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
  sortBy?: 'age' | 'price' | 'year' | 'make' | 'model';
  sortOrder?: 'asc' | 'desc';
}

const InventoryDashboard = () => {
  const [filters, setFilters] = useState<InventoryFilters>({
    sortBy: 'age',
    sortOrder: 'desc'
  });
  const [searchTerm, setSearchTerm] = useState("");

  const { data: inventory, isLoading } = useQuery({
    queryKey: ['inventory-with-deals', filters, searchTerm],
    queryFn: async () => {
      let query = supabase
        .from('inventory')
        .select(`
          *,
          deal_count:deals!stock_number(count),
          latest_deal:deals!stock_number(
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

      // Apply sorting
      if (filters.sortBy === 'age') {
        query = query.order('days_in_inventory', { ascending: filters.sortOrder === 'asc' });
      } else if (filters.sortBy === 'price') {
        query = query.order('price', { ascending: filters.sortOrder === 'asc' });
      } else if (filters.sortBy === 'year') {
        query = query.order('year', { ascending: filters.sortOrder === 'asc' });
      } else if (filters.sortBy === 'make') {
        query = query.order('make', { ascending: filters.sortOrder === 'asc' });
      } else if (filters.sortBy === 'model') {
        query = query.order('model', { ascending: filters.sortOrder === 'asc' });
      }

      const { data, error } = await query;
      if (error) throw error;
      
      // Process the data to include deal information
      const processedData = data?.map(vehicle => ({
        ...vehicle,
        deal_count: vehicle.deal_count?.[0]?.count || 0,
        latest_deal: vehicle.latest_deal?.[0] || null
      }));
      
      return processedData;
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

      // For regular inventory (non-GM Global), count vehicles with status 'available'
      const { count: regularAvailable } = await supabase
        .from('inventory')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'available')
        .neq('source_report', 'orders_all');

      // For GM Global orders, only count vehicles with status '5000' as available
      const { count: gmGlobalAvailable } = await supabase
        .from('inventory')
        .select('*', { count: 'exact', head: true })
        .eq('source_report', 'orders_all')
        .eq('status', '5000');

      // Count GM Global orders that are in production/transit (not 5000)
      const { count: inProductionTransit } = await supabase
        .from('inventory')
        .select('*', { count: 'exact', head: true })
        .eq('source_report', 'orders_all')
        .neq('status', '5000');

      const { count: soldVehicles } = await supabase
        .from('inventory')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'sold');

      return {
        totalVehicles: totalVehicles || 0,
        availableVehicles: (regularAvailable || 0) + (gmGlobalAvailable || 0),
        inProductionTransit: inProductionTransit || 0,
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

  const getGMGlobalStatus = (status: string) => {
    if (status === '5000') {
      return { label: 'Available', color: 'bg-green-100 text-green-800' };
    } else if (status === '1000' || status === '2000') {
      return { label: 'Being Built', color: 'bg-yellow-100 text-yellow-800' };
    } else {
      return { label: 'In Transit', color: 'bg-blue-100 text-blue-800' };
    }
  };

  // Enhanced vehicle title formatting that prevents duplication and handles vAuto data properly
  const formatVehicleTitle = (vehicle: any) => {
    console.log('=== VEHICLE TITLE FORMATTING ===');
    console.log('Vehicle data:', { year: vehicle.year, make: vehicle.make, model: vehicle.model, trim: vehicle.trim });
    
    // Handle vAuto data where vehicle info might be in full_option_blob
    if (vehicle.full_option_blob && typeof vehicle.full_option_blob === 'object') {
      const blob = vehicle.full_option_blob;
      console.log('Checking vAuto blob for vehicle info...');
      
      // Look for vAuto Vehicle field
      const vehicleField = blob.Vehicle || blob.vehicle || blob['Vehicle:'];
      if (vehicleField && typeof vehicleField === 'string') {
        console.log('Found vAuto vehicle field:', vehicleField);
        
        // Parse vAuto format: "2022 Chevrolet Silverado 1500 LT"
        const parts = vehicleField.trim().split(/\s+/);
        if (parts.length >= 3) {
          const yearPart = parts.find(p => /^\d{4}$/.test(p));
          const yearIndex = yearPart ? parts.indexOf(yearPart) : -1;
          
          if (yearIndex !== -1 && yearIndex < parts.length - 2) {
            const extractedYear = parts[yearIndex];
            const extractedMake = parts[yearIndex + 1];
            const extractedModel = parts.slice(yearIndex + 2).join(' ');
            
            console.log('Extracted from vAuto:', { year: extractedYear, make: extractedMake, model: extractedModel });
            return `${extractedYear} ${extractedMake} ${extractedModel}`;
          }
        }
      }
    }
    
    // Fallback to database fields
    const year = vehicle.year ? String(vehicle.year) : '';
    const make = vehicle.make || '';
    const model = vehicle.model || '';
    const trim = vehicle.trim || '';

    // Prevent duplication issues
    const makeContainsYear = year && make.includes(year);
    const modelContainsYear = year && model.includes(year);
    const makeAndModelSame = make.toLowerCase() === model.toLowerCase();
    const modelContainsMake = model.toLowerCase().includes(make.toLowerCase()) && make.length > 2;

    console.log('Database field analysis:', { 
      year, make, model, trim, 
      makeContainsYear, modelContainsYear, makeAndModelSame, modelContainsMake 
    });

    let parts: string[] = [];

    // Add year only if it's not already in make or model
    if (year && !makeContainsYear && !modelContainsYear) {
      parts.push(year);
    }

    // Handle make - avoid duplication
    if (make && !makeAndModelSame && !modelContainsMake) {
      parts.push(make);
    }

    // Handle model - avoid duplication
    if (model && !makeAndModelSame) {
      parts.push(model);
    } else if (!model && make) {
      // If no model but we have make, use make
      parts.push(make);
    }

    // Add trim if available and not already included
    if (trim && !parts.some(part => part.toLowerCase().includes(trim.toLowerCase()))) {
      parts.push(trim);
    }

    const result = parts.filter(Boolean).join(' ');
    console.log('Final formatted title:', result);
    
    return result || 'Unknown Vehicle';
  };

  // Enhanced description extraction from vAuto data
  const getVehicleDescription = (vehicle: any) => {
    if (vehicle.full_option_blob && typeof vehicle.full_option_blob === 'object') {
      const blob = vehicle.full_option_blob;
      
      // Look for vAuto-specific rich data
      const overallScore = blob.Overall || blob.overall;
      const priceRank = blob['Price Rank'] || blob.priceRank;
      const daysOnMarket = blob['Days on Market'] || blob.daysOnMarket;
      
      if (overallScore || priceRank || daysOnMarket) {
        const metrics = [];
        if (overallScore) metrics.push(`Overall: ${overallScore}`);
        if (priceRank) metrics.push(`Price Rank: ${priceRank}`);
        if (daysOnMarket) metrics.push(`${daysOnMarket} days on market`);
        return metrics.join(' • ');
      }
      
      // Fallback to description fields
      const description = blob.Description || blob.description || blob.Details || blob.details;
      if (description && typeof description === 'string' && description.length > 10) {
        return description.substring(0, 80) + '...';
      }
    }
    return null;
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(price);
  };

  const isGMGlobalOrder = (vehicle: any) => {
    return vehicle.source_report === 'orders_all';
  };

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

      {/* Enhanced Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
                <p className="text-sm font-medium text-slate-600">Available for Sale</p>
                <p className="text-2xl font-bold text-green-600">{stats.availableVehicles}</p>
                <p className="text-xs text-slate-500">Ready on lot</p>
              </div>
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              </div>
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">In Production/Transit</p>
                <p className="text-2xl font-bold text-orange-600">{stats.inProductionTransit}</p>
                <p className="text-xs text-slate-500">GM Global orders</p>
              </div>
              <Clock className="w-8 h-8 text-orange-500" />
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

      {/* Enhanced Filters */}
      <Card className="p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Filter className="w-5 h-5 text-slate-600" />
          <h3 className="font-medium text-slate-800">Filters & Sorting</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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
              <SelectValue placeholder="Inventory Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="new_car_main_view">New Car Inventory</SelectItem>
              <SelectItem value="merch_inv_view">Used Inventory</SelectItem>
              <SelectItem value="orders_all">GM Global Orders</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filters.sortBy} onValueChange={(value: 'age' | 'price' | 'year' | 'make' | 'model') => setFilters({...filters, sortBy: value})}>
            <SelectTrigger>
              <SelectValue placeholder="Sort By" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="age">Age (Days in Stock)</SelectItem>
              <SelectItem value="price">Price</SelectItem>
              <SelectItem value="year">Year</SelectItem>
              <SelectItem value="make">Make</SelectItem>
              <SelectItem value="model">Model</SelectItem>
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
              <TableHead className="font-semibold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 10 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><div className="h-4 bg-slate-200 rounded animate-pulse"></div></TableCell>
                  <TableCell><div className="h-4 bg-slate-200 rounded animate-pulse"></div></TableCell>
                  <TableCell><div className="h-4 bg-slate-200 rounded animate-pulse"></div></TableCell>
                  <TableCell><div className="h-4 bg-slate-200 rounded animate-pulse"></div></TableCell>
                  <TableCell><div className="h-4 bg-slate-200 rounded animate-pulse"></div></TableCell>
                  <TableCell><div className="h-4 bg-slate-200 rounded animate-pulse"></div></TableCell>
                  <TableCell><div className="h-4 bg-slate-200 rounded animate-pulse"></div></TableCell>
                </TableRow>
              ))
            ) : (
              inventory?.map((vehicle) => {
                const vehicleDescription = getVehicleDescription(vehicle);
                
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
                      {isGMGlobalOrder(vehicle) && !vehicle.vin && (
                        <div className="text-xs text-slate-500 mt-1">GM Global Order</div>
                      )}
                    </TableCell>
                    
                    <TableCell>
                      {vehicle.price && (
                        <div className="font-semibold text-slate-800">
                          {formatPrice(vehicle.price)}
                        </div>
                      )}
                      {vehicle.msrp && vehicle.msrp !== vehicle.price && (
                        <div className="text-sm text-slate-500 line-through">
                          MSRP: {formatPrice(vehicle.msrp)}
                        </div>
                      )}
                    </TableCell>
                    
                    <TableCell>
                      {isGMGlobalOrder(vehicle) && vehicle.status ? (
                        <Badge className={getGMGlobalStatus(vehicle.status).color}>
                          {getGMGlobalStatus(vehicle.status).label}
                        </Badge>
                      ) : vehicle.condition === 'new' && vehicle.status ? (
                        <Badge className="bg-green-100 text-green-800">
                          {vehicle.status}
                        </Badge>
                      ) : (
                        <span className="text-slate-500">-</span>
                      )}
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
