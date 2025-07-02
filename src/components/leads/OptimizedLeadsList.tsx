import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useOptimizedLeads } from '@/hooks/leads/useOptimizedLeads';
import { useLeadsOperations } from '@/hooks/leads/useLeadsOperations';
import { Lead } from '@/types/lead';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, Filter, MoreHorizontal, Phone, Mail, MessageSquare, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LeadRowProps {
  lead: Lead;
  isSelected: boolean;
  onToggleSelection: (leadId: string) => void;
  onAiOptInChange: (leadId: string, value: boolean) => Promise<void>;
  canEdit: boolean;
}

const LeadRow: React.FC<LeadRowProps> = ({ 
  lead, 
  isSelected, 
  onToggleSelection, 
  onAiOptInChange, 
  canEdit 
}) => {
  const engagementScore = calculateEngagementScore(lead);

  return (
    <Card className={cn(
      "transition-all duration-200 hover:shadow-md border-l-4 mb-2",
      isSelected ? "bg-blue-50 border-l-blue-500" : "border-l-gray-200",
      lead.aiOptIn ? "border-l-green-500" : "",
      lead.unreadCount > 0 ? "bg-yellow-50" : ""
    )}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 flex-1">
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => onToggleSelection(lead.id)}
            />
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <h3 className="font-medium text-gray-900 truncate">
                  {lead.firstName} {lead.lastName}
                </h3>
                <Badge variant={getStatusVariant(lead.status)}>
                  {lead.status}
                </Badge>
                {lead.unreadCount > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {lead.unreadCount} new
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                <span className="flex items-center">
                  <Phone className="h-3 w-3 mr-1" />
                  {lead.primaryPhone || 'No phone'}
                </span>
                <span className="flex items-center">
                  <Mail className="h-3 w-3 mr-1" />
                  {lead.email || 'No email'}
                </span>
                <span className="truncate max-w-48">
                  {lead.vehicleInterest}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="text-right text-sm">
              <div className="font-medium">Score: {engagementScore}</div>
              <div className="text-gray-500">
                {formatDate(lead.createdAt)}
              </div>
            </div>

            {canEdit && (
              <div className="flex items-center space-x-2">
                <Button
                  size="sm"
                  variant={lead.aiOptIn ? "default" : "outline"}
                  onClick={() => onAiOptInChange(lead.id, !lead.aiOptIn)}
                  disabled={lead.doNotCall && lead.doNotEmail}
                >
                  AI {lead.aiOptIn ? 'On' : 'Off'}
                </Button>
                
                <Button size="sm" variant="ghost">
                  <MessageSquare className="h-4 w-4" />
                </Button>
                
                <Button size="sm" variant="ghost">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export const OptimizedLeadsList: React.FC = () => {
  const { user } = useAuth();
  const { updateAiOptIn } = useLeadsOperations();
  const {
    leads,
    loading,
    error,
    filters,
    pagination,
    selectedLeads,
    stats,
    updateFilters,
    clearFilters,
    loadMore,
    refetch,
    toggleLeadSelection,
    selectAllVisible,
    clearSelection
  } = useOptimizedLeads();

  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [visibleCount, setVisibleCount] = useState(20);

  const canEdit = user?.role === 'admin' || user?.role === 'manager';

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      updateFilters({ search: searchTerm });
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, updateFilters]);

  // Handle AI opt-in change
  const handleAiOptInChange = useCallback(async (leadId: string, value: boolean) => {
    const success = await updateAiOptIn(leadId, value);
    if (success) {
      refetch();
    }
  }, [updateAiOptIn, refetch]);

  // Load more handler
  const handleLoadMore = useCallback(() => {
    if (visibleCount < leads.length) {
      setVisibleCount(prev => Math.min(prev + 20, leads.length));
    } else if (pagination.hasMore) {
      loadMore();
    }
  }, [visibleCount, leads.length, pagination.hasMore, loadMore]);

  const visibleLeads = leads.slice(0, visibleCount);

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error loading leads: {error.message}</p>
          <Button onClick={refetch}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with stats */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
          <p className="text-gray-600">
            Showing {stats.visible} of {stats.total} leads
            {stats.selected > 0 && ` • ${stats.selected} selected`}
          </p>
        </div>
        
        {selectedLeads.length > 0 && (
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={clearSelection}>
              Clear ({selectedLeads.length})
            </Button>
            <Button variant="default" size="sm">
              Bulk Actions
            </Button>
          </div>
        )}
      </div>

      {/* Search and filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search leads by name, email, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select
              value={filters.status || 'all'}
              onValueChange={(value) => updateFilters({ status: value })}
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="engaged">Engaged</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="needs_ai">Needs AI</SelectItem>
                <SelectItem value="do_not_contact">Do Not Contact</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center space-x-2"
            >
              <Filter className="h-4 w-4" />
              <span>Filters</span>
            </Button>

            {Object.keys(filters).length > 2 && (
              <Button variant="ghost" onClick={clearFilters}>
                Clear
              </Button>
            )}
          </div>

          {/* Advanced filters */}
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t">
              <Select
                value={filters.dateFilter || 'all'}
                onValueChange={(value) => updateFilters({ dateFilter: value as any })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Date Range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="yesterday">Yesterday</SelectItem>
                  <SelectItem value="this_week">This Week</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={filters.aiOptIn?.toString() || 'all'}
                onValueChange={(value) => updateFilters({ 
                  aiOptIn: value === 'all' ? undefined : value === 'true' 
                })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="AI Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All AI Status</SelectItem>
                  <SelectItem value="true">AI Enabled</SelectItem>
                  <SelectItem value="false">AI Disabled</SelectItem>
                </SelectContent>
              </Select>

              <Input
                placeholder="Source..."
                value={filters.source || ''}
                onChange={(e) => updateFilters({ source: e.target.value })}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action bar */}
      <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
        <div className="flex items-center space-x-4">
          <Checkbox
            checked={selectedLeads.length === leads.length && leads.length > 0}
            onCheckedChange={selectAllVisible}
          />
          <span className="text-sm text-gray-600">
            Select all visible ({leads.length})
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={refetch}>
            Refresh
          </Button>
          {pagination.hasMore && (
            <span className="text-sm text-gray-500">
              {stats.hasMore ? `+${stats.total - stats.visible} more` : ''}
            </span>
          )}
        </div>
      </div>

      {/* Leads list */}
      <div className="space-y-0">
        {loading && leads.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : leads.length === 0 ? (
          <div className="flex items-center justify-center h-64 text-gray-500">
            No leads found matching your criteria
          </div>
        ) : (
          <>
            {visibleLeads.map((lead) => (
              <LeadRow
                key={lead.id}
                lead={lead}
                isSelected={selectedLeads.includes(lead.id)}
                onToggleSelection={toggleLeadSelection}
                onAiOptInChange={handleAiOptInChange}
                canEdit={canEdit}
              />
            ))}
            
            {/* Load more button */}
            {(visibleCount < leads.length || pagination.hasMore) && (
              <div className="flex justify-center py-6">
                <Button
                  variant="outline"
                  onClick={handleLoadMore}
                  disabled={loading}
                  className="flex items-center space-x-2"
                >
                  <ChevronDown className="h-4 w-4" />
                  <span>
                    {loading ? 'Loading...' : 
                     visibleCount < leads.length ? 
                     `Show ${Math.min(20, leads.length - visibleCount)} more` :
                     'Load more'}
                  </span>
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

// Helper functions
const calculateEngagementScore = (lead: Lead): number => {
  let score = 0;
  
  if (lead.email) score += 10;
  if (lead.primaryPhone) score += 10;
  if (lead.aiOptIn) score += 20;
  
  const lastWeek = new Date();
  lastWeek.setDate(lastWeek.getDate() - 7);
  if (new Date(lead.createdAt) > lastWeek) score += 15;
  
  if (lead.vehicleInterest && lead.vehicleInterest.length > 10) score += 10;
  if (!lead.doNotCall && !lead.doNotEmail && !lead.doNotMail) score += 15;
  if (lead.unreadCount > 0) score += 20;
  
  return Math.min(score, 100);
};

const getStatusVariant = (status: string) => {
  switch (status) {
    case 'new': return 'secondary';
    case 'engaged': return 'default';
    case 'active': return 'default';
    case 'paused': return 'outline';
    case 'closed': return 'secondary';
    case 'lost': return 'destructive';
    default: return 'secondary';
  }
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  
  return date.toLocaleDateString();
};