import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useConversationOperations } from '@/hooks/useConversationOperations';
import { useInboxFilters } from '@/hooks/useInboxFilters';
import { useMarkAsRead } from '@/hooks/useMarkAsRead';
import { smartInboxDataLoader } from '@/services/smartInboxDataLoader';
import ConversationsList from './ConversationsList';
import ConversationView from './ConversationView';
import SmartFilters from './SmartFilters';
import InboxDebugPanel from './InboxDebugPanel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, MessageSquare, Users, Clock, CheckCircle } from 'lucide-react';
import type { ConversationListItem } from '@/types/conversation';
import { ConversationListSkeleton } from '@/components/ui/skeletons/ConversationSkeleton';
import { MessageListSkeleton } from '@/components/ui/skeletons/MessageSkeleton';
import { Switch } from '@/components/ui/switch';
import { useAutoMarkAsReadSetting } from '@/hooks/inbox/useAutoMarkAsReadSetting';
import { NetworkStatus } from '@/components/ui/error/NetworkStatus';
import { useOptimisticUnreadCounts } from '@/hooks/useOptimisticUnreadCounts';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { useToast } from '@/hooks/use-toast';
import { markOlderMessagesAsReadForScope, resetInboxGlobally, setGlobalDnc } from '@/services/conversationsService';
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction
} from '@/components/ui/alert-dialog';
interface SmartInboxRobustProps {
  onBack?: () => void;
  leadId?: string;
}

const SmartInboxRobust: React.FC<SmartInboxRobustProps> = ({ onBack, leadId }) => {
  const { profile, loading: authLoading } = useAuth();
  const [selectedConversation, setSelectedConversation] = useState<ConversationListItem | null>(null);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [showUrgencyColors, setShowUrgencyColors] = useState(false);
  const { enabled: autoMarkEnabled } = useAutoMarkAsReadSetting();
  const [scope, setScope] = useState<'my' | 'all'>('my');
  const { isAdmin, isManager, loading: permsLoading } = useUserPermissions();
  const { toast } = useToast();
  const initializedScopeRef = useRef(false);

  const {
    conversations,
    messages,
    loading,
    error,
    loadConversations,
    loadMessages,
    sendMessage,
    manualRefresh, // Use manualRefresh instead of refreshConversations
    optimisticZeroUnread
  } = useConversationOperations({
    onLeadsRefresh: () => {
      console.log('🔄 [SMART INBOX ROBUST] Leads refresh triggered');
    }
  });

  const { 
    applyFilters, 
    filters, 
    updateFilter, 
    hasActiveFilters, 
    getFilterSummary, 
    clearFilters 
  } = useInboxFilters();
  const { markAsRead, isMarkingAsRead } = useMarkAsRead();

// Apply filters to conversations
const filteredConversations = applyFilters(conversations);
// Optimistic unread handling for display
const { markAsReadOptimistically, getEffectiveUnreadCount } = useOptimisticUnreadCounts();
const scopedConversations = scope === 'my' 
  ? filteredConversations.filter(c => c.salespersonId === profile?.id)
  : filteredConversations;
const displayedConversations = scopedConversations
  .map(c => ({
    ...c,
    unreadCount: getEffectiveUnreadCount(c)
  }))
  .sort((a, b) => {
    const aUnread = a.unreadCount > 0 ? 1 : 0;
    const bUnread = b.unreadCount > 0 ? 1 : 0;
    if (aUnread !== bUnread) return bUnread - aUnread; // Unread first
    const aTime = a.lastMessageDate ? a.lastMessageDate.getTime() : 0;
    const bTime = b.lastMessageDate ? b.lastMessageDate.getTime() : 0;
    return bTime - aTime; // Newest first
  });
const statusTabs = smartInboxDataLoader.statusTabs.map(tab => ({
  ...tab,
  count: tab.id === 'all' ? displayedConversations.length :
         tab.id === 'unread' ? displayedConversations.filter(c => c.unreadCount > 0).length :
         tab.id === 'assigned' ? displayedConversations.filter(c => c.salespersonId).length :
         tab.id === 'unassigned' ? displayedConversations.filter(c => !c.salespersonId).length : 0
}));

  // Initialize and load conversations when scope/profile ready
  useEffect(() => {
    if (!authLoading && profile) {
      console.log('🚀 [SMART INBOX ROBUST] Loading conversations with scope:', scope);
      loadConversations(scope);
    }
  }, [authLoading, profile, scope, loadConversations]);

// Auto-select conversation if leadId provided
useEffect(() => {
  if (leadId && filteredConversations.length > 0) {
    const conversation = filteredConversations.find(c => c.leadId === leadId);
    if (conversation) {
      const initialSelection = autoMarkEnabled ? { ...conversation, unreadCount: 0 } : conversation;
      setSelectedConversation(initialSelection);
      loadMessages(leadId);
    }
  }
}, [leadId, filteredConversations, loadMessages, autoMarkEnabled]);

useEffect(() => {
  if (scope === 'my' && selectedConversation && selectedConversation.salespersonId !== profile?.id) {
    setSelectedConversation(null);
  }
}, [scope, selectedConversation, profile?.id]);

// Initialize scope from localStorage and roles
useEffect(() => {
  if (initializedScopeRef.current) return;
  if (authLoading || permsLoading) return;
  const saved = (typeof window !== 'undefined' && localStorage.getItem('smartInboxScope')) as 'my' | 'all' | null;
  const defaultScope = (isAdmin || isManager) ? 'all' : 'my';
  setScope(saved === 'my' || saved === 'all' ? saved : defaultScope);
  initializedScopeRef.current = true;
}, [authLoading, permsLoading, isAdmin, isManager]);

// Persist scope
useEffect(() => {
  try { localStorage.setItem('smartInboxScope', scope); } catch {}
}, [scope]);

// Auto-switch if My is empty for admin/manager
useEffect(() => {
  if (loading) return;
  if ((isAdmin || isManager) && scope === 'my' && conversations.length === 0) {
    setScope('all');
    loadConversations('all');
  }
}, [loading, scope, isAdmin, isManager, conversations.length, loadConversations]);

const handleSelectConversation = useCallback((conversation: ConversationListItem) => {
  const selection = autoMarkEnabled ? { ...conversation, unreadCount: 0 } : conversation;
  setSelectedConversation(selection);
  loadMessages(conversation.leadId);
}, [loadMessages, autoMarkEnabled]);

  const handleSendMessage = useCallback(async (messageText: string) => {
    if (selectedConversation) {
      await sendMessage(selectedConversation.leadId, messageText);
    }
  }, [selectedConversation, sendMessage]);

const markAsReadWithRefresh = useCallback(async (leadId: string) => {
  optimisticZeroUnread(leadId);
  await markAsRead(leadId);
  await manualRefresh(scope);
  if (selectedConversation?.leadId === leadId) {
    setSelectedConversation(prev => prev ? { ...prev, unreadCount: 0 } : prev);
  }
}, [optimisticZeroUnread, markAsRead, manualRefresh, selectedConversation?.leadId, scope]);

const handleMarkAsRead = useCallback(async () => {
  if (selectedConversation) {
    markAsReadOptimistically(selectedConversation.leadId);
    await markAsReadWithRefresh(selectedConversation.leadId);
  }
}, [selectedConversation, markAsReadWithRefresh, markAsReadOptimistically]);

  const handleRefresh = useCallback(async () => {
    console.log('🔄 [SMART INBOX ROBUST] Manual refresh triggered');
    await manualRefresh(scope);
  }, [manualRefresh, scope]);

  if (authLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-lg font-medium">Loading Smart Inbox...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-lg font-medium">Authentication Required</p>
          <p className="text-gray-600">Please log in to access the Smart Inbox.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 mb-4">❌ Error: {error}</div>
          <Button onClick={handleRefresh} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex-shrink-0 border-b bg-card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {onBack && (
              <Button onClick={onBack} variant="ghost" size="sm">
                ← Back
              </Button>
            )}
            <h1 className="text-xl font-semibold">Smart Inbox</h1>
          </div>
          <div className="flex items-center space-x-3">
            <NetworkStatus isOnline={navigator.onLine} lastUpdated={new Date()} />
            {(isAdmin || isManager) && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    Start Fresh (All)
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Start fresh for everyone?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will mark all existing unread incoming messages as read up to this moment for all users. Future messages will still appear as unread.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={async () => {
                        const res = await resetInboxGlobally(new Date());
                        if (res.success) {
                          toast({ title: 'Inbox reset', description: `Marked ${res.updated || 0} messages as read for everyone.` });
                          await manualRefresh(scope);
                          try { window.dispatchEvent(new CustomEvent('unread-count-changed')); } catch {}
                        } else {
                          toast({ title: 'Reset failed', description: res.error || 'Please try again.', variant: 'destructive' });
                        }
                      }}
                    >
                      Confirm
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            {(isAdmin || isManager) && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    Global Opt-Out (DNC)
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Opt out all leads?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This sets Do Not Call, Do Not Email, and Do Not Mail to ON for all leads and pauses AI. You can revert later per lead.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={async () => {
                        const res = await setGlobalDnc();
                        if (res.success) {
                          toast({ title: 'Global opt-out applied', description: `Updated ${res.updated || 0} leads.` });
                          await manualRefresh(scope);
                        } else {
                          toast({ title: 'Opt-out failed', description: res.error || 'Please try again.', variant: 'destructive' });
                        }
                      }}
                    >
                      Confirm
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            <Button
              onClick={handleRefresh}
              disabled={loading}
              variant="outline"
              size="sm"
            >
              {loading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
            <div className="inline-flex items-center rounded-md border p-0.5">
              <Button size="sm" variant={scope === 'my' ? 'secondary' : 'ghost'} onClick={() => setScope('my')}>My</Button>
              <Button size="sm" variant={scope === 'all' ? 'secondary' : 'ghost'} onClick={() => setScope('all')}>All</Button>
            </div>
            <Button
              onClick={() => setShowDebugPanel(!showDebugPanel)}
              variant="outline"
              size="sm"
            >
              Debug
            </Button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex-shrink-0 border-b bg-card p-4">
        <SmartFilters 
          filters={filters} 
          onFiltersChange={(updates) => Object.entries(updates).forEach(([key, value]) => updateFilter(key as any, value))}
          conversations={conversations}
          filteredConversations={filteredConversations}
          hasActiveFilters={hasActiveFilters}
          filterSummary={getFilterSummary()}
          onClearFilters={clearFilters}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Conversations List */}
        <div className="w-1/3 border-r bg-card flex flex-col">
<div className="p-4 border-b bg-muted/50">
  <div className="flex items-center justify-between">
    <h2 className="font-medium">Conversations</h2>
    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
      <div className="flex items-center space-x-2">
        <Users className="h-4 w-4" />
        <span>{displayedConversations.length}</span>
      </div>
      <div className="flex items-center space-x-2">
        <span className="text-xs">Urgency</span>
        <Switch checked={showUrgencyColors} onCheckedChange={setShowUrgencyColors} />
      </div>
    </div>
  </div>
</div>
          <div className="flex-1 overflow-auto">
            {loading ? (
              <ConversationListSkeleton />
            ) : filteredConversations.length === 0 ? (
              <div className="h-full flex items-center justify-center p-6 text-center">
                <div>
                  <h3 className="text-base font-medium text-muted-foreground mb-2">
                    {hasActiveFilters ? 'No conversations match your filters' : 'No conversations yet'}
                  </h3>
                  {hasActiveFilters && (
                    <Button variant="outline" size="sm" onClick={clearFilters} className="mr-2">
                      Clear filters
                    </Button>
                  )}
                  {(scope === 'my' && (isAdmin || isManager)) && (
                    <Button variant="outline" size="sm" onClick={() => { setScope('all'); loadConversations('all'); }} className="mr-2">
                      Show All
                    </Button>
                  )}
                  <Button variant="secondary" size="sm" onClick={handleRefresh} disabled={loading}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              </div>
            ) : (
<ConversationsList
  conversations={displayedConversations}
  selectedLead={selectedConversation?.leadId}
  onSelectConversation={(leadId) => {
    const conversation = displayedConversations.find(c => c.leadId === leadId);
    if (conversation) handleSelectConversation(conversation);
  }}
  showUrgencyIndicator={showUrgencyColors}
  showTimestamps={true}
  markAsRead={async (leadId) => {
    markAsReadOptimistically(leadId);
    await markAsReadWithRefresh(leadId);
  }}
  isMarkingAsRead={isMarkingAsRead}
/>
            )}
          </div>
        </div>

        {/* Conversation View */}
        <div className="flex-1 flex flex-col">
          {selectedConversation ? (
            loading ? (
              <MessageListSkeleton />
            ) : (
              <ConversationView
                conversation={selectedConversation}
                messages={messages.map(msg => ({ ...msg, sent_at: msg.sentAt }))}
                onBack={() => setSelectedConversation(null)}
                onSendMessage={handleSendMessage}
                onMarkAsRead={handleMarkAsRead}
                sending={loading}
                loading={loading}
                canReply={true}
              />
            )
          ) : (
            <div className="h-full flex items-center justify-center bg-muted/20">
              <div className="text-center">
                <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-muted-foreground mb-2">
                  Select a conversation
                </h3>
                <p className="text-sm text-muted-foreground">
                  Choose a conversation from the list to view messages
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {process.env.NODE_ENV === 'development' && (
        <div className="px-3 py-1 text-xs bg-muted text-muted-foreground border-t">
          dev: authLoading={String(authLoading)} | loading={String(loading)} | conv={conversations.length} | filtered={filteredConversations.length} | selected={selectedConversation?.leadId ?? 'none'} | leadIdParam={leadId ?? 'none'}
        </div>
      )}

      {/* Debug Panel */}
      {showDebugPanel && (
        <InboxDebugPanel
          conversations={conversations}
          filteredConversations={filteredConversations}
          onRefresh={handleRefresh}
        />
      )}
    </div>
  );
};

export default SmartInboxRobust;
