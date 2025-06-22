
import React, { useState, useCallback } from 'react';
import { Search, Filter, X, Clock, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface UnifiedSearchBarProps {
  searchQuery: string;
  onSearch: (query: string) => void;
  onClearSearch: () => void;
  isSearching?: boolean;
  recentSearches?: string[];
  searchResultsCount?: number;
  onShowAdvancedSearch?: () => void;
}

const UnifiedSearchBar: React.FC<UnifiedSearchBarProps> = ({
  searchQuery,
  onSearch,
  onClearSearch,
  isSearching = false,
  recentSearches = [],
  searchResultsCount = 0,
  onShowAdvancedSearch
}) => {
  const [localQuery, setLocalQuery] = useState(searchQuery);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const handleSearch = useCallback(() => {
    onSearch(localQuery);
    setShowSuggestions(false);
  }, [localQuery, onSearch]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  }, [handleSearch]);

  const handleClear = useCallback(() => {
    setLocalQuery('');
    onClearSearch();
    setShowSuggestions(false);
  }, [onClearSearch]);

  return (
    <div className="relative w-full">
      <div className="flex items-center gap-2">
        {/* Main search input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            value={localQuery}
            onChange={(e) => {
              setLocalQuery(e.target.value);
              setShowSuggestions(e.target.value.length > 0 && recentSearches.length > 0);
            }}
            onKeyPress={handleKeyPress}
            onFocus={() => setShowSuggestions(localQuery.length === 0 && recentSearches.length > 0)}
            placeholder="Search conversations, messages..."
            className="pl-10 pr-12"
          />
          
          {localQuery && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
          
          {isSearching && (
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
              <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
            </div>
          )}
        </div>

        {/* Search button */}
        <Button
          onClick={handleSearch}
          disabled={isSearching || !localQuery.trim()}
          size="sm"
        >
          Search
        </Button>

        {/* Advanced search toggle */}
        <Button
          variant="outline"
          size="sm"
          onClick={onShowAdvancedSearch}
        >
          <Filter className="h-4 w-4" />
        </Button>
      </div>

      {/* Search results count */}
      {searchQuery && (
        <div className="mt-2 text-sm text-gray-600">
          {searchResultsCount > 0 ? (
            <span>{searchResultsCount} results found</span>
          ) : (
            <span>No results found</span>
          )}
        </div>
      )}

      {/* Recent searches dropdown */}
      {showSuggestions && recentSearches.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-50 bg-white border border-gray-200 rounded-lg shadow-lg mt-1 p-2">
          <div className="text-xs font-medium text-gray-500 mb-2">Recent searches</div>
          {recentSearches.slice(0, 5).map((search, index) => (
            <button
              key={index}
              onClick={() => {
                setLocalQuery(search);
                onSearch(search);
                setShowSuggestions(false);
              }}
              className="w-full text-left px-2 py-1 text-sm hover:bg-gray-100 rounded flex items-center gap-2"
            >
              <Clock className="h-3 w-3 text-gray-400" />
              {search}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default UnifiedSearchBar;
