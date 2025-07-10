import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { 
  Search, 
  Filter, 
  Sparkles, 
  X, 
  ChevronDown, 
  ChevronUp,
  Calendar,
  DollarSign,
  MapPin,
  Settings
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { InventoryFilters as IInventoryFilters } from '@/services/inventory/types';

interface AdvancedInventoryFiltersProps {
  filters: IInventoryFilters;
  setFilters: (filters: IInventoryFilters) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  onDataQualityFilter: (level: string) => void;
  onAiMatch?: (criteria: any) => void;
}

interface AIMatchCriteria {
  customerIntent?: string;
  budget?: number;
  features?: string[];
  urgency?: 'low' | 'medium' | 'high';
}

const AdvancedInventoryFilters = ({
  filters,
  setFilters,
  searchTerm,
  setSearchTerm,
  onDataQualityFilter,
  onAiMatch
}: AdvancedInventoryFiltersProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showAiMatch, setShowAiMatch] = useState(false);
  const [aiCriteria, setAiCriteria] = useState<AIMatchCriteria>({});
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});

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
    setDateRange({});
    setAiCriteria({});
  };

  const activeFiltersCount = Object.values(filters).filter(Boolean).length - 3;

  const handleAiMatch = () => {
    if (onAiMatch) {
      onAiMatch({
        ...aiCriteria,
        searchTerm,
        filters
      });
    }
  };

  const priceRanges = [
    { label: 'Under $20K', min: 0, max: 20000 },
    { label: '$20K - $40K', min: 20000, max: 40000 },
    { label: '$40K - $60K', min: 40000, max: 60000 },
    { label: '$60K+', min: 60000, max: 999999 }
  ];

  const popularFeatures = [
    'Navigation System',
    'Leather Seats',
    'Sunroof',
    'Backup Camera',
    'Bluetooth',
    'Heated Seats',
    'Remote Start',
    'Premium Audio',
    'Apple CarPlay',
    'Android Auto'
  ];

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Advanced Search & Filters
            {activeFiltersCount > 0 && (
              <Badge variant="secondary">{activeFiltersCount} active</Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAiMatch(!showAiMatch)}
              className="flex items-center gap-2"
            >
              <Sparkles className="h-4 w-4" />
              AI Match
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Primary Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search VIN, Stock #, Make, Model, Features..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 h-12 text-base"
          />
        </div>

        {/* AI-Powered Matching */}
        {showAiMatch && (
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                AI-Powered Vehicle Matching
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Customer Intent</label>
                  <Input
                    placeholder="e.g., Family car for daily commute, Luxury sedan for business..."
                    value={aiCriteria.customerIntent || ''}
                    onChange={(e) => setAiCriteria({ ...aiCriteria, customerIntent: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Budget Range</label>
                  <Input
                    type="number"
                    placeholder="Maximum budget"
                    value={aiCriteria.budget || ''}
                    onChange={(e) => setAiCriteria({ ...aiCriteria, budget: parseInt(e.target.value) })}
                  />
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Urgency Level</label>
                <Select 
                  value={aiCriteria.urgency || 'medium'} 
                  onValueChange={(value: 'low' | 'medium' | 'high') => 
                    setAiCriteria({ ...aiCriteria, urgency: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low - Browsing</SelectItem>
                    <SelectItem value="medium">Medium - Considering</SelectItem>
                    <SelectItem value="high">High - Ready to Buy</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={handleAiMatch} className="w-full">
                <Sparkles className="h-4 w-4 mr-2" />
                Find AI-Matched Vehicles
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Quick Price Filters */}
        <div className="flex flex-wrap gap-2">
          {priceRanges.map((range) => (
            <Button
              key={range.label}
              variant={
                filters.priceMin === range.min && filters.priceMax === range.max
                  ? "default"
                  : "outline"
              }
              size="sm"
              onClick={() => {
                handleFilterChange('priceMin', range.min);
                handleFilterChange('priceMax', range.max);
              }}
            >
              <DollarSign className="h-3 w-3 mr-1" />
              {range.label}
            </Button>
          ))}
        </div>

        {/* Quick Access Filters */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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

          <Select value={filters.status || 'all'} onValueChange={(value) => handleFilterChange('status', value === 'all' ? undefined : value)}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="available">Available</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="sold">Sold</SelectItem>
              <SelectItem value="service">In Service</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filters.make || 'all'} onValueChange={(value) => handleFilterChange('make', value === 'all' ? undefined : value)}>
            <SelectTrigger>
              <SelectValue placeholder="Make" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Makes</SelectItem>
              <SelectItem value="Chevrolet">Chevrolet</SelectItem>
              <SelectItem value="GMC">GMC</SelectItem>
              <SelectItem value="Buick">Buick</SelectItem>
              <SelectItem value="Cadillac">Cadillac</SelectItem>
              <SelectItem value="Ford">Ford</SelectItem>
              <SelectItem value="Toyota">Toyota</SelectItem>
              <SelectItem value="Honda">Honda</SelectItem>
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
        </div>

        {/* Expanded Filters */}
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Year Range */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Year Range</label>
                <div className="flex gap-2">
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
              </div>

              {/* Price Range */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Price Range</label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Min Price"
                    type="number"
                    value={filters.priceMin || ''}
                    onChange={(e) => handleFilterChange('priceMin', e.target.value ? parseFloat(e.target.value) : undefined)}
                  />
                  <Input
                    placeholder="Max Price"
                    type="number"
                    value={filters.priceMax || ''}
                    onChange={(e) => handleFilterChange('priceMax', e.target.value ? parseFloat(e.target.value) : undefined)}
                  />
                </div>
              </div>

              {/* Source Report */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Source</label>
                <Select value={filters.sourceReport || 'all'} onValueChange={(value) => handleFilterChange('sourceReport', value === 'all' ? undefined : value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Data Source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sources</SelectItem>
                    <SelectItem value="new_car_main_view">New Car Main</SelectItem>
                    <SelectItem value="merch_inv_view">Used Inventory</SelectItem>
                    <SelectItem value="orders_all">GM Global Orders</SelectItem>
                    <SelectItem value="website_scrape">Website Scrape</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Popular Features Checkboxes */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Popular Features</label>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                {popularFeatures.map((feature) => (
                  <div key={feature} className="flex items-center space-x-2">
                    <Checkbox
                      id={feature}
                      checked={aiCriteria.features?.includes(feature) || false}
                      onCheckedChange={(checked) => {
                        const currentFeatures = aiCriteria.features || [];
                        if (checked) {
                          setAiCriteria({
                            ...aiCriteria,
                            features: [...currentFeatures, feature]
                          });
                        } else {
                          setAiCriteria({
                            ...aiCriteria,
                            features: currentFeatures.filter(f => f !== feature)
                          });
                        }
                      }}
                    />
                    <label htmlFor={feature} className="text-sm">
                      {feature}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* RPO Code Search */}
            <div className="space-y-2">
              <label className="text-sm font-medium">RPO Code</label>
              <Input
                placeholder="Enter RPO code (e.g., LT1, Z51, etc.)"
                value={filters.rpoCode || ''}
                onChange={(e) => handleFilterChange('rpoCode', e.target.value)}
              />
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Filter Actions */}
        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            {activeFiltersCount > 0 && `${activeFiltersCount} filter${activeFiltersCount > 1 ? 's' : ''} applied`}
          </div>
          
          <div className="flex gap-2">
            {activeFiltersCount > 0 && (
              <Button variant="outline" onClick={clearFilters} size="sm">
                <X className="h-3 w-3 mr-1" />
                Clear All
              </Button>
            )}
            <Button variant="outline" size="sm">
              <Settings className="h-3 w-3 mr-1" />
              Save Filter Set
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdvancedInventoryFilters;