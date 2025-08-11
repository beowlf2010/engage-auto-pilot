
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface ActiveFilterTagsProps {
  filterSummary: string[];
  hasActiveFilters: boolean;
  onClearFilters: () => void;
}

const ActiveFilterTags: React.FC<ActiveFilterTagsProps> = ({
  filterSummary,
  hasActiveFilters,
  onClearFilters
}) => {
  if (!hasActiveFilters || filterSummary.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 p-2 rounded-md border">
      <span className="text-xs font-medium">Active Filters:</span>
      <div className="flex flex-wrap gap-1">
        {filterSummary.map((filter, index) => (
          <Badge
            key={index}
            variant="secondary"
            className="text-[10px]"
          >
            {filter}
          </Badge>
        ))}
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={onClearFilters}
        className="ml-auto"
      >
        <X className="h-3 w-3 mr-1" />
        Clear All
      </Button>
    </div>
  );
};

export default ActiveFilterTags;
