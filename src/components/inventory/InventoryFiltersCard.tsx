
import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, X, RefreshCw } from "lucide-react";

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
  const clearAllFilters = () => {
    setFilters({
      sortBy: 'age',
      sortOrder: 'desc',
      dataQuality: 'all'
    });
    setSearchTerm("");
  };

  const hasActiveFilters = () => {
    return searchTerm || filters.make || filters.model || filters.inventoryType !== 'all' || 
           filters.sourceReport || filters.rpoCode || filters.yearMin || filters.yearMax || 
           filters.priceMin || filters.priceMax || filters.dataQuality !== 'all';
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (searchTerm) count++;
    if (filters.make) count++;
    if (filters.model) count++;
    if (filters.inventoryType && filters.inventoryType !== 'all') count++;
    if (filters.sourceReport) count++;
    if (filters.rpoCode) count++;
    if (filters.yearMin) count++;
    if (filters.yearMax) count++;
    if (filters.priceMin) count++;
    if (filters.priceMax) count++;
    if (filters.dataQuality && filters.dataQuality !== 'all') count++;
    return count;
  };

  return (
    <Card className="p-6 bg-gradient-to-r from-slate-50 to-blue-50 border-slate-200">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <Filter className="w-5 h-5 text-slate-600" />
          <h3 className="text-lg font-semibold text-slate-800">Filters & Search</h3>
          {hasActiveFilters() && (
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              {getActiveFilterCount()} active
            </Badge>
          )}
        </div>
        {hasActiveFilters() && (
          <Button variant="outline" size="sm" onClick={clearAllFilters} className="text-slate-600 hover:text-slate-800">
            <RefreshCw className="w-4 h-4 mr-1" />
            Clear All
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Search */}
        <div className="lg:col-span-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <Input
              placeholder="Search by VIN, Stock #, Make, Model..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white border-slate-300 focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Make */}
        <div>
          <Input
            placeholder="Make (e.g. Chevrolet)"
            value={filters.make || ""}
            onChange={(e) => setFilters({ ...filters, make: e.target.value || undefined })}
            className="bg-white border-slate-300 focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        {/* Model */}
        <div>
          <Input
            placeholder="Model (e.g. Silverado)"
            value={filters.model || ""}
            onChange={(e) => setFilters({ ...filters, model: e.target.value || undefined })}
            className="bg-white border-slate-300 focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        {/* Inventory Type */}
        <div>
          <Select 
            value={filters.inventoryType || 'all'} 
            onValueChange={(value) => setFilters({ ...filters, inventoryType: value as any })}
          >
            <SelectTrigger className="bg-white border-slate-300 focus:border-blue-500 focus:ring-blue-500">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent className="bg-white border-slate-200 shadow-lg">
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="used">Used</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Source Report */}
        <div>
          <Select 
            value={filters.sourceReport || ''} 
            onValueChange={(value) => setFilters({ ...filters, sourceReport: value as any || undefined })}
          >
            <SelectTrigger className="bg-white border-slate-300 focus:border-blue-500 focus:ring-blue-500">
              <SelectValue placeholder="Source" />
            </SelectTrigger>
            <SelectContent className="bg-white border-slate-200 shadow-lg">
              <SelectItem value="">All Sources</SelectItem>
              <SelectItem value="new_car_main_view">New Car Main</SelectItem>
              <SelectItem value="merch_inv_view">Merch Inventory</SelectItem>
              <SelectItem value="orders_all">GM Global Orders</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* RPO Code */}
        <div>
          <Input
            placeholder="RPO Code"
            value={filters.rpoCode || ""}
            onChange={(e) => setFilters({ ...filters, rpoCode: e.target.value || undefined })}
            className="bg-white border-slate-300 focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        {/* Year Range */}
        <div className="flex space-x-2">
          <Input
            placeholder="Min Year"
            type="number"
            value={filters.yearMin || ""}
            onChange={(e) => setFilters({ ...filters, yearMin: e.target.value ? parseInt(e.target.value) : undefined })}
            className="bg-white border-slate-300 focus:border-blue-500 focus:ring-blue-500"
          />
          <Input
            placeholder="Max Year"
            type="number"
            value={filters.yearMax || ""}
            onChange={(e) => setFilters({ ...filters, yearMax: e.target.value ? parseInt(e.target.value) : undefined })}
            className="bg-white border-slate-300 focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Price Range */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <div className="flex space-x-2">
          <Input
            placeholder="Min Price"
            type="number"
            value={filters.priceMin || ""}
            onChange={(e) => setFilters({ ...filters, priceMin: e.target.value ? parseFloat(e.target.value) : undefined })}
            className="bg-white border-slate-300 focus:border-blue-500 focus:ring-blue-500"
          />
          <Input
            placeholder="Max Price"
            type="number"
            value={filters.priceMax || ""}
            onChange={(e) => setFilters({ ...filters, priceMax: e.target.value ? parseFloat(e.target.value) : undefined })}
            className="bg-white border-slate-300 focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Active Filter Tags */}
      {hasActiveFilters() && (
        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-slate-200">
          {searchTerm && (
            <Badge variant="outline" className="bg-white border-blue-300 text-blue-700">
              Search: "{searchTerm}"
              <Button variant="ghost" size="sm" onClick={() => setSearchTerm("")} className="ml-1 h-4 w-4 p-0">
                <X className="w-3 h-3" />
              </Button>
            </Badge>
          )}
          {filters.make && (
            <Badge variant="outline" className="bg-white border-blue-300 text-blue-700">
              Make: {filters.make}
              <Button variant="ghost" size="sm" onClick={() => setFilters({ ...filters, make: undefined })} className="ml-1 h-4 w-4 p-0">
                <X className="w-3 h-3" />
              </Button>
            </Badge>
          )}
          {filters.model && (
            <Badge variant="outline" className="bg-white border-blue-300 text-blue-700">
              Model: {filters.model}
              <Button variant="ghost" size="sm" onClick={() => setFilters({ ...filters, model: undefined })} className="ml-1 h-4 w-4 p-0">
                <X className="w-3 h-3" />
              </Button>
            </Badge>
          )}
        </div>
      )}
    </Card>
  );
};

export default InventoryFiltersCard;
