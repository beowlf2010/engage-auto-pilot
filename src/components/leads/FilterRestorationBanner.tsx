
import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, X } from 'lucide-react';

interface FilterRestorationBannerProps {
  onClearFilters: () => void;
  filtersCount: number;
}

const FilterRestorationBanner: React.FC<FilterRestorationBannerProps> = ({
  onClearFilters,
  filtersCount
}) => {
  return (
    <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-3">
      <div className="flex items-center space-x-2">
        <AlertCircle className="h-4 w-4 text-blue-600" />
        <span className="text-sm text-blue-800">
          Restored previous search filters
        </span>
        <Badge variant="secondary" className="bg-blue-100 text-blue-700">
          {filtersCount} active
        </Badge>
      </div>
      
      <Button
        variant="outline"
        size="sm"
        onClick={onClearFilters}
        className="border-blue-300 text-blue-700 hover:bg-blue-100"
      >
        <X className="h-4 w-4 mr-1" />
        Clear All Filters
      </Button>
    </div>
  );
};

export default FilterRestorationBanner;
