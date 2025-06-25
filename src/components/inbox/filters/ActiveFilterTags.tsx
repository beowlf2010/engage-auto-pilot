
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
    <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
      <span className="text-sm font-medium text-blue-800">Active Filters:</span>
      <div className="flex flex-wrap gap-1">
        {filterSummary.map((filter, index) => (
          <Badge
            key={index}
            variant="secondary"
            className="text-xs bg-blue-100 text-blue-800 border-blue-200"
          >
            {filter}
          </Badge>
        ))}
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={onClearFilters}
        className="ml-auto text-blue-700 hover:bg-blue-100"
      >
        <X className="h-3 w-3 mr-1" />
        Clear All
      </Button>
    </div>
  );
};

export default ActiveFilterTags;
