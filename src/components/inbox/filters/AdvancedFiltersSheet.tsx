
import React from 'react';
import { InboxFilters } from '@/hooks/useInboxFilters';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import QuickFiltersSection from './QuickFiltersSection';
import AdvancedFiltersSection from './AdvancedFiltersSection';
import SearchFiltersSection from './SearchFiltersSection';
import DateSortSection from './DateSortSection';

interface AdvancedFiltersSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: InboxFilters;
  onFiltersChange: (filters: Partial<InboxFilters>) => void;
  onClearFilters: () => void;
}

const AdvancedFiltersSheet: React.FC<AdvancedFiltersSheetProps> = ({
  open,
  onOpenChange,
  filters,
  onFiltersChange,
  onClearFilters,
}) => {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>Filters</SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-4 overflow-y-auto pr-1">
          <QuickFiltersSection filters={filters} onFiltersChange={onFiltersChange} />
          <AdvancedFiltersSection filters={filters} onFiltersChange={onFiltersChange} />
          <SearchFiltersSection filters={filters} onFiltersChange={onFiltersChange} />
          <DateSortSection filters={filters} onFiltersChange={onFiltersChange} />
        </div>

        <SheetFooter className="mt-4">
          <div className="flex w-full items-center justify-between gap-2">
            <Button variant="outline" onClick={onClearFilters}>Clear all</Button>
            <Button onClick={() => onOpenChange(false)}>Apply & Close</Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};

export default AdvancedFiltersSheet;
