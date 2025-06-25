
import React from 'react';
import { InboxFilters } from '@/hooks/useInboxFilters';
import { ConversationListItem } from '@/types/conversation';
import QuickFiltersSection from './filters/QuickFiltersSection';
import AdvancedFiltersSection from './filters/AdvancedFiltersSection';
import SearchFiltersSection from './filters/SearchFiltersSection';
import DateSortSection from './filters/DateSortSection';
import ActiveFilterTags from './filters/ActiveFilterTags';
import FilterStatusBanner from './FilterStatusBanner';

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
  const hiddenCount = conversations.length - filteredConversations.length;

  return (
    <div className="space-y-4">
      <FilterStatusBanner
        hasActiveFilters={hasActiveFilters}
        filterSummary={filterSummary}
        hiddenCount={hiddenCount}
        totalCount={conversations.length}
        onClearFilters={onClearFilters}
        userRole={userRole}
      />

      <QuickFiltersSection
        filters={filters}
        onFiltersChange={onFiltersChange}
      />

      <AdvancedFiltersSection
        filters={filters}
        onFiltersChange={onFiltersChange}
      />

      <SearchFiltersSection
        filters={filters}
        onFiltersChange={onFiltersChange}
      />

      <DateSortSection
        filters={filters}
        onFiltersChange={onFiltersChange}
      />

      <ActiveFilterTags
        filterSummary={filterSummary}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={onClearFilters}
      />
    </div>
  );
};

export default SmartFilters;
