import React, { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { 
  ChevronDown, 
  ChevronUp, 
  CheckSquare, 
  Square,
  Minus
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface BulkSelectionControlsProps {
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onSelectNone: () => void;
  onSelectPage: () => void;
  currentPageCount: number;
  className?: string;
}

const BulkSelectionControls = ({
  selectedCount,
  totalCount,
  onSelectAll,
  onSelectNone,
  onSelectPage,
  currentPageCount,
  className
}: BulkSelectionControlsProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const isAllSelected = selectedCount === totalCount && totalCount > 0;
  const isPartialSelected = selectedCount > 0 && selectedCount < totalCount;
  const isPageSelected = selectedCount === currentPageCount && currentPageCount > 0;

  const getCheckboxState = () => {
    if (isAllSelected) return 'checked';
    if (isPartialSelected) return 'indeterminate';
    return 'unchecked';
  };

  return (
    <div className={cn("flex items-center space-x-3", className)}>
      {/* Main Selection Checkbox */}
      <div className="flex items-center space-x-2">
        <Checkbox
          checked={getCheckboxState() === 'checked'}
          onCheckedChange={(checked) => {
            if (checked) {
              onSelectAll();
            } else {
              onSelectNone();
            }
          }}
          className={cn(
            "data-[state=indeterminate]:bg-primary data-[state=indeterminate]:text-primary-foreground",
            getCheckboxState() === 'indeterminate' && "bg-primary text-primary-foreground"
          )}
        />
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1 h-auto"
        >
          {isExpanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </Button>

        <span className="text-sm text-muted-foreground">
          {selectedCount === 0 
            ? "Select leads" 
            : `${selectedCount} of ${totalCount} selected`}
        </span>
      </div>

      {/* Expanded Selection Options */}
      {isExpanded && (
        <div className="flex items-center space-x-2 ml-4 pl-4 border-l border-border">
          <Button
            variant="ghost"
            size="sm"
            onClick={onSelectAll}
            disabled={isAllSelected}
            className="h-7 px-2 text-xs"
          >
            <CheckSquare className="w-3 h-3 mr-1" />
            All ({totalCount})
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={onSelectPage}
            disabled={isPageSelected}
            className="h-7 px-2 text-xs"
          >
            <Minus className="w-3 h-3 mr-1" />
            Page ({currentPageCount})
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={onSelectNone}
            disabled={selectedCount === 0}
            className="h-7 px-2 text-xs"
          >
            <Square className="w-3 h-3 mr-1" />
            None
          </Button>
        </div>
      )}
    </div>
  );
};

export default BulkSelectionControls;