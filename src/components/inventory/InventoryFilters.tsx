
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Filter } from 'lucide-react';
import { InventoryFilters as IInventoryFilters } from '@/services/inventory/types';

interface InventoryFiltersProps {
  filters: IInventoryFilters;
  setFilters: (filters: IInventoryFilters) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  onDataQualityFilter: (level: string) => void;
}

const InventoryFilters = ({
  filters,
  setFilters,
  searchTerm,
  setSearchTerm,
  onDataQualityFilter
}: InventoryFiltersProps) => {
  const handleFilterChange = (key: keyof IInventoryFilters, value: any) => {
    setFilters({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    setFilters({
      sortBy: 'age',
      sortOrder: 'desc',
      dataQuality: 'all'
    });
    setSearchTerm('');
  };

  const activeFiltersCount = Object.values(filters).filter(Boolean).length - 3; // Exclude default sortBy, sortOrder, dataQuality

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="h-5 w-5" />
          Filters
          {activeFiltersCount > 0 && (
            <Badge variant="secondary">{activeFiltersCount} active</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search VIN, Stock #, Make..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={filters.inventoryType || 'all'} onValueChange={(value) => handleFilterChange('inventoryType', value === 'all' ? undefined : value)}>
            <SelectTrigger>
              <SelectValue placeholder="Condition" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Conditions</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="used">Used</SelectItem>
              <SelectItem value="certified">Certified</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filters.sourceReport || 'all'} onValueChange={(value) => handleFilterChange('sourceReport', value === 'all' ? undefined : value)}>
            <SelectTrigger>
              <SelectValue placeholder="Source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              <SelectItem value="new_car_main_view">New Car Main</SelectItem>
              <SelectItem value="merch_inv_view">Used Inventory</SelectItem>
              <SelectItem value="orders_all">GM Global Orders</SelectItem>
              <SelectItem value="website_scrape">Website Scrape</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filters.dataQuality || 'all'} onValueChange={onDataQualityFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Data Quality" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Quality</SelectItem>
              <SelectItem value="complete">Complete (80%+)</SelectItem>
              <SelectItem value="incomplete">Incomplete (&lt;80%)</SelectItem>
            </SelectContent>
          </Select>

          <Input
            placeholder="Min Year"
            type="number"
            value={filters.yearMin || ''}
            onChange={(e) => handleFilterChange('yearMin', e.target.value ? parseInt(e.target.value) : undefined)}
          />

          <Input
            placeholder="Max Year"
            type="number"
            value={filters.yearMax || ''}
            onChange={(e) => handleFilterChange('yearMax', e.target.value ? parseInt(e.target.value) : undefined)}
          />
        </div>

        <div className="flex justify-between items-center">
          <div className="flex gap-2">
            <Input
              placeholder="Min Price"
              type="number"
              value={filters.priceMin || ''}
              onChange={(e) => handleFilterChange('priceMin', e.target.value ? parseFloat(e.target.value) : undefined)}
              className="w-32"
            />
            <Input
              placeholder="Max Price"
              type="number"
              value={filters.priceMax || ''}
              onChange={(e) => handleFilterChange('priceMax', e.target.value ? parseFloat(e.target.value) : undefined)}
              className="w-32"
            />
          </div>

          {activeFiltersCount > 0 && (
            <Button variant="outline" onClick={clearFilters}>
              Clear Filters
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default InventoryFilters;
