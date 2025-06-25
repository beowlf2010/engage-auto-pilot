
import React from 'react';
import { InboxFilters } from '@/hooks/useInboxFilters';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

interface DateSortSectionProps {
  filters: InboxFilters;
  onFiltersChange: (filters: Partial<InboxFilters>) => void;
}

const DateSortSection: React.FC<DateSortSectionProps> = ({
  filters,
  onFiltersChange
}) => {
  const dateRangeOptions = [
    { value: 'all', label: 'All Time' },
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' }
  ];

  const sortOptions = [
    { value: 'newest', label: 'Newest First' },
    { value: 'oldest', label: 'Oldest First' },
    { value: 'unread', label: 'Most Unread' },
    { value: 'activity', label: 'Most Active' }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Date & Sort</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-sm font-medium mb-2 block">Date Range</Label>
            <Select
              value={filters.dateRange}
              onValueChange={(value) => 
                onFiltersChange({ dateRange: value as InboxFilters['dateRange'] })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {dateRangeOptions.map(({ value, label }) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm font-medium mb-2 block">Sort By</Label>
            <Select
              value={filters.sortBy}
              onValueChange={(value) => 
                onFiltersChange({ sortBy: value as InboxFilters['sortBy'] })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sortOptions.map(({ value, label }) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DateSortSection;
