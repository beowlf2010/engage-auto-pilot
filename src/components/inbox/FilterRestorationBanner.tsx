
import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { RotateCcw, X } from 'lucide-react';

interface FilterRestorationBannerProps {
  isRestored: boolean;
  onClearFilters: () => void;
  onDismiss: () => void;
}

const FilterRestorationBanner: React.FC<FilterRestorationBannerProps> = ({
  isRestored,
  onClearFilters,
  onDismiss
}) => {
  if (!isRestored) return null;

  return (
    <Alert className="bg-blue-50 border-blue-200 mb-4">
      <RotateCcw className="h-4 w-4 text-blue-600" />
      <AlertDescription className="flex items-center justify-between">
        <span className="text-blue-800">
          Your previous filter settings have been restored automatically.
        </span>
        <div className="flex items-center gap-2 ml-4">
          <Button
            variant="outline"
            size="sm"
            onClick={onClearFilters}
            className="text-blue-700 border-blue-300 hover:bg-blue-100"
          >
            Clear Filters
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDismiss}
            className="text-blue-600 hover:bg-blue-100"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
};

export default FilterRestorationBanner;
