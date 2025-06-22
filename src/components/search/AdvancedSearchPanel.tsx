
import React, { useState, useCallback } from 'react';
import { Search, Filter, Calendar, Tag, MessageSquare, Clock, AlertCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAdvancedMessageSearch } from '@/hooks/useAdvancedMessageSearch';

interface AdvancedSearchPanelProps {
  onClose?: () => void;
  compact?: boolean;
}

const AdvancedSearchPanel: React.FC<AdvancedSearchPanelProps> = ({
  onClose,
  compact = false
}) => {
  const {
    query,
    results,
    isSearching,
    suggestions,
    recentSearches,
    filters,
    searchStats,
    availableCategories,
    performSearch,
    getSuggestions,
    filterByCategory,
    filterByDateRange,
    filterByDirection,
    clearSearch
  } = useAdvancedMessageSearch();

  const [showFilters, setShowFilters] = useState(false);
  const [searchInput, setSearchInput] = useState(query);

  const handleSearch = useCallback((searchQuery: string) => {
    performSearch(searchQuery, filters);
  }, [performSearch, filters]);

  const handleInputChange = useCallback((value: string) => {
    setSearchInput(value);
    if (value.length > 1) {
      getSuggestions(value);
    }
  }, [getSuggestions]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch(searchInput);
    }
  }, [handleSearch, searchInput]);

  const handleCategoryFilter = useCallback((categoryId: string) => {
    const currentCategories = filters.categories || [];
    const newCategories = currentCategories.includes(categoryId)
      ? currentCategories.filter(id => id !== categoryId)
      : [...currentCategories, categoryId];
    
    filterByCategory(newCategories);
  }, [filters.categories, filterByCategory]);

  const handleDateFilter = useCallback((range: 'today' | 'week' | 'month' | 'custom') => {
    const now = new Date();
    let start: Date, end: Date;

    switch (range) {
      case 'today':
        start = new Date(now.setHours(0, 0, 0, 0));
        end = new Date(now.setHours(23, 59, 59, 999));
        break;
      case 'week':
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        end = new Date();
        break;
      case 'month':
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        end = new Date();
        break;
      default:
        return; // Handle custom range separately
    }

    filterByDateRange({ start, end });
  }, [filterByDateRange]);

  if (compact) {
    return (
      <div className="space-y-3">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            value={searchInput}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Search conversations..."
            className="pl-10 pr-4"
          />
          {isSearching && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
            </div>
          )}
        </div>

        {/* Quick Filters */}
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-3 w-3 mr-1" />
            Filters
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDateFilter('today')}
          >
            Today
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => filterByDirection('in')}
          >
            Incoming
          </Button>
        </div>

        {/* Search Stats */}
        {results.length > 0 && (
          <div className="text-sm text-gray-600">
            {searchStats.totalResults} results
            {searchStats.urgentResults > 0 && (
              <span className="text-red-600 ml-2">
                • {searchStats.urgentResults} urgent
              </span>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Advanced Message Search
          </CardTitle>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              ×
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Main Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            value={searchInput}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Search conversations, messages, and content..."
            className="pl-10 pr-12 h-12 text-lg"
          />
          <Button
            onClick={() => handleSearch(searchInput)}
            disabled={isSearching}
            className="absolute right-2 top-1/2 transform -translate-y-1/2"
            size="sm"
          >
            {isSearching ? (
              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
            ) : (
              'Search'
            )}
          </Button>
        </div>

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">Suggestions:</p>
            <div className="flex gap-2 flex-wrap">
              {suggestions.map((suggestion, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchInput(suggestion);
                    handleSearch(suggestion);
                  }}
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Recent Searches */}
        {recentSearches.length > 0 && !query && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">Recent searches:</p>
            <div className="flex gap-2 flex-wrap">
              {recentSearches.slice(0, 5).map((search, index) => (
                <Button
                  key={index}
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchInput(search);
                    handleSearch(search);
                  }}
                  className="text-blue-600 hover:text-blue-800"
                >
                  <Clock className="h-3 w-3 mr-1" />
                  {search}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="space-y-4">
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="w-full justify-center"
          >
            <Filter className="h-4 w-4 mr-2" />
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </Button>

          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
              {/* Date Range Filter */}
              <div className="space-y-2">
                <p className="text-sm font-medium">Date Range</p>
                <div className="space-y-1">
                  {['today', 'week', 'month'].map((range) => (
                    <Button
                      key={range}
                      variant="outline"
                      size="sm"
                      onClick={() => handleDateFilter(range as any)}
                      className="w-full justify-start"
                    >
                      <Calendar className="h-3 w-3 mr-2" />
                      {range.charAt(0).toUpperCase() + range.slice(1)}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Direction Filter */}
              <div className="space-y-2">
                <p className="text-sm font-medium">Message Direction</p>
                <div className="space-y-1">
                  {[
                    { value: 'both', label: 'All Messages' },
                    { value: 'in', label: 'Incoming' },
                    { value: 'out', label: 'Outgoing' }
                  ].map((option) => (
                    <Button
                      key={option.value}
                      variant={filters.direction === option.value ? "default" : "outline"}
                      size="sm"
                      onClick={() => filterByDirection(option.value as any)}
                      className="w-full justify-start"
                    >
                      <MessageSquare className="h-3 w-3 mr-2" />
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Category Filter */}
              <div className="space-y-2">
                <p className="text-sm font-medium">Categories</p>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {availableCategories.map((category) => (
                    <Button
                      key={category.id}
                      variant={filters.categories?.includes(category.id) ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleCategoryFilter(category.id)}
                      className="w-full justify-start"
                    >
                      <span className="mr-2">{category.icon}</span>
                      {category.name}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Search Results Summary */}
        {results.length > 0 && (
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium">Search Results</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearSearch}
                className="text-gray-500"
              >
                Clear
              </Button>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="text-center">
                <div className="font-semibold text-lg text-blue-600">
                  {searchStats.totalResults}
                </div>
                <div className="text-gray-600">Total Results</div>
              </div>
              
              <div className="text-center">
                <div className="font-semibold text-lg text-green-600">
                  {searchStats.categorizedResults}
                </div>
                <div className="text-gray-600">Categorized</div>
              </div>
              
              <div className="text-center">
                <div className="font-semibold text-lg text-purple-600">
                  {searchStats.threadedResults}
                </div>
                <div className="text-gray-600">In Threads</div>
              </div>
              
              {searchStats.urgentResults > 0 && (
                <div className="text-center">
                  <div className="font-semibold text-lg text-red-600 flex items-center justify-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    {searchStats.urgentResults}
                  </div>
                  <div className="text-gray-600">Urgent</div>
                </div>
              )}
            </div>

            {/* Active Filters */}
            {(filters.categories?.length || filters.direction || filters.dateRange) && (
              <div className="mt-3 pt-3 border-t border-blue-200">
                <p className="text-sm font-medium mb-2">Active Filters:</p>
                <div className="flex gap-2 flex-wrap">
                  {filters.categories?.map(categoryId => {
                    const category = availableCategories.find(c => c.id === categoryId);
                    return category ? (
                      <Badge key={categoryId} variant="secondary">
                        <Tag className="h-3 w-3 mr-1" />
                        {category.name}
                      </Badge>
                    ) : null;
                  })}
                  
                  {filters.direction && filters.direction !== 'both' && (
                    <Badge variant="secondary">
                      <MessageSquare className="h-3 w-3 mr-1" />
                      {filters.direction === 'in' ? 'Incoming' : 'Outgoing'}
                    </Badge>
                  )}
                  
                  {filters.dateRange && (
                    <Badge variant="secondary">
                      <Calendar className="h-3 w-3 mr-1" />
                      Date Range
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AdvancedSearchPanel;
