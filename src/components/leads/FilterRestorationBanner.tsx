
import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { RotateCcw, X } from 'lucide-react';

interface FilterRestorationBannerProps {
  onClearFilters: () => void;
  filtersCount: number;
}

const FilterRestorationBanner: React.FC<FilterRestorationBannerProps> = ({
  onClearFilters,
  filtersCount
}) => {
  return (
    <Alert className="mb-4 bg-blue-50 border-blue-200">
      <RotateCcw className="h-4 w-4 text-blue-600" />
      <AlertDescription className="flex items-center justify-between">
        <span className="text-blue-800">
          Restored {filtersCount} saved filter{filtersCount !== 1 ? 's' : ''} from your last session
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearFilters}
          className="text-blue-600 hover:text-blue-800 hover:bg-blue-100"
        >
          <X className="h-3 w-3 mr-1" />
          Clear All
        </Button>
      </AlertDescription>
    </Alert>
  );
};

export default FilterRestorationBanner;
