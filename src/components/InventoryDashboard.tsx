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
import DataCompletenessModal from "./inventory/DataCompletenessModal";
import SummaryDataQualityCard from "./inventory/SummaryDataQualityCard";
import InventoryTable from "./inventory/InventoryTable";
import VehicleQRCodeModal from "./inventory/VehicleQRCodeModal";

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

  // Compute data quality stats (inside InventoryDashboard, before return)
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

  return (
    <div className="w-full max-w-7xl mx-auto py-8">
      {/* HERO Section */}
      <section className="w-full flex flex-col items-center justify-center py-16">
        <div className="max-w-3xl text-center mb-12">
          <h1 className="font-display text-5xl sm:text-6xl mb-6 font-black leading-tight">
            <span className="bg-gradient-to-r from-accent2 to-accent text-transparent bg-clip-text">
              Unlock Your Dealership’s Full Potential
            </span>
          </h1>
          <p className="text-xl text-white/80 mb-8 font-medium">
            All your inventory, leads & financials, in one beautiful dashboard. Elevate your workflow with AI-powered insights & automation.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="cta-btn shadow-xl" onClick={() => alert('Add Vehicle Flow Coming Soon!')}>Add New Vehicle</button>
            <button className="cta-btn-outline" onClick={() => alert('Schedule Demo Coming Soon!')}>Schedule Demo</button>
          </div>
        </div>
      </section>
      {/* Card for intro image/feature */}
      <div className="glass-card mb-12 mx-auto max-w-lg text-center">
        <h2 className="font-display text-2xl mb-2 font-bold text-white">Welcome to formaCRM Inventory</h2>
        <p className="text-md text-white/80 mb-5">Experience modern auto management, complete with data quality stats, fast search, and a clean new interface.</p>
        <img
          src="https://images.unsplash.com/photo-1503736334956-4c8f8e92946d?auto=format&fit=crop&w=400&q=80"
          alt="car"
          className="rounded-xl shadow-xl mx-auto border-2 border-accent2 w-full max-w-xs"
        />
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

      {/* Summary Stat Card with Quick Filters */}
      <SummaryDataQualityCard
        stats={completenessStats}
        dataQuality={filters.dataQuality || "all"}
        onFilterChange={handleDataQualityFilter}
      />

      {/* Enhanced Inventory Table */}
      <Card>
        <InventoryTable
          inventory={inventory}
          isLoading={isLoading}
          onSort={toggleSort}
          openCompletenessModal={handleOpenCompletenessModal}
          onQRCode={handleOpenQRCodeModal}
        />
        {inventory && inventory.length === 0 && (
          <div className="p-8 text-center">
            <Car className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <p className="text-slate-600">No vehicles found matching your criteria</p>
          </div>
        )}
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
