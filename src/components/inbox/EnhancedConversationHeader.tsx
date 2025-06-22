
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  LayoutGrid, 
  List, 
  MessageSquare, 
  SortAsc, 
  SortDesc,
  Settings,
  Bookmark
} from 'lucide-react';
import UnifiedSearchBar from './UnifiedSearchBar';
import QuickFilters from './QuickFilters';
import AdvancedSearchPanel from '../search/AdvancedSearchPanel';

interface EnhancedConversationHeaderProps {
  totalCount: number;
  filteredCount: number;
  viewMode: 'list' | 'grid' | 'thread';
  onViewModeChange: (mode: 'list' | 'grid' | 'thread') => void;
  sortOrder: 'newest' | 'oldest' | 'priority';
  onSortChange: (order: 'newest' | 'oldest' | 'priority') => void;
  searchQuery: string;
  onSearch: (query: string) => void;
  onClearSearch: () => void;
  isSearching?: boolean;
  recentSearches?: string[];
  activeFilters: Set<string>;
  onFilterToggle: (filterId: string) => void;
  urgentCount?: number;
  unreadCount?: number;
  actionRequiredCount?: number;
  aiGeneratedCount?: number;
}

const EnhancedConversationHeader: React.FC<EnhancedConversationHeaderProps> = ({
  totalCount,
  filteredCount,
  viewMode,
  onViewModeChange,
  sortOrder,
  onSortChange,
  searchQuery,
  onSearch,
  onClearSearch,
  isSearching,
  recentSearches,
  activeFilters,
  onFilterToggle,
  urgentCount,
  unreadCount,
  actionRequiredCount,
  aiGeneratedCount
}) => {
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);

  const viewModeButtons = [
    { mode: 'list' as const, icon: List, label: 'List View' },
    { mode: 'grid' as const, icon: LayoutGrid, label: 'Grid View' },
    { mode: 'thread' as const, icon: MessageSquare, label: 'Thread View' }
  ];

  const sortOptions = [
    { value: 'newest' as const, label: 'Newest First', icon: SortDesc },
    { value: 'oldest' as const, label: 'Oldest First', icon: SortAsc },
    { value: 'priority' as const, label: 'Priority', icon: Bookmark }
  ];

  return (
    <div className="space-y-4 p-4 bg-white border-b border-gray-200">
      {/* Header with counts and controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold">
            Conversations
          </h2>
          <div className="text-sm text-gray-600">
            {filteredCount !== totalCount ? (
              <span>{filteredCount} of {totalCount}</span>
            ) : (
              <span>{totalCount} total</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* View mode toggles */}
          <div className="flex border border-gray-200 rounded-lg overflow-hidden">
            {viewModeButtons.map(({ mode, icon: Icon, label }) => (
              <Button
                key={mode}
                variant={viewMode === mode ? "default" : "ghost"}
                size="sm"
                onClick={() => onViewModeChange(mode)}
                className="rounded-none border-0"
                title={label}
              >
                <Icon className="h-4 w-4" />
              </Button>
            ))}
          </div>

          {/* Sort dropdown */}
          <select
            value={sortOrder}
            onChange={(e) => onSortChange(e.target.value as any)}
            className="px-3 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {sortOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {/* Settings */}
          <Button variant="ghost" size="sm">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Search bar */}
      <UnifiedSearchBar
        searchQuery={searchQuery}
        onSearch={onSearch}
        onClearSearch={onClearSearch}
        isSearching={isSearching}
        recentSearches={recentSearches}
        searchResultsCount={filteredCount}
        onShowAdvancedSearch={() => setShowAdvancedSearch(true)}
      />

      {/* Quick filters */}
      <QuickFilters
        activeFilters={activeFilters}
        onFilterToggle={onFilterToggle}
        urgentCount={urgentCount}
        unreadCount={unreadCount}
        actionRequiredCount={actionRequiredCount}
        aiGeneratedCount={aiGeneratedCount}
      />

      {/* Advanced search modal */}
      {showAdvancedSearch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <AdvancedSearchPanel
              onClose={() => setShowAdvancedSearch(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedConversationHeader;
