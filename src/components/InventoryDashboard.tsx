import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Search, Filter, Car, Eye, BarChart3, ArrowUpDown, Calendar, Clock, DollarSign, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import VehicleIdentifier from "@/components/shared/VehicleIdentifier";
import EnhancedInventoryMetrics from "@/components/inventory/EnhancedInventoryMetrics";
import InventoryCleanupButton from "@/components/inventory/InventoryCleanupButton";
import { formatVehicleTitle, getVehicleDescription, formatPrice, getDataCompletenessScore, getVehicleStatusDisplay } from "@/services/inventory/vehicleFormattingService";
import DataCompletenessModal from "./inventory/DataCompletenessModal";
import SummaryDataQualityCard from "./inventory/SummaryDataQualityCard";
import InventoryTable from "./inventory/InventoryTable";
import VehicleQRCodeModal from "./inventory/VehicleQRCodeModal";
import AIInventoryMetrics from "./inventory/AIInventoryMetrics";

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
  const [completenessModalOpen, setCompletenessModalOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<any | null>(null);
  const [qrModalOpen, setQRModalOpen] = useState(false);
  const [qrVehicle, setQRVehicle] = useState<any | null>(null);

  const { data: inventory, isLoading, error, refetch } = useQuery({
    queryKey: ['inventory-enhanced', filters, searchTerm],
    queryFn: async () => {
      try {
        console.log('Fetching inventory with filters:', filters);
        
        // First, get inventory data without the problematic join
        let query = supabase
          .from('inventory')
          .select('*');

        // Apply filters
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

        const { data: inventoryData, error: inventoryError } = await query;
        if (inventoryError) throw inventoryError;

        console.log(`Fetched ${inventoryData?.length || 0} inventory items`);

        // Get deals data separately to avoid join issues
        let dealsData: any[] = [];
        if (inventoryData && inventoryData.length > 0) {
          try {
            const stockNumbers = inventoryData
              .map(item => item.stock_number)
              .filter(Boolean);
            
            if (stockNumbers.length > 0) {
              const { data: deals, error: dealsError } = await supabase
                .from('deals')
                .select('*')
                .in('stock_number', stockNumbers);
              
              if (!dealsError) {
                dealsData = deals || [];
              }
            }
          } catch (dealsError) {
            console.warn('Could not fetch deals data:', dealsError);
          }
        }

        // Process the data to include deal information and data quality with error handling
        let processedData = inventoryData?.map(vehicle => {
          try {
            // Find related deals for this vehicle
            const vehicleDeals = dealsData.filter(deal => 
              deal.stock_number === vehicle.stock_number
            );

            return {
              ...vehicle,
              deals: vehicleDeals,
              deal_count: vehicleDeals.length,
              latest_deal: vehicleDeals.length > 0 
                ? vehicleDeals.sort((a, b) => new Date(b.upload_date).getTime() - new Date(a.upload_date).getTime())[0]
                : null,
              data_completeness: getDataCompletenessScore(vehicle)
            };
          } catch (error) {
            console.error('Error processing vehicle data:', error, vehicle);
            return {
              ...vehicle,
              deals: [],
              deal_count: 0,
              latest_deal: null,
              data_completeness: 0
            };
          }
        }) || [];

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
        
        console.log(`Processed ${processedData.length} inventory items with deals data`);
        return processedData;
      } catch (error) {
        console.error('Error fetching inventory:', error);
        throw error;
      }
    }
  });

  // Compute data quality stats
  const completenessStats = (() => {
    if (!Array.isArray(inventory)) return { total: 0, complete: 0, incomplete: 0 };
    let complete = 0, incomplete = 0;
    inventory.forEach(v => {
      if ((v.data_completeness ?? 0) >= 80) complete++;
      else incomplete++;
    });
    return {
      total: inventory.length,
      complete,
      incomplete,
    };
  })();

  const handleDataQualityFilter = (quality: "all" | "complete" | "incomplete") => {
    setFilters({ ...filters, dataQuality: quality });
  };

  const handleOpenCompletenessModal = (vehicle: any) => {
    setSelectedVehicle(vehicle);
    setCompletenessModalOpen(true);
  };

  const handleOpenQRCodeModal = (vehicle: any) => {
    setQRVehicle(vehicle);
    setQRModalOpen(true);
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

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Inventory Dashboard</h1>
            <p className="text-slate-600 mt-1">Error loading inventory data</p>
          </div>
        </div>
        <Card className="p-8 text-center">
          <div className="text-red-600 mb-4">
            <Car className="w-12 h-12 mx-auto mb-3" />
            <h3 className="text-lg font-semibold mb-2">Unable to load inventory</h3>
            <p className="text-sm">{error.message || 'An unexpected error occurred'}</p>
          </div>
          <Button onClick={() => refetch()} variant="outline" className="mr-2">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
          <Button onClick={() => window.location.reload()} variant="outline">
            Refresh Page
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Inventory Dashboard</h1>
          <p className="text-slate-600 mt-1">AI-powered inventory management and analysis</p>
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

      {/* NEW: AI Inventory Intelligence */}
      <AIInventoryMetrics totalVehicles={inventory?.length || 0} />

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

      {/* Summary Stat Card with Quick Filters */}
      <SummaryDataQualityCard
        stats={completenessStats}
        dataQuality={filters.dataQuality || "all"}
        onFilterChange={handleDataQualityFilter}
      />

      {/* Enhanced Inventory Table with Error Boundary */}
      <Card>
        {inventory && inventory.length > 0 ? (
          <InventoryTable
            inventory={inventory}
            isLoading={isLoading}
            onSort={toggleSort}
            openCompletenessModal={handleOpenCompletenessModal}
            onQRCode={handleOpenQRCodeModal}
          />
        ) : !isLoading ? (
          <div className="p-8 text-center">
            <Car className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <p className="text-slate-600">No vehicles found matching your criteria</p>
          </div>
        ) : null}
      </Card>

      {/* Modal for QR Code print */}
      <VehicleQRCodeModal
        open={qrModalOpen}
        onOpenChange={setQRModalOpen}
        vehicle={qrVehicle}
      />
      {/* Modal for data completeness */}
      <DataCompletenessModal
        open={completenessModalOpen}
        onOpenChange={(open) => setCompletenessModalOpen(open)}
        vehicle={selectedVehicle}
      />
    </div>
  );
};

export default InventoryDashboard;
