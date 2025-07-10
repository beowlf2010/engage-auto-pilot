import React, { useState, useRef, useEffect } from 'react';
import { Search, X, Filter, Bookmark, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { useUnifiedSearch, SearchResult } from './UnifiedSearchProvider';
import { SearchFilterPanel } from './SearchFilterPanel';
import { SearchPresetManager } from './SearchPresetManager';
import { SearchResultCard } from './SearchResultCard';

interface SmartSearchBarProps {
  placeholder?: string;
  showFilters?: boolean;
  showPresets?: boolean;
  onResultSelect?: (result: SearchResult) => void;
  className?: string;
}

export const SmartSearchBar: React.FC<SmartSearchBarProps> = ({
  placeholder = "Search leads, conversations, inventory...",
  showFilters = true,
  showPresets = true,
  onResultSelect,
  className = "",
}) => {
  const {
    searchTerm,
    setSearchTerm,
    activeFilters,
    results,
    isSearching,
    totalResults,
    clearAllFilters,
  } = useUnifiedSearch();

  const [isOpen, setIsOpen] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [showPresetPanel, setShowPresetPanel] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // Auto-focus on mount
  useEffect(() => {
    if (searchRef.current) {
      searchRef.current.focus();
    }
  }, []);

  // Open results when there's a search term or filters
  useEffect(() => {
    setIsOpen(searchTerm.length > 0 || activeFilters.length > 0);
  }, [searchTerm, activeFilters]);

  const handleResultSelect = (result: SearchResult) => {
    setIsOpen(false);
    onResultSelect?.(result);
    
    // Navigate to the appropriate page based on result type
    const routes = {
      lead: `/leads/${result.id}`,
      conversation: `/conversations`,
      inventory: `/inventory`,
      appointment: `/appointments`,
    };
    
    const route = routes[result.type];
    if (route) {
      window.location.hash = route;
    }
  };

  const handleClearAll = () => {
    clearAllFilters();
    setIsOpen(false);
  };

  const getResultTypeColor = (type: SearchResult['type']) => {
    const colors = {
      lead: 'bg-blue-100 text-blue-800',
      conversation: 'bg-green-100 text-green-800',
      inventory: 'bg-purple-100 text-purple-800',
      appointment: 'bg-orange-100 text-orange-800',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className={`relative w-full max-w-2xl ${className}`}>
      {/* Main Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={searchRef}
          type="text"
          placeholder={placeholder}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 pr-20 h-12 text-base"
          onFocus={() => setIsOpen(true)}
        />
        
        {/* Action Buttons */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {showFilters && (
            <Popover open={showFilterPanel} onOpenChange={setShowFilterPanel}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`h-8 w-8 p-0 ${activeFilters.length > 0 ? 'text-primary' : 'text-muted-foreground'}`}
                >
                  <Filter className="h-4 w-4" />
                  {activeFilters.length > 0 && (
                    <Badge variant="secondary" className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                      {activeFilters.length}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0" align="end">
                <SearchFilterPanel onClose={() => setShowFilterPanel(false)} />
              </PopoverContent>
            </Popover>
          )}
          
          {showPresets && (
            <Popover open={showPresetPanel} onOpenChange={setShowPresetPanel}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground">
                  <Bookmark className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0" align="end">
                <SearchPresetManager onClose={() => setShowPresetPanel(false)} />
              </PopoverContent>
            </Popover>
          )}
          
          {(searchTerm || activeFilters.length > 0) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearAll}
              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Active Filters Display */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {activeFilters.map(filter => (
            <Badge key={filter.id} variant="secondary" className="text-xs">
              {filter.label}: {String(filter.value)}
            </Badge>
          ))}
        </div>
      )}

      {/* Search Results Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-lg shadow-lg z-50 max-h-96 overflow-hidden">
          {isSearching ? (
            <div className="p-4 text-center text-muted-foreground">
              <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2" />
              Searching...
            </div>
          ) : results.length > 0 ? (
            <>
              {/* Results Header */}
              <div className="p-3 border-b bg-muted/30">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {totalResults} result{totalResults !== 1 ? 's' : ''} found
                  </span>
                  <div className="flex items-center gap-2">
                    {['lead', 'conversation', 'inventory', 'appointment'].map(type => {
                      const count = results.filter(r => r.type === type).length;
                      if (count === 0) return null;
                      return (
                        <Badge key={type} variant="outline" className={`text-xs ${getResultTypeColor(type as SearchResult['type'])}`}>
                          {type}: {count}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Results List */}
              <ScrollArea className="max-h-80">
                <div className="p-2 space-y-1">
                  {results.map((result) => (
                    <SearchResultCard
                      key={`${result.type}-${result.id}`}
                      result={result}
                      onSelect={handleResultSelect}
                      searchTerm={searchTerm}
                    />
                  ))}
                </div>
              </ScrollArea>
            </>
          ) : (searchTerm || activeFilters.length > 0) ? (
            <div className="p-8 text-center text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No results found</p>
              <p className="text-xs mt-1">Try adjusting your search terms or filters</p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};