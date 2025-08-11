
import React from 'react';
import { InboxFilters } from '@/hooks/useInboxFilters';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface CompactFiltersBarProps {
  filters: InboxFilters;
  onFiltersChange: (filters: Partial<InboxFilters>) => void;
  onOpenAdvanced: () => void;
  hasActiveFilters: boolean;
  filterSummary: string[];
  onClearFilters: () => void;
}

const dateRangeOptions = [
  { value: 'all', label: 'All time' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This week' },
  { value: 'month', label: 'This month' },
] as const;

const sortOptions = [
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'unread', label: 'Unread first' },
  { value: 'activity', label: 'Recent activity' },
] as const;

const CompactFiltersBar: React.FC<CompactFiltersBarProps> = ({
  filters,
  onFiltersChange,
  onOpenAdvanced,
  hasActiveFilters,
  filterSummary,
  onClearFilters,
}) => {
  const activeCount = filterSummary.length;

  return (
    <div className="flex flex-wrap items-center gap-2 md:gap-3">
      {/* Date Range */}
      <div className="min-w-[160px]">
        <Select
          value={filters.dateRange}
          onValueChange={(val) => onFiltersChange({ dateRange: val as InboxFilters['dateRange'] })}
        >
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Date range" />
          </SelectTrigger>
          <SelectContent className="z-50">
            {dateRangeOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Sort By */}
      <div className="min-w-[160px]">
        <Select
          value={filters.sortBy}
          onValueChange={(val) => onFiltersChange({ sortBy: val as InboxFilters['sortBy'] })}
        >
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent className="z-50">
            {sortOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="ml-auto flex items-center gap-2">
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={onClearFilters}>
            Clear
          </Button>
        )}
        <Button variant="secondary" size="sm" onClick={onOpenAdvanced}>
          Filters{activeCount > 0 ? ` (${activeCount})` : ''}
        </Button>
      </div>
    </div>
  );
};

export default CompactFiltersBar;
