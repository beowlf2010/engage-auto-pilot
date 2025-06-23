
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X, Filter } from 'lucide-react';
import FilterStatusBanner from './FilterStatusBanner';

interface SmartFiltersProps {
  filters: {
    status: string[];
    aiOptIn: boolean | null;
    priority: string | null;
    assigned: string | null;
  };
  onFiltersChange: (filters: any) => void;
  conversations: any[];
  filteredConversations?: any[];
  hasActiveFilters?: boolean;
  filterSummary?: string[];
  onClearFilters?: () => void;
  userRole?: string;
}

const SmartFilters = ({ 
  filters, 
  onFiltersChange, 
  conversations, 
  filteredConversations = [],
  hasActiveFilters = false,
  filterSummary = [],
  onClearFilters,
  userRole
}: SmartFiltersProps) => {
  const updateFilter = (key: string, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value
    });
  };

  const clearFilters = () => {
    onFiltersChange({
      status: [],
      aiOptIn: null,
      priority: null,
      assigned: null
    });
    if (onClearFilters) onClearFilters();
  };

  const localHasActiveFilters = filters.status.length > 0 || filters.aiOptIn !== null || 
                                filters.priority !== null || filters.assigned !== null;

  const hiddenCount = conversations.length - filteredConversations.length;

  return (
    <div className="space-y-4">
      {/* Filter Status Banner */}
      <FilterStatusBanner
        hasActiveFilters={hasActiveFilters || localHasActiveFilters}
        filterSummary={filterSummary}
        hiddenCount={hiddenCount}
        totalCount={conversations.length}
        onClearFilters={onClearFilters || clearFilters}
        userRole={userRole}
      />

      <Card className="border-blue-200 bg-blue-50/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Smart Filters
            </CardTitle>
            {localHasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-3 w-3 mr-1" />
                Clear All
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-4 gap-4">
            {/* Lead Status Filter */}
            <div>
              <label className="text-xs font-medium text-slate-600 mb-2 block">Status</label>
              <Select onValueChange={(value) => updateFilter('status', value === 'all' ? [] : [value])}>
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="engaged">Engaged</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* AI Status Filter */}
            <div>
              <label className="text-xs font-medium text-slate-600 mb-2 block">AI Status</label>
              <Select onValueChange={(value) => updateFilter('aiOptIn', value === 'all' ? null : value === 'enabled')}>
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="All AI statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All AI statuses</SelectItem>
                  <SelectItem value="enabled">AI Enabled</SelectItem>
                  <SelectItem value="disabled">AI Disabled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Priority Filter */}
            <div>
              <label className="text-xs font-medium text-slate-600 mb-2 block">Priority</label>
              <Select onValueChange={(value) => updateFilter('priority', value === 'all' ? null : value)}>
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="All priorities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All priorities</SelectItem>
                  <SelectItem value="high">High Priority</SelectItem>
                  <SelectItem value="unread">Unread Messages</SelectItem>
                  <SelectItem value="responded">Recently Responded</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Assignment Filter */}
            <div>
              <label className="text-xs font-medium text-slate-600 mb-2 block">Assignment</label>
              <Select onValueChange={(value) => updateFilter('assigned', value === 'all' ? null : value)}>
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="All assignments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All assignments</SelectItem>
                  <SelectItem value="assigned">Assigned</SelectItem>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  <SelectItem value="mine">My Leads</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Active Filter Tags */}
          {localHasActiveFilters && (
            <div className="flex items-center gap-2 mt-4 pt-3 border-t">
              <span className="text-xs text-slate-600">Active filters:</span>
              {filters.aiOptIn !== null && (
                <Badge variant="secondary" className="text-xs">
                  AI: {filters.aiOptIn ? 'Enabled' : 'Disabled'}
                  <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => updateFilter('aiOptIn', null)} />
                </Badge>
              )}
              {filters.priority && (
                <Badge variant="secondary" className="text-xs">
                  Priority: {filters.priority}
                  <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => updateFilter('priority', null)} />
                </Badge>
              )}
              {filters.assigned && (
                <Badge variant="secondary" className="text-xs">
                  Assignment: {filters.assigned}
                  <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => updateFilter('assigned', null)} />
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SmartFilters;
