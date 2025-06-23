
import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Filter, AlertTriangle } from 'lucide-react';

interface FilterStatusBannerProps {
  hasActiveFilters: boolean;
  filterSummary: string[];
  hiddenCount: number;
  totalCount: number;
  onClearFilters: () => void;
  userRole?: string;
}

const FilterStatusBanner: React.FC<FilterStatusBannerProps> = ({
  hasActiveFilters,
  filterSummary,
  hiddenCount,
  totalCount,
  onClearFilters,
  userRole
}) => {
  if (!hasActiveFilters && hiddenCount === 0) return null;

  const isAdmin = userRole === 'admin' || userRole === 'manager';

  return (
    <div className="bg-blue-50 border-l-4 border-blue-400 p-3 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-800">
              {hasActiveFilters ? 'Filters Active' : 'All Conversations'}
            </span>
            {isAdmin && (
              <Badge variant="outline" className="bg-purple-100 text-purple-700 border-purple-300">
                Admin View
              </Badge>
            )}
          </div>
          
          {hiddenCount > 0 && (
            <div className="flex items-center gap-1 text-orange-600">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm font-medium">
                {hiddenCount} conversation{hiddenCount !== 1 ? 's' : ''} hidden by filters
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-blue-700">
            Showing {totalCount - hiddenCount} of {totalCount}
          </span>
          
          {hasActiveFilters && (
            <Button
              onClick={onClearFilters}
              variant="outline"
              size="sm"
              className="text-blue-700 border-blue-300 hover:bg-blue-100"
            >
              <X className="h-3 w-3 mr-1" />
              Clear All Filters
            </Button>
          )}
        </div>
      </div>

      {/* Active filters summary */}
      {filterSummary.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {filterSummary.map((filter, index) => (
            <Badge
              key={index}
              variant="secondary"
              className="text-xs bg-blue-100 text-blue-800"
            >
              {filter}
            </Badge>
          ))}
        </div>
      )}

      {/* Admin notice for hidden conversations */}
      {isAdmin && hiddenCount > 0 && (
        <div className="mt-2 text-xs text-blue-600">
          💡 As an admin, you can see all conversations including unassigned leads when filters are cleared
        </div>
      )}
    </div>
  );
};

export default FilterStatusBanner;
