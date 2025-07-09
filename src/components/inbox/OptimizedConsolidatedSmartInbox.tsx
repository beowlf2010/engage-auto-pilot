import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useConversationsList } from '@/hooks/conversation/useConversationsList';
import { useMessagesOperations } from '@/hooks/conversation/useMessagesOperations';
import { useMarkAsRead } from '@/hooks/useMarkAsRead';
import { useCentralizedRealtime } from '@/hooks/useCentralizedRealtime';
import { useRobustMessageLoader } from '@/hooks/messaging/useRobustMessageLoader';
import { useSmartMessageSync } from '@/hooks/messaging/useSmartMessageSync';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, AlertCircle, Inbox, Loader2, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import SimpleConnectionStatus from './SimpleConnectionStatus';
import ConversationsList from './ConversationsList';
import { ConversationListSkeleton } from '@/components/ui/skeletons/ConversationSkeleton';
import EnhancedChatView from './EnhancedChatView';
import LeadContextPanel from './LeadContextPanel';
import EnhancedMessageSyncDebugPanel from '@/components/debug/EnhancedMessageSyncDebugPanel';
import type { ConversationListItem } from '@/hooks/conversation/conversationTypes';

interface OptimizedConsolidatedSmartInboxProps {
  onLeadsRefresh: () => void;
  preselectedLeadId?: string | null;
}

// Smart cache for conversation data
class ConversationCache {
  public cache = new Map<string, { data: any; timestamp: number }>();
  private readonly TTL = 2 * 60 * 1000; // 2 minutes

  set(key: string, data: any) {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  get(key: string): any | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.TTL) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  clear() {
    this.cache.clear();
  }

  invalidate(pattern: string) {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }
}

const OptimizedConsolidatedSmartInbox: React.FC<OptimizedConsolidatedSmartInboxProps> = ({
  onLeadsRefresh,
  preselectedLeadId
}) => {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState("unread");
  const [selectedLead, setSelectedLead] = useState<string | null>(null);
  const [debugPanelOpen, setDebugPanelOpen] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
  // Smart caching and optimization refs
  const conversationCache = useRef(new ConversationCache());
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastUpdateRef = useRef<number>(Date.now());
  
  const { 
    conversations, 
    conversationsLoading,
    refetchConversations
  } = useConversationsList();

  // Enhanced message loading with retry and caching
  const { 
    messages: robustMessages, 
    loadingState, 
    loadMessages: robustLoadMessages,
    forceReload 
  } = useRobustMessageLoader();

  const { 
    sendMessage, 
    sendingMessage 
  } = useMessagesOperations();

  const { markAsRead, isMarkingAsRead } = useMarkAsRead();

  // Smart message synchronization
  const { debouncedRefreshConversations, deduplicatedUpdate } = useSmartMessageSync();

  // Optimized conversation filtering and sorting with memoization
  const processedConversations = useMemo(() => {
    if (!conversations.length) return { unread: [], allIncoming: [], all: [] };

    console.log('🔄 [SMART INBOX] Processing conversations:', conversations.length);
    
    // Cache key for this processing
    const cacheKey = `conversations-${conversations.length}-${conversations[0]?.lastMessageDate?.getTime() || 0}`;
    const cached = conversationCache.current.get(cacheKey);
    
    if (cached) {
      console.log('📊 [CONVERSATION CACHE] Using cached processed conversations');
      return cached;
    }

    const unreadConversations = conversations.filter(conv => conv.unreadCount > 0);
    const allIncoming = conversations.filter(conv => conv.lastMessageDirection === 'in');

    // Optimized urgency calculation
    const getUrgencyLevel = (conv: ConversationListItem): 'high' | 'medium' | 'low' => {
      const hoursSinceLastMessage = conv.lastMessageDate ? 
        (Date.now() - conv.lastMessageDate.getTime()) / (1000 * 60 * 60) : 0;
      
      if (conv.unreadCount > 3 || hoursSinceLastMessage > 24) return 'high';
      if (conv.unreadCount > 1 || hoursSinceLastMessage > 4) return 'medium';
      return 'low';
    };

    // Sort unread by urgency and time
    const sortedUnreadConversations = [...unreadConversations].sort((a, b) => {
      const urgencyOrder = { high: 0, medium: 1, low: 2 };
      const aUrgency = getUrgencyLevel(a);
      const bUrgency = getUrgencyLevel(b);
      
      if (aUrgency !== bUrgency) {
        return urgencyOrder[aUrgency] - urgencyOrder[bUrgency];
      }
      
      // Same urgency, sort by time (newest first)
      return (b.lastMessageDate?.getTime() || 0) - (a.lastMessageDate?.getTime() || 0);
    });

    // Sort all incoming by most recent
    const sortedAllIncoming = [...allIncoming].sort((a, b) => 
      (b.lastMessageDate?.getTime() || 0) - (a.lastMessageDate?.getTime() || 0)
    );

    const result = {
      unread: sortedUnreadConversations,
      allIncoming: sortedAllIncoming,
      all: conversations
    };

    // Cache the result
    conversationCache.current.set(cacheKey, result);
    console.log('💾 [CONVERSATION CACHE] Cached processed conversations');

    return result;
  }, [conversations]);

  // Optimized tab conversation getter with memoization
  const getTabConversations = useCallback(() => {
    switch (activeTab) {
      case "unread":
        return processedConversations.unread;
      case "incoming":
        return processedConversations.allIncoming;
      case "all":
      default:
        return processedConversations.all;
    }
  }, [activeTab, processedConversations]);

  const tabConversations = useMemo(() => getTabConversations(), [getTabConversations]);

  // Real-time message synchronization with enhanced reliability and debouncing
  const handleMessageUpdate = useCallback((leadId: string) => {
    const now = Date.now();
    if (now - lastUpdateRef.current < 1000) {
      console.log('🚫 [SMART INBOX] Throttling message update for lead:', leadId);
      return; // Throttle updates to max 1 per second
    }
    
    console.log('📨 [OPTIMIZED INBOX] Real-time message update for lead:', leadId);
    lastUpdateRef.current = now;
    
    // Invalidate relevant cache entries
    conversationCache.current.invalidate(leadId);
    
    deduplicatedUpdate(leadId, 'message');
    
    if (selectedLead === leadId) {
      robustLoadMessages(leadId);
    }
  }, [selectedLead, robustLoadMessages, deduplicatedUpdate]);

  const handleConversationUpdate = useCallback(() => {
    console.log('🔄 [OPTIMIZED INBOX] Real-time conversation update');
    
    // Clear conversation cache on updates
    conversationCache.current.clear();
    
    debouncedRefreshConversations();
    onLeadsRefresh();
  }, [debouncedRefreshConversations, onLeadsRefresh]);

  // Use stable centralized realtime with fallback polling
  const { isConnected, forceRefresh, reconnect } = useCentralizedRealtime({
    onMessageUpdate: handleMessageUpdate,
    onConversationUpdate: handleConversationUpdate,
    onUnreadCountUpdate: () => {
      console.log('🔄 [SMART INBOX] Unread count updated');
      debouncedRefreshConversations();
    }
  });

  // Connection state management for SimpleConnectionStatus
  const [connectionState, setConnectionState] = useState({
    isConnected,
    status: isConnected ? 'connected' : 'offline' as 'connecting' | 'connected' | 'reconnecting' | 'offline',
    lastConnected: isConnected ? new Date() : null,
    reconnectAttempts: 0,
    maxReconnectAttempts: 5
  });

  // Update connection state when isConnected changes
  useEffect(() => {
    setConnectionState(prev => ({
      ...prev,
      isConnected,
      status: isConnected ? 'connected' : 'offline',
      lastConnected: isConnected ? new Date() : prev.lastConnected
    }));
  }, [isConnected]);

  // Fallback polling when real-time is disconnected
  useEffect(() => {
    if (!isConnected) {
      console.log('🔄 [SMART INBOX] Real-time disconnected, starting fallback polling');
      const pollInterval = setInterval(() => {
        console.log('📡 [FALLBACK POLLING] Refreshing conversations');
        refetchConversations();
      }, 15000); // Poll every 15 seconds

      return () => {
        console.log('🛑 [FALLBACK POLLING] Stopping fallback polling');
        clearInterval(pollInterval);
      };
    }
  }, [isConnected, refetchConversations]);

  // Progressive loading and optimization
  useEffect(() => {
    if (conversations.length > 0 && isInitialLoad) {
      setIsInitialLoad(false);
      console.log('✅ [SMART INBOX] Initial load complete, caching enabled');
    }
  }, [conversations.length, isInitialLoad]);

  // Auto-select conversation from URL parameter with optimization
  useEffect(() => {
    if (preselectedLeadId && conversations.length > 0) {
      const leadExists = conversations.some(conv => conv.leadId === preselectedLeadId);
      if (leadExists && selectedLead !== preselectedLeadId) {
        console.log('🎯 [SMART INBOX] Auto-selecting lead from URL:', preselectedLeadId);
        setSelectedLead(preselectedLeadId);
      }
    }
  }, [preselectedLeadId, conversations, selectedLead]);

  // Load messages when a lead is selected with enhanced reliability
  useEffect(() => {
    if (selectedLead) {
      console.log('🎯 [OPTIMIZED INBOX] Loading messages for selected lead:', selectedLead);
      
      // Cancel any ongoing requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      abortControllerRef.current = new AbortController();
      
      robustLoadMessages(selectedLead).catch(error => {
        if (error.name !== 'AbortError') {
          console.error('❌ [OPTIMIZED INBOX] Failed to load messages:', error);
        }
      });
    }
  }, [selectedLead, robustLoadMessages]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      conversationCache.current.clear();
    };
  }, []);

  // Memoized handlers to prevent unnecessary re-renders
  const handleSelectConversation = useCallback(async (leadId: string) => {
    console.log('🎯 Selecting conversation for lead:', leadId);
    setSelectedLead(leadId);
  }, []);

  const handleSendMessage = useCallback(async (message: string, isTemplate?: boolean) => {
    if (selectedLead) {
      // Optimistic update - invalidate cache immediately
      conversationCache.current.invalidate(selectedLead);
      await sendMessage(selectedLead, message);
    }
  }, [selectedLead, sendMessage]);

  const handleRefreshData = useCallback(async () => {
    console.log('🔄 [SMART INBOX] Manual refresh triggered');
    conversationCache.current.clear();
    await refetchConversations();
    onLeadsRefresh();
  }, [refetchConversations, onLeadsRefresh]);

  const canReply = useCallback((conversation: ConversationListItem) => {
    return conversation.lastMessageDirection === 'in' || conversation.unreadCount > 0;
  }, []);

  const selectedConversation = useMemo(() => 
    conversations.find(conv => conv.leadId === selectedLead),
    [conversations, selectedLead]
  );

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg font-medium text-gray-700">Please log in to view your inbox.</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      {/* Optimized header with connection status */}
      <div className="mb-4 flex-shrink-0 flex justify-between items-center">
        <div className="flex items-center gap-4">
          {/* Enhanced connection status */}
          <SimpleConnectionStatus
            connectionState={connectionState}
            onReconnect={() => {
              console.log('🔄 [SMART INBOX] Manual reconnect triggered');
              setConnectionState(prev => ({ ...prev, status: 'reconnecting' }));
              reconnect();
            }}
            onForceSync={() => {
              console.log('🔄 [SMART INBOX] Force sync triggered');
              forceRefresh();
              handleRefreshData();
            }}
          />
          
          {/* Cache performance indicator */}
          {!isInitialLoad && (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                Cache: {conversationCache.current.cache.size} items
              </Badge>
            </div>
          )}
        </div>

        {/* Manual refresh button */}
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRefreshData}
          disabled={conversationsLoading}
          className="flex items-center gap-2"
        >
          {conversationsLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCcw className="w-4 h-4" />
          )}
          Refresh
        </Button>
      </div>

      {/* Optimized tabs with smart badges */}
      <div className="mb-4 flex-shrink-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-gray-100 h-12">
            <TabsTrigger value="unread" className="flex items-center gap-2 text-base">
              <AlertCircle className="w-4 h-4" />
              <span>Unread</span>
              {!conversationsLoading && processedConversations.unread.length > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {processedConversations.unread.length}
                </Badge>
              )}
            </TabsTrigger>
            
            <TabsTrigger value="incoming" className="flex items-center gap-2 text-base">
              <MessageSquare className="w-4 h-4" />
              <span>All Incoming</span>
              {!conversationsLoading && (
                <Badge variant="secondary" className="text-xs">
                  {processedConversations.allIncoming.length}
                </Badge>
              )}
            </TabsTrigger>
            
            <TabsTrigger value="all" className="flex items-center gap-2 text-base">
              <Inbox className="w-4 h-4" />
              <span>All Conversations</span>
              {!conversationsLoading && (
                <Badge variant="outline" className="text-xs">
                  {processedConversations.all.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Optimized tab content with virtualization ready structure */}
          <TabsContent value={activeTab} className="flex-1 h-full mt-0 pt-4">
            <div className="grid h-full gap-4" style={{ gridTemplateColumns: selectedLead ? 'minmax(350px, 25%) 1fr minmax(300px, 20%)' : '1fr' }}>
              {/* Conversations List */}
              <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                {conversationsLoading && isInitialLoad ? (
                  <ConversationListSkeleton />
                ) : (
                  <ConversationsList
                    conversations={tabConversations}
                    selectedLead={selectedLead}
                    onSelectConversation={handleSelectConversation}
                    canReply={canReply}
                    markAsRead={markAsRead}
                    markingAsRead={isMarkingAsRead ? selectedLead : null}
                  />
                )}
              </div>

              {/* Chat View */}
              {selectedLead && selectedConversation && (
                <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                  <EnhancedChatView
                    selectedConversation={selectedConversation}
                    messages={robustMessages}
                    onSendMessage={handleSendMessage}
                    showTemplates={false}
                    onToggleTemplates={() => {}}
                    user={{
                      role: profile?.role || 'user',
                      id: profile?.id || ''
                    }}
                    isLoading={loadingState.isLoading}
                  />
                </div>
              )}

              {/* Lead Context Panel */}
              {selectedLead && (
                <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                  <LeadContextPanel 
                    conversation={selectedConversation}
                    messages={robustMessages}
                    onSendMessage={handleSendMessage}
                  />
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Debug Panel */}
      {debugPanelOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50">
          <div className="bg-white p-4 rounded-lg m-4">
            <button onClick={() => setDebugPanelOpen(false)}>Close Debug Panel</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default OptimizedConsolidatedSmartInbox;