import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { FixedSizeList as List } from 'react-window';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, Loader2, RefreshCw } from 'lucide-react';
import { optimizedConversationService, ConversationFilters } from '@/services/optimizedConversationService';
import { ConversationListItem } from '@/types/conversation';
import ConversationItem from './ConversationItem';

interface VirtualConversationListProps {
  selectedLead: string | null;
  onSelectConversation: (leadId: string) => Promise<void>;
  canReply: (conversation: ConversationListItem) => boolean;
  markAsRead: (leadId: string) => Promise<void>;
  markingAsRead: string | null;
  loading?: boolean;
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
  loading: externalLoading = false
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
      setFilters(prev => ({ ...prev, search: searchTerm || undefined }));
      setCurrentPage(0);
      setConversations([]);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const loadConversations = useCallback(async (page = 0, append = false) => {
    if (page === 0) setLoading(true);
    else setLoadingMore(true);

    try {
      const result = await optimizedConversationService.getConversations(page, 50, filters);
      
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
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [filters]);

  const loadMore = useCallback(() => {
    if (hasMore && !loadingMore) {
      loadConversations(currentPage + 1, true);
    }
  }, [hasMore, loadingMore, currentPage, loadConversations]);

  const handleRefresh = useCallback(() => {
    optimizedConversationService.invalidateCache();
    setCurrentPage(0);
    setConversations([]);
    loadConversations(0, false);
  }, [loadConversations]);

  const toggleFilter = useCallback((filterType: keyof ConversationFilters) => {
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

  // Virtual list item renderer
  const renderItem = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
    const conversation = conversations[index];
    
    // Load more when near the end
    if (index === conversations.length - 5 && hasMore && !loadingMore) {
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
  }, [conversations, selectedLead, hasMore, loadingMore, loadMore, onSelectConversation, canReply, markAsRead, markingAsRead]);

  const filteredCount = conversations.length;
  const unreadCount = conversations.filter(c => c.unreadCount > 0).length;

  return (
    <Card className="h-full flex flex-col">
      {/* Header with search and filters */}
      <div className="p-4 border-b space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Conversations</h3>
          <Button onClick={handleRefresh} variant="outline" size="sm" disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
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
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2 text-xs">
                {unreadCount}
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
            {filteredCount} of {totalCount} conversations
          </div>
        </div>
      </div>

      {/* Virtual scrolling list */}
      <div className="flex-1 relative">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            <span>Loading conversations...</span>
          </div>
        ) : conversations.length === 0 ? (
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
            itemCount={conversations.length + (hasMore ? 1 : 0)}
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
