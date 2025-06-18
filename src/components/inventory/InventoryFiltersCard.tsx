
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter } from "lucide-react";

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

interface InventoryFiltersCardProps {
  filters: InventoryFilters;
  setFilters: (filters: InventoryFilters) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
}

const InventoryFiltersCard = ({ filters, setFilters, searchTerm, setSearchTerm }: InventoryFiltersCardProps) => {
  return (
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
  );
};

export default InventoryFiltersCard;
