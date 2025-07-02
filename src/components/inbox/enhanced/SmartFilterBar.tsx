import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { 
  Search, 
  Filter, 
  X, 
  Bot, 
  AlertTriangle, 
  MessageSquare, 
  Clock, 
  Zap,
  Eye,
  Heart,
  Target,
  Settings,
  RefreshCw
} from 'lucide-react';
import { InboxFilters } from '@/hooks/useInboxFilters';
import type { ConversationListItem } from '@/types/conversation';

interface SmartFilterChip {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  count?: number;
  isActive: boolean;
  isAI?: boolean;
}

interface SmartFilterBarProps {
  filters: InboxFilters;
  conversations: ConversationListItem[];
  onFiltersChange: (filters: Partial<InboxFilters>) => void;
  onSearch: (query: string) => void;
  searchQuery?: string;
  onClearAll: () => void;
  hasActiveFilters: boolean;
  onRefresh?: () => void;
}

export const SmartFilterBar: React.FC<SmartFilterBarProps> = ({
  filters,
  conversations,
  onFiltersChange,
  onSearch,
  searchQuery = '',
  onClearAll,
  hasActiveFilters,
  onRefresh
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Calculate counts for smart filters
  const counts = useMemo(() => {
    return {
      needsResponse: conversations.filter(c => 
        c.lastMessageDirection === 'in' && c.unreadCount > 0
      ).length,
      buyingSignals: conversations.filter(c => 
        c.vehicleInterest && c.unreadCount > 0
      ).length,
      hotLeads: conversations.filter(c => 
        c.unreadCount > 2 || c.status === 'engaged'
      ).length,
      unread: conversations.filter(c => c.unreadCount > 0).length,
      aiActive: conversations.filter(c => c.aiOptIn).length,
      urgent: conversations.filter(c => {
        const hoursSince = c.lastMessageDate ? 
          (Date.now() - c.lastMessageDate.getTime()) / (1000 * 60 * 60) : 0;
        return c.unreadCount > 3 || hoursSince > 24;
      }).length
    };
  }, [conversations]);

  // Smart filter chips configuration
  const smartChips: SmartFilterChip[] = [
    {
      id: 'needs_response',
      label: 'Needs Response',
      icon: MessageSquare,
      color: 'bg-red-100 text-red-800 border-red-200 hover:bg-red-200',
      count: counts.needsResponse,
      isActive: filters.messageDirection === 'needs_response'
    },
    {
      id: 'buying_signals',
      label: 'Buying Signals',
      icon: Target,
      color: 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200',
      count: counts.buyingSignals,
      isActive: false, // Custom logic
      isAI: true
    },
    {
      id: 'hot_leads',
      label: 'Hot Leads',
      icon: Zap,
      color: 'bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-200',
      count: counts.hotLeads,
      isActive: filters.priority === 'high'
    },
    {
      id: 'unread',
      label: 'Unread',
      icon: Eye,
      color: 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200',
      count: counts.unread,
      isActive: filters.unreadOnly
    },
    {
      id: 'ai_active',
      label: 'AI Active',
      icon: Bot,
      color: 'bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-200',
      count: counts.aiActive,
      isActive: filters.aiOptIn === true,
      isAI: true
    },
    {
      id: 'urgent',
      label: 'Urgent',
      icon: AlertTriangle,
      color: 'bg-red-100 text-red-800 border-red-200 hover:bg-red-200',
      count: counts.urgent,
      isActive: false // Custom logic
    }
  ];

  const handleChipClick = (chipId: string) => {
    switch (chipId) {
      case 'needs_response':
        onFiltersChange({ 
          messageDirection: filters.messageDirection === 'needs_response' ? null : 'needs_response'
        });
        break;
      case 'buying_signals':
        // Custom AI logic - filter by vehicle interest + unread
        onFiltersChange({ 
          unreadOnly: !filters.unreadOnly,
          vehicleType: filters.vehicleType ? '' : 'interested'
        });
        break;
      case 'hot_leads':
        onFiltersChange({ 
          priority: filters.priority === 'high' ? null : 'high'
        });
        break;
      case 'unread':
        onFiltersChange({ unreadOnly: !filters.unreadOnly });
        break;
      case 'ai_active':
        onFiltersChange({ 
          aiOptIn: filters.aiOptIn === true ? null : true
        });
        break;
      case 'urgent':
        // Custom urgent logic - high unread count or old messages
        onFiltersChange({ 
          priority: filters.priority === 'urgent' ? null : 'urgent'
        });
        break;
    }
  };

  return (
    <div className="space-y-4">
      {/* Main Filter Bar */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-64">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations, names, or vehicle interests..."
            value={searchQuery}
            onChange={(e) => onSearch(e.target.value)}
            className="pl-10 bg-background"
          />
        </div>

        {/* Quick Sort */}
        <Select
          value={filters.sortBy}
          onValueChange={(value) => onFiltersChange({ sortBy: value as any })}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest First</SelectItem>
            <SelectItem value="oldest">Oldest First</SelectItem>
            <SelectItem value="unread">Most Unread</SelectItem>
            <SelectItem value="activity">Most Active</SelectItem>
          </SelectContent>
        </Select>

        {/* Refresh Button */}
        {onRefresh && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        )}

        {/* Advanced Filters Toggle */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={showAdvanced ? 'bg-muted' : ''}
        >
          <Settings className="h-4 w-4 mr-2" />
          Advanced
        </Button>

        {/* Clear All */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearAll}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4 mr-1" />
            Clear All
          </Button>
        )}
      </div>

      {/* Smart Filter Chips */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-medium text-muted-foreground mr-2">
          Smart Filters:
        </span>
        
        {smartChips.map((chip) => {
          const Icon = chip.icon;
          return (
            <Button
              key={chip.id}
              variant="outline"
              size="sm"
              onClick={() => handleChipClick(chip.id)}
              className={`transition-all duration-200 ${
                chip.isActive ? chip.color : 'hover:bg-muted'
              }`}
            >
              <Icon className="h-3 w-3 mr-1" />
              {chip.label}
              {chip.isAI && (
                <Bot className="h-3 w-3 ml-1 opacity-60" />
              )}
              {chip.count > 0 && (
                <Badge 
                  variant="secondary" 
                  className="ml-1 text-xs px-1 py-0"
                >
                  {chip.count}
                </Badge>
              )}
            </Button>
          );
        })}
      </div>

      {/* Advanced Filters Panel */}
      {showAdvanced && (
        <div className="bg-muted/50 rounded-lg p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Date Range */}
            <div>
              <label className="text-sm font-medium mb-2 block">Time Range</label>
              <Select
                value={filters.dateRange}
                onValueChange={(value) => onFiltersChange({ dateRange: value as any })}
              >
                <SelectTrigger>
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

            {/* Lead Source */}
            <div>
              <label className="text-sm font-medium mb-2 block">Lead Source</label>
              <Input
                placeholder="Enter source..."
                value={filters.leadSource}
                onChange={(e) => onFiltersChange({ leadSource: e.target.value })}
              />
            </div>

            {/* Vehicle Interest */}
            <div>
              <label className="text-sm font-medium mb-2 block">Vehicle Interest</label>
              <Input
                placeholder="Enter vehicle type..."
                value={filters.vehicleType}
                onChange={(e) => onFiltersChange({ vehicleType: e.target.value })}
              />
            </div>
          </div>

          {/* Assignment Filters */}
          <div className="flex items-center gap-4 flex-wrap">
            <Button
              variant={filters.assignedToMe ? "default" : "outline"}
              size="sm"
              onClick={() => onFiltersChange({ assignedToMe: !filters.assignedToMe })}
            >
              <Heart className="h-3 w-3 mr-1" />
              Assigned to Me
            </Button>
            
            <Button
              variant={filters.unassigned ? "default" : "outline"}
              size="sm"
              onClick={() => onFiltersChange({ unassigned: !filters.unassigned })}
            >
              Unassigned
            </Button>
            
            <Button
              variant={filters.lostLeads ? "default" : "outline"}
              size="sm"
              onClick={() => onFiltersChange({ lostLeads: !filters.lostLeads })}
            >
              Lost Leads
            </Button>
            
            <Button
              variant={filters.aiPaused ? "default" : "outline"}
              size="sm"
              onClick={() => onFiltersChange({ aiPaused: !filters.aiPaused })}
            >
              <Bot className="h-3 w-3 mr-1" />
              AI Paused
            </Button>
          </div>
        </div>
      )}

      {/* Filter Summary */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Filter className="h-3 w-3" />
          <span>
            Showing {conversations.length} conversation{conversations.length !== 1 ? 's' : ''} 
            {hasActiveFilters ? ' (filtered)' : ''}
          </span>
          <Separator orientation="vertical" className="h-4" />
          <Button
            variant="link"
            size="sm"
            onClick={onClearAll}
            className="p-0 h-auto text-xs"
          >
            Clear filters
          </Button>
        </div>
      )}
    </div>
  );
};