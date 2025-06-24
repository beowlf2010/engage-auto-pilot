
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { X, Filter } from 'lucide-react';
import FilterStatusBanner from './FilterStatusBanner';
import type { InboxFilters } from '@/hooks/useInboxFilters';

interface SmartFiltersProps {
  filters: InboxFilters;
  onFiltersChange: (filters: InboxFilters) => void;
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
  const updateFilter = <K extends keyof InboxFilters>(key: K, value: InboxFilters[K]) => {
    const newFilters = { ...filters, [key]: value };
    onFiltersChange(newFilters);
  };

  const clearAllFilters = () => {
    const clearedFilters: InboxFilters = {
      unreadOnly: false,
      assignedToMe: false,
      unassigned: false,
      lostLeads: false,
      aiPaused: false,
      dateRange: 'all',
      leadSource: '',
      vehicleType: '',
      sortBy: 'newest',
      status: [],
      aiOptIn: null,
      priority: null,
      assigned: null,
      messageDirection: null,
    };
    
    onFiltersChange(clearedFilters);
    if (onClearFilters) onClearFilters();
  };

  const localHasActiveFilters = hasActiveFilters || Object.keys(filters).some(key => {
    const filterKey = key as keyof InboxFilters;
    if (filterKey === 'sortBy') return filters[filterKey] !== 'newest';
    if (filterKey === 'dateRange') return filters[filterKey] !== 'all';
    if (filterKey === 'leadSource' || filterKey === 'vehicleType') return filters[filterKey] !== '';
    if (filterKey === 'status') return (filters[filterKey] as string[]).length > 0;
    if (filterKey === 'aiOptIn' || filterKey === 'priority' || filterKey === 'assigned' || filterKey === 'messageDirection') {
      return filters[filterKey] !== null;
    }
    return filters[filterKey] === true;
  });

  const hiddenCount = conversations.length - filteredConversations.length;

  return (
    <div className="space-y-4">
      {/* Filter Status Banner */}
      <FilterStatusBanner
        hasActiveFilters={localHasActiveFilters}
        filterSummary={filterSummary}
        hiddenCount={hiddenCount}
        totalCount={conversations.length}
        onClearFilters={onClearFilters || clearAllFilters}
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
              <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                <X className="h-3 w-3 mr-1" />
                Clear All
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0 space-y-6">
          {/* Quick Toggle Filters */}
          <div>
            <h4 className="text-xs font-medium text-slate-600 mb-3">Quick Filters</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="unreadOnly"
                  checked={filters.unreadOnly}
                  onCheckedChange={(checked) => updateFilter('unreadOnly', checked)}
                />
                <Label htmlFor="unreadOnly" className="text-xs">Unread Only</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="assignedToMe"
                  checked={filters.assignedToMe}
                  onCheckedChange={(checked) => updateFilter('assignedToMe', checked)}
                />
                <Label htmlFor="assignedToMe" className="text-xs">Assigned to Me</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="unassigned"
                  checked={filters.unassigned}
                  onCheckedChange={(checked) => updateFilter('unassigned', checked)}
                />
                <Label htmlFor="unassigned" className="text-xs">Unassigned</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="lostLeads"
                  checked={filters.lostLeads}
                  onCheckedChange={(checked) => updateFilter('lostLeads', checked)}
                />
                <Label htmlFor="lostLeads" className="text-xs">Lost Leads</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="aiPaused"
                  checked={filters.aiPaused}
                  onCheckedChange={(checked) => updateFilter('aiPaused', checked)}
                />
                <Label htmlFor="aiPaused" className="text-xs">AI Paused</Label>
              </div>
            </div>
          </div>

          {/* Dropdown Filters */}
          <div>
            <h4 className="text-xs font-medium text-slate-600 mb-3">Advanced Filters</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
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

              {/* Message Direction Filter */}
              <div>
                <label className="text-xs font-medium text-slate-600 mb-2 block">Message Direction</label>
                <Select onValueChange={(value) => updateFilter('messageDirection', value === 'all' ? null : value)}>
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="All messages" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All messages</SelectItem>
                    <SelectItem value="inbound">All Inbound</SelectItem>
                    <SelectItem value="outbound">All Outbound</SelectItem>
                    <SelectItem value="needs_response">Needs Response</SelectItem>
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
          </div>

          {/* Text Filters */}
          <div>
            <h4 className="text-xs font-medium text-slate-600 mb-3">Search Filters</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-slate-600 mb-2 block">Lead Source</label>
                <Input
                  placeholder="Search lead source..."
                  value={filters.leadSource}
                  onChange={(e) => updateFilter('leadSource', e.target.value)}
                  className="h-8"
                />
              </div>
              
              <div>
                <label className="text-xs font-medium text-slate-600 mb-2 block">Vehicle Type</label>
                <Input
                  placeholder="Search vehicle type..."
                  value={filters.vehicleType}
                  onChange={(e) => updateFilter('vehicleType', e.target.value)}
                  className="h-8"
                />
              </div>
            </div>
          </div>

          {/* Date Range and Sort */}
          <div>
            <h4 className="text-xs font-medium text-slate-600 mb-3">Date & Sort</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-slate-600 mb-2 block">Date Range</label>
                <Select value={filters.dateRange} onValueChange={(value) => updateFilter('dateRange', value as any)}>
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">This Week</SelectItem>
                    <SelectItem value="month">This Month</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-xs font-medium text-slate-600 mb-2 block">Sort By</label>
                <Select value={filters.sortBy} onValueChange={(value) => updateFilter('sortBy', value as any)}>
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest First</SelectItem>
                    <SelectItem value="oldest">Oldest First</SelectItem>
                    <SelectItem value="unread">Unread First</SelectItem>
                    <SelectItem value="activity">Most Active</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Active Filter Tags */}
          {localHasActiveFilters && (
            <div className="flex items-center gap-2 pt-3 border-t">
              <span className="text-xs text-slate-600">Active filters:</span>
              <div className="flex flex-wrap gap-1">
                {filters.unreadOnly && (
                  <Badge variant="secondary" className="text-xs">
                    Unread Only
                    <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => updateFilter('unreadOnly', false)} />
                  </Badge>
                )}
                {filters.assignedToMe && (
                  <Badge variant="secondary" className="text-xs">
                    Assigned to Me
                    <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => updateFilter('assignedToMe', false)} />
                  </Badge>
                )}
                {filters.unassigned && (
                  <Badge variant="secondary" className="text-xs">
                    Unassigned
                    <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => updateFilter('unassigned', false)} />
                  </Badge>
                )}
                {filters.lostLeads && (
                  <Badge variant="secondary" className="text-xs">
                    Lost Leads
                    <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => updateFilter('lostLeads', false)} />
                  </Badge>
                )}
                {filters.aiPaused && (
                  <Badge variant="secondary" className="text-xs">
                    AI Paused
                    <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => updateFilter('aiPaused', false)} />
                  </Badge>
                )}
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
                {filters.messageDirection && (
                  <Badge variant="secondary" className="text-xs">
                    Direction: {filters.messageDirection}
                    <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => updateFilter('messageDirection', null)} />
                  </Badge>
                )}
                {filters.leadSource && (
                  <Badge variant="secondary" className="text-xs">
                    Source: {filters.leadSource}
                    <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => updateFilter('leadSource', '')} />
                  </Badge>
                )}
                {filters.vehicleType && (
                  <Badge variant="secondary" className="text-xs">
                    Vehicle: {filters.vehicleType}
                    <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => updateFilter('vehicleType', '')} />
                  </Badge>
                )}
                {filters.dateRange !== 'all' && (
                  <Badge variant="secondary" className="text-xs">
                    Date: {filters.dateRange}
                    <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => updateFilter('dateRange', 'all')} />
                  </Badge>
                )}
                {filters.sortBy !== 'newest' && (
                  <Badge variant="secondary" className="text-xs">
                    Sort: {filters.sortBy}
                    <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => updateFilter('sortBy', 'newest')} />
                  </Badge>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SmartFilters;
