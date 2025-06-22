
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { FixedSizeList as List } from 'react-window';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, Loader2, RefreshCw } from 'lucide-react';
import { optimizedConversationService, ConversationFilters } from '@/services/optimizedConversationService';
import { ConversationListItem, MessageData } from '@/types/conversation';
import ConversationItem from './ConversationItem';

interface VirtualConversationListProps {
  selectedLead: string | null;
  onSelectConversation: (leadId: string) => Promise<void>;
  canReply: (conversation: ConversationListItem) => boolean;
  markAsRead: (leadId: string) => Promise<void>;
  markingAsRead: string | null;
  loading?: boolean;
  // Enhanced real-time props
  isConnected?: boolean;
  optimisticMessages?: Map<string, MessageData[]>;
  // Enhanced predictive props
  searchQuery?: string;
  searchResults?: ConversationListItem[];
  predictions?: any[];
  onSearch?: (query: string) => void;
}

const ITEM_HEIGHT = 120;
const CONTAINER_HEIGHT = 600;
const CONTAINER_WIDTH = 320; // Fixed width for the conversation list

const VirtualConversationList: React.FC<VirtualConversationListProps> = ({
  selectedLead,
  onSelectConversation,
  canReply,
  markAsRead,
  markingAsRead,
  loading: externalLoading = false,
  isConnected = true,
  optimisticMessages,
  searchQuery = '',
  searchResults = [],
  predictions = [],
  onSearch
}) => {
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<ConversationFilters>({});
  const [loadingMore, setLoadingMore] = useState(false);

  // Debounced search
  const debouncedSearch = useMemo(() => {
    const timer = setTimeout(() => {
      if (onSearch) {
        onSearch(searchTerm);
      }
      setFilters(prev => ({ ...prev, search: searchTerm || undefined }));
      setCurrentPage(0);
      setConversations([]);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, onSearch]);

  const loadConversations = useCallback(async (page = 0, append = false) => {
    if (page === 0) setLoading(true);
    else setLoadingMore(true);

    try {
      console.log(`🔄 [VIRTUAL LIST] Loading page ${page} with filters:`, filters);
      
      const result = await optimizedConversationService.getConversations(page, 50, filters);
      
      console.log(`📊 [VIRTUAL LIST] Page ${page} results:`, {
        total: result.conversations.length,
        unread: result.conversations.filter(c => c.unreadCount > 0).length,
        hasMore: result.hasMore
      });
      
      if (append) {
        setConversations(prev => [...prev, ...result.conversations]);
      } else {
        setConversations(result.conversations);
      }
      
      setTotalCount(result.totalCount);
      setHasMore(result.hasMore);
      setCurrentPage(page);

      // Pre-load next page if available
      if (result.hasMore) {
        optimizedConversationService.preloadNextPage(page, filters);
      }

    } catch (error) {
      console.error('❌ [VIRTUAL LIST] Error loading conversations:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [filters]);

  const loadMore = useCallback(() => {
    if (hasMore && !loadingMore) {
      console.log(`📄 [VIRTUAL LIST] Loading more: page ${currentPage + 1}`);
      loadConversations(currentPage + 1, true);
    }
  }, [hasMore, loadingMore, currentPage, loadConversations]);

  const handleRefresh = useCallback(() => {
    console.log('🔄 [VIRTUAL LIST] Refreshing conversations...');
    optimizedConversationService.invalidateCache();
    setCurrentPage(0);
    setConversations([]);
    loadConversations(0, false);
  }, [loadConversations]);

  const toggleFilter = useCallback((filterType: keyof ConversationFilters) => {
    console.log(`🔧 [VIRTUAL LIST] Toggling filter: ${filterType}`);
    setFilters(prev => ({
      ...prev,
      [filterType]: !prev[filterType]
    }));
    setCurrentPage(0);
    setConversations([]);
  }, []);

  // Initial load
  useEffect(() => {
    loadConversations(0, false);
  }, [loadConversations]);

  // Use search results when available, otherwise use regular conversations
  const displayConversations = searchQuery && searchResults.length > 0 ? searchResults : conversations;

  // Virtual list item renderer
  const renderItem = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
    const conversation = displayConversations[index];
    
    // Load more when near the end (only for regular conversations, not search results)
    if (index === conversations.length - 5 && hasMore && !loadingMore && !searchQuery) {
      loadMore();
    }

    if (!conversation) {
      return (
        <div style={style} className="flex items-center justify-center">
          <Loader2 className="w-4 h-4 animate-spin" />
        </div>
      );
    }

    return (
      <div style={style} className="px-2 py-1">
        <ConversationItem
          conversation={conversation}
          isSelected={selectedLead === conversation.leadId}
          onSelect={() => onSelectConversation(conversation.leadId)}
          canReply={canReply(conversation)}
          markAsRead={markAsRead}
          isMarkingAsRead={markingAsRead === conversation.leadId}
        />
      </div>
    );
  }, [displayConversations, conversations, selectedLead, hasMore, loadingMore, searchQuery, loadMore, onSelectConversation, canReply, markAsRead, markingAsRead]);

  const filteredCount = displayConversations.length;
  const unreadCount = displayConversations.filter(c => c.unreadCount > 0).length;
  const totalUnreadCount = displayConversations.reduce((sum, c) => sum + c.unreadCount, 0);

  return (
    <Card className="h-full flex flex-col">
      {/* Header with search and filters */}
      <div className="p-4 border-b space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Conversations</h3>
          <div className="flex items-center gap-2">
            {/* Connection indicator */}
            {!isConnected && (
              <Badge variant="outline" className="text-xs text-orange-600">
                Offline
              </Badge>
            )}
            {predictions.length > 0 && (
              <Badge variant="outline" className="text-xs text-blue-600">
                {predictions.filter(p => p.shouldPreload).length} predicted
              </Badge>
            )}
            <Button onClick={handleRefresh} variant="outline" size="sm" disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search conversations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant={filters.unreadOnly ? "default" : "outline"}
            size="sm"
            onClick={() => toggleFilter('unreadOnly')}
          >
            Unread Only
            {totalUnreadCount > 0 && (
              <Badge variant="destructive" className="ml-2 text-xs">
                {totalUnreadCount}
              </Badge>
            )}
          </Button>
          
          <Button
            variant={filters.incomingOnly ? "default" : "outline"}
            size="sm"
            onClick={() => toggleFilter('incomingOnly')}
          >
            Customer Messages
          </Button>

          <div className="text-sm text-gray-500 ml-auto">
            {filteredCount} of {totalCount} • {unreadCount} with unread
          </div>
        </div>

        {/* Search results indicator */}
        {searchQuery && (
          <div className="text-sm text-blue-600">
            {searchResults.length > 0 ? `Found ${searchResults.length} search results` : 'No search results'}
          </div>
        )}
      </div>

      {/* Virtual scrolling list */}
      <div className="flex-1 relative">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            <span>Loading conversations...</span>
          </div>
        ) : displayConversations.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-gray-500">
            <div className="text-center">
              <p>No conversations found</p>
              {Object.values(filters).some(Boolean) && (
                <Button 
                  variant="link" 
                  size="sm" 
                  onClick={() => {
                    setFilters({});
                    setSearchTerm('');
                  }}
                >
                  Clear filters
                </Button>
              )}
            </div>
          </div>
        ) : (
          <List
            height={CONTAINER_HEIGHT}
            width={CONTAINER_WIDTH}
            itemCount={displayConversations.length + (hasMore && !searchQuery ? 1 : 0)}
            itemSize={ITEM_HEIGHT}
            overscanCount={5}
            className="conversation-list"
          >
            {renderItem}
          </List>
        )}

        {/* Loading more indicator */}
        {loadingMore && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white shadow-lg rounded-lg px-3 py-2 flex items-center">
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            <span className="text-sm">Loading more...</span>
          </div>
        )}
      </div>
    </Card>
  );
};

export default VirtualConversationList;
