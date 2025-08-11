
import React from 'react';
import { InboxFilters } from '@/hooks/useInboxFilters';
import { ConversationListItem } from '@/types/conversation';
import ActiveFilterTags from './filters/ActiveFilterTags';
import CompactFiltersBar from './filters/CompactFiltersBar';
import AdvancedFiltersSheet from './filters/AdvancedFiltersSheet';

interface SmartFiltersProps {
  filters: InboxFilters;
  onFiltersChange: (filters: Partial<InboxFilters>) => void;
  conversations: ConversationListItem[];
  filteredConversations: ConversationListItem[];
  hasActiveFilters: boolean;
  filterSummary: string[];
  onClearFilters: () => void;
  userRole?: string;
}

const SmartFilters: React.FC<SmartFiltersProps> = ({
  filters,
  onFiltersChange,
  conversations,
  filteredConversations,
  hasActiveFilters,
  filterSummary,
  onClearFilters,
  userRole
}) => {
  const [open, setOpen] = React.useState(false);

  return (
    <div className="space-y-3">
      <CompactFiltersBar
        filters={filters}
        onFiltersChange={onFiltersChange}
        onOpenAdvanced={() => setOpen(true)}
        hasActiveFilters={hasActiveFilters}
        filterSummary={filterSummary}
        onClearFilters={onClearFilters}
      />

      <ActiveFilterTags
        filterSummary={filterSummary}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={onClearFilters}
      />

      <AdvancedFiltersSheet
        open={open}
        onOpenChange={setOpen}
        filters={filters}
        onFiltersChange={onFiltersChange}
        onClearFilters={onClearFilters}
      />
    </div>
  );
};

export default SmartFilters;
