import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useConversationOperations } from '@/hooks/useConversationOperations';
import { useInboxFilters } from '@/hooks/useInboxFilters';
import { useMarkAsRead } from '@/hooks/useMarkAsRead';
import { smartInboxDataLoader } from '@/services/smartInboxDataLoader';
import ConversationsList from './ConversationsList';
import ConversationView from './ConversationView';
import SmartFilters from './SmartFilters';
import AIIntelligenceSidebar from './AIIntelligenceSidebar';
import InboxDebugPanel from './InboxDebugPanel';
import { LeadFollowUpModal } from '@/components/leads/LeadFollowUpModal';
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
import { getGlobalAdminMetrics } from '@/services/admin/adminMetricsService';
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
  const [aiSidebarCollapsed, setAiSidebarCollapsed] = useState(() => {
    try {
      const saved = localStorage.getItem('aiSidebarCollapsed');
      return saved === 'true';
    } catch {
      return false;
    }
  });
  const [messageInputText, setMessageInputText] = useState('');
  const { enabled: autoMarkEnabled } = useAutoMarkAsReadSetting();
  const [scope, setScope] = useState<'my' | 'all'>('all');
  const { isAdmin, isManager, loading: permsLoading } = useUserPermissions();
  const { toast } = useToast();
  const [followUpModalOpen, setFollowUpModalOpen] = useState(false);
  const [followUpModalLeadId, setFollowUpModalLeadId] = useState<string | null>(null);
const initializedScopeRef = useRef(false);

const [adminMetrics, setAdminMetrics] = useState<{
  totalLeads: number;
  aiPausedCount: number;
  dncCall: number;
  dncEmail: number;
  dncMail: number;
} | null>(null);
const [metricsLoading, setMetricsLoading] = useState(false);

const refreshAdminMetrics = useCallback(async () => {
  if (!(isAdmin || isManager)) return;
  setMetricsLoading(true);
  try {
    const m = await getGlobalAdminMetrics();
    setAdminMetrics(m);
  } catch (e) {
    console.warn('[AdminMetrics] Failed to fetch metrics', e);
  } finally {
    setMetricsLoading(false);
  }
}, [isAdmin, isManager]);

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

// Persist scope and AI sidebar state
useEffect(() => {
  try { localStorage.setItem('smartInboxScope', scope); } catch {}
}, [scope]);

useEffect(() => {
  try { localStorage.setItem('aiSidebarCollapsed', String(aiSidebarCollapsed)); } catch {}
}, [aiSidebarCollapsed]);

// Admin metrics
useEffect(() => {
  refreshAdminMetrics();
}, [refreshAdminMetrics]);

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
    <div className="h-screen flex flex-col bg-background relative overflow-hidden">
      {/* Animated mesh gradient background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-background to-transparent -z-10 pointer-events-none" />
      
      {/* Header with Glassmorphism */}
      <div className="flex-shrink-0 border-b border-border/50 bg-card/80 backdrop-blur-xl p-4 shadow-[var(--shadow-card)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {onBack && (
              <Button onClick={onBack} variant="glass" size="sm" className="hover:scale-105 transition-transform">
                ← Back
              </Button>
            )}
            <h1 className="text-xl font-semibold bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
              Smart Inbox
            </h1>
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
                          await refreshAdminMetrics();
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
                          await refreshAdminMetrics();
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
              variant="glass"
              size="sm"
              className="hover:scale-110 transition-transform"
            >
              {loading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
            <div className="inline-flex items-center rounded-md border border-border/30 bg-card/40 backdrop-blur-xl p-0.5 shadow-[var(--shadow-elegant)]">
              <Button size="sm" variant={scope === 'my' ? 'gradient' : 'ghost'} onClick={() => setScope('my')}>My</Button>
              <Button size="sm" variant={scope === 'all' ? 'gradient' : 'ghost'} onClick={() => setScope('all')}>All</Button>
            </div>
            <Button
              onClick={() => setShowDebugPanel(!showDebugPanel)}
              variant="glass"
              size="sm"
              className="hover:scale-110 transition-transform"
            >
              Debug
            </Button>
          </div>
        </div>
      </div>

      {/* Filters with Glassmorphism */}
      <div className="flex-shrink-0 border-b border-border/30 bg-card/60 backdrop-blur-xl p-4">
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

      {/* Admin Utilities Bar with Glassmorphism */}
      {(isAdmin || isManager) && (
        <div className="flex-shrink-0 border-b border-border/30 bg-gradient-to-r from-card/40 to-card/60 backdrop-blur-xl p-3 shadow-[var(--shadow-elegant)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <span className="font-medium">Admin Utilities</span>
              <span>
                AI paused: {metricsLoading ? '...' : (adminMetrics ? `${adminMetrics.aiPausedCount}/${adminMetrics.totalLeads}` : '—')}
              </span>
              <span>DNC Call: {metricsLoading ? '...' : (adminMetrics ? adminMetrics.dncCall : '—')}</span>
              <span>DNC Email: {metricsLoading ? '...' : (adminMetrics ? adminMetrics.dncEmail : '—')}</span>
              <span>DNC Mail: {metricsLoading ? '...' : (adminMetrics ? adminMetrics.dncMail : '—')}</span>
              <span>Unread (visible): {displayedConversations.filter(c => c.unreadCount > 0).length}</span>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="secondary">
                  Apply Both Now
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Apply both actions?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will mark all current messages as read and set DNC for all leads (pausing AI). Continue?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={async () => {
                      const resetRes = await resetInboxGlobally(new Date());
                      if (!resetRes.success) {
                        toast({ title: 'Reset failed', description: resetRes.error || 'Please try again.', variant: 'destructive' });
                        return;
                      }
                      const dncRes = await setGlobalDnc();
                      if (!dncRes.success) {
                        toast({ title: 'Global opt-out failed', description: dncRes.error || 'Please try again.', variant: 'destructive' });
                      } else {
                        toast({ title: 'Both applied', description: `Reset inbox and updated ${dncRes.updated || 0} leads.` });
                      }
                      await manualRefresh(scope);
                      try { window.dispatchEvent(new CustomEvent('unread-count-changed')); } catch {}
                      await refreshAdminMetrics();
                    }}
                  >
                    Confirm
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Conversations List */}
        <div className="w-[280px] md:w-[320px] lg:w-[360px] border-r bg-card flex flex-col flex-shrink-0 min-w-0">
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
          <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0">
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
  onViewPlan={(leadId) => {
    const conversation = displayedConversations.find(c => c.leadId === leadId);
    if (conversation) {
      setFollowUpModalLeadId(leadId);
      setFollowUpModalOpen(true);
    }
  }}
/>
            )}
          </div>
        </div>

        {/* Conversation View */}
        <div className="flex-1 flex flex-col min-w-0">
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
                messageInputText={messageInputText}
                onMessageInputChange={setMessageInputText}
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

        {/* AI Intelligence Sidebar */}
        {!aiSidebarCollapsed ? (
          <div className="w-[280px] md:w-[320px] lg:w-[360px] border-l flex-shrink-0 min-w-0">
            <AIIntelligenceSidebar
              conversation={selectedConversation}
              messages={messages.map(msg => ({ ...msg, sent_at: msg.sentAt }))}
              onInsertSuggestion={(text) => setMessageInputText(text)}
              isCollapsed={aiSidebarCollapsed}
              onToggleCollapse={() => setAiSidebarCollapsed(!aiSidebarCollapsed)}
            />
          </div>
        ) : (
          <div className="w-12 border-l flex-shrink-0">
            <AIIntelligenceSidebar
              conversation={selectedConversation}
              messages={messages.map(msg => ({ ...msg, sent_at: msg.sentAt }))}
              onInsertSuggestion={(text) => setMessageInputText(text)}
              isCollapsed={aiSidebarCollapsed}
              onToggleCollapse={() => setAiSidebarCollapsed(!aiSidebarCollapsed)}
            />
          </div>
        )}
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

      {/* Follow-Up Plan Modal */}
      {followUpModalLeadId && (
        <LeadFollowUpModal
          open={followUpModalOpen}
          onClose={() => {
            setFollowUpModalOpen(false);
            setFollowUpModalLeadId(null);
          }}
          leadId={followUpModalLeadId}
        />
      )}
    </div>
  );
};

export default SmartInboxRobust;
