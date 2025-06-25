
import React from 'react';
import { InboxFilters } from '@/hooks/useInboxFilters';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface SearchFiltersSectionProps {
  filters: InboxFilters;
  onFiltersChange: (filters: Partial<InboxFilters>) => void;
}

const SearchFiltersSection: React.FC<SearchFiltersSectionProps> = ({
  filters,
  onFiltersChange
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Search Filters</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="leadSource" className="text-sm font-medium">
              Lead Source
            </Label>
            <Input
              id="leadSource"
              value={filters.leadSource}
              onChange={(e) => onFiltersChange({ leadSource: e.target.value })}
              placeholder="Filter by lead source..."
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="vehicleType" className="text-sm font-medium">
              Vehicle Interest
            </Label>
            <Input
              id="vehicleType"
              value={filters.vehicleType}
              onChange={(e) => onFiltersChange({ vehicleType: e.target.value })}
              placeholder="Filter by vehicle type..."
              className="mt-1"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SearchFiltersSection;
