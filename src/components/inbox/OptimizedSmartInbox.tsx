
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, RefreshCw, Settings, AlertTriangle, CheckCircle } from 'lucide-react';
import { optimizedRealtimeManager } from '@/services/optimizedRealtimeManager';
import { conversationPaginationService } from '@/services/conversationPaginationService';
import { usePerformanceMonitor } from '@/hooks/usePerformanceMonitor';
import EnhancedLoadingState from '@/components/ui/EnhancedLoadingState';
import type { ConversationData } from '@/types/conversation';
import { useAuth } from '@/components/auth/AuthProvider';

interface OptimizedSmartInboxProps {
  onLeadsRefresh?: () => void;
}

const OptimizedSmartInbox: React.FC<OptimizedSmartInboxProps> = ({ onLeadsRefresh }) => {
  const { profile } = useAuth();
  const [conversations, setConversations] = useState<ConversationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    totalCount: 0,
    hasMore: false,
    pageSize: 25
  });
  const [connectionState, setConnectionState] = useState(optimizedRealtimeManager.getConnectionState());
  
  const {
    startRenderMeasure,
    endRenderMeasure,
    startAPICall,
    endAPICall,
    updateConnectionCount,
    getPerformanceSummary
  } = usePerformanceMonitor();

  // Load conversations with pagination
  const loadConversations = useCallback(async (page: number = 1, search?: string) => {
    if (!profile) return;
    
    startRenderMeasure();
    startAPICall('load-conversations');
    
    try {
      setLoading(true);
      console.log('📄 [OPTIMIZED INBOX] Loading conversations:', { page, search });
      
      const result = await conversationPaginationService.fetchConversations(
        profile,
        page,
        search || searchQuery
      );
      
      if (page === 1) {
        setConversations(result.data);
      } else {
        setConversations(prev => [...prev, ...result.data]);
      }
      
      setPagination({
        totalCount: result.pagination.totalCount,
        hasMore: result.pagination.hasMore,
        pageSize: result.pagination.pageSize
      });
      
      setCurrentPage(page);
      
    } catch (error) {
      console.error('❌ [OPTIMIZED INBOX] Error loading conversations:', error);
    } finally {
      setLoading(false);
      endAPICall('load-conversations');
      endRenderMeasure();
    }
  }, [profile, searchQuery, startRenderMeasure, endRenderMeasure, startAPICall, endAPICall]);

  // Handle search
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
    loadConversations(1, query);
  }, [loadConversations]);

  // Load more conversations
  const loadMore = useCallback(() => {
    if (pagination.hasMore && !loading) {
      loadConversations(currentPage + 1);
    }
  }, [currentPage, pagination.hasMore, loading, loadConversations]);

  // Handle real-time updates
  const handleRealtimeUpdate = useCallback((payload: any) => {
    console.log('🔄 [OPTIMIZED INBOX] Real-time update:', payload.eventType);
    
    // Debounce updates to prevent excessive re-renders
    setTimeout(() => {
      loadConversations(1);
      if (onLeadsRefresh) onLeadsRefresh();
    }, 500);
  }, [loadConversations, onLeadsRefresh]);

  // Set up real-time subscriptions
  useEffect(() => {
    console.log('🔌 [OPTIMIZED INBOX] Setting up real-time subscriptions');
    
    const conversationSubscription = optimizedRealtimeManager.subscribe({
      id: 'optimized-inbox-conversations',
      callback: handleRealtimeUpdate,
      filters: {
        event: '*',
        schema: 'public',
        table: 'conversations'
      }
    });

    const statusUnsubscribe = optimizedRealtimeManager.onStatusChange(setConnectionState);
    
    return () => {
      console.log('🔌 [OPTIMIZED INBOX] Cleaning up subscriptions');
      conversationSubscription();
      statusUnsubscribe();
    };
  }, [handleRealtimeUpdate]);

  // Update connection count for performance monitoring
  useEffect(() => {
    updateConnectionCount(connectionState.isConnected ? 1 : 0);
  }, [connectionState.isConnected, updateConnectionCount]);

  // Initial load
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const performanceSummary = getPerformanceSummary();

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Header with search and status */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              Smart Inbox
              <Badge variant={connectionState.isConnected ? 'default' : 'destructive'}>
                {connectionState.isConnected ? (
                  <>
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Live
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Offline
                  </>
                )}
              </Badge>
            </CardTitle>
            
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {pagination.totalCount} conversations
              </Badge>
              <Badge 
                variant={performanceSummary.status === 'good' ? 'default' : 'secondary'}
                className="text-xs"
              >
                {performanceSummary.status}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadConversations(1)}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="pt-0">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Conversations list */}
      <Card className="flex-1 min-h-0">
        <CardContent className="p-0 h-full">
          {loading && currentPage === 1 ? (
            <div className="h-full flex items-center justify-center">
              <EnhancedLoadingState 
                type="conversations" 
                message="Loading your conversations..." 
                isConnected={connectionState.isConnected}
                retryCount={connectionState.reconnectAttempts}
              />
            </div>
          ) : conversations.length === 0 ? (
            <div className="h-full flex items-center justify-center p-8">
              <div className="text-center">
                <Search className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No conversations found</h3>
                <p className="text-gray-500">
                  {searchQuery ? 'Try adjusting your search terms' : 'New conversations will appear here'}
                </p>
              </div>
            </div>
          ) : (
            <div className="h-full overflow-y-auto">
              <div className="p-4 space-y-2">
                {conversations.map((conversation) => (
                  <Card 
                    key={conversation.leadId}
                    className="cursor-pointer transition-all hover:shadow-md"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <h3 className="font-semibold text-gray-900 truncate">
                              {conversation.leadName}
                            </h3>
                            {conversation.unreadCount > 0 && (
                              <Badge variant="destructive" className="text-xs">
                                {conversation.unreadCount}
                              </Badge>
                            )}
                          </div>
                          
                          <p className="text-sm text-gray-600 mb-1">
                            {conversation.leadPhone}
                          </p>
                          
                          <p className="text-sm text-gray-600 mb-2">
                            <strong>Interest:</strong> {conversation.vehicleInterest}
                          </p>
                          
                          <p className="text-sm text-gray-800 line-clamp-2 mb-2">
                            {conversation.lastMessage}
                          </p>
                          
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500">
                              {new Date(conversation.lastMessageTime).toLocaleString()}
                            </span>
                            
                            <Badge variant="outline" className="text-xs">
                              {conversation.status}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              {/* Load more button */}
              {pagination.hasMore && (
                <div className="p-4 border-t">
                  <Button
                    variant="outline"
                    onClick={loadMore}
                    disabled={loading}
                    className="w-full"
                  >
                    {loading ? (
                      <EnhancedLoadingState type="messages" />
                    ) : (
                      `Load More (${pagination.totalCount - conversations.length} remaining)`
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default OptimizedSmartInbox;
