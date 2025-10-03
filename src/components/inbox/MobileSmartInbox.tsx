
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useConversationOperations } from '@/hooks/useConversationOperations';
import { useInboxFilters } from '@/hooks/useInboxFilters';
import { useMarkAsRead } from '@/hooks/useMarkAsRead';
import InboxConversationsList from './InboxConversationsList';
import ConversationView from './ConversationView';
import SmartFilters from './SmartFilters';
import InboxStatusDisplay from './InboxStatusDisplay';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, RefreshCw, Search, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import type { ConversationListItem } from '@/types/conversation';

interface MobileSmartInboxProps {
  onBack?: () => void;
  leadId?: string;
}

const MobileSmartInbox: React.FC<MobileSmartInboxProps> = ({ onBack, leadId }) => {
  const { profile, loading: authLoading } = useAuth();
  const [initialized, setInitialized] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<ConversationListItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  // Use the working conversation operations hook
  const {
    conversations,
    messages,
    loading,
    error,
    loadConversations,
    loadMessages,
    sendMessage,
    manualRefresh
  } = useConversationOperations();

  // Filtering functionality
  const {
    filters,
    updateFilter,
    clearFilters,
    applyFilters,
    hasActiveFilters,
    getFilterSummary
  } = useInboxFilters();

  // Mark as read functionality
  const { markAsRead, isMarkingAsRead } = useMarkAsRead();

  // Load conversations on mount
  useEffect(() => {
    if (authLoading || !profile) return;
    console.log('📱 [MOBILE SMART INBOX] Auth ready, loading conversations');
    let cancelled = false;
    (async () => {
      try {
        await loadConversations();
      } finally {
        if (!cancelled) setInitialized(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authLoading, profile, loadConversations]);

  // Auto-select conversation if leadId provided
  useEffect(() => {
    if (leadId && conversations.length > 0 && !selectedConversation) {
      const conversation = conversations.find(c => c.leadId === leadId);
      if (conversation) {
        console.log('📱 [MOBILE SMART INBOX] Auto-selecting conversation for lead:', leadId);
        setSelectedConversation(conversation);
        loadMessages(leadId);
      }
    }
  }, [leadId, conversations, selectedConversation, loadMessages]);

  // Apply filters to conversations
  const displayConversations = applyFilters(conversations).filter(conv => {
    if (!searchQuery) return true;
    return conv.leadName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
           conv.leadSource?.toLowerCase().includes(searchQuery.toLowerCase()) ||
           conv.vehicleInterest?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleConversationSelect = useCallback(async (conversation: ConversationListItem) => {
    console.log('📱 [MOBILE SMART INBOX] Selecting conversation:', conversation.leadId);
    setSelectedConversation(conversation);
    try {
      await loadMessages(conversation.leadId);
    } catch (error) {
      console.error('Error selecting conversation:', error);
      toast({
        title: "Error",
        description: "Failed to load conversation messages",
        variant: "destructive"
      });
    }
  }, [loadMessages]);

  const handleSendMessageWrapper = useCallback(async (message: string) => {
    if (!selectedConversation) return;
    
    try {
      await sendMessage(selectedConversation.leadId, message);
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }, [selectedConversation, sendMessage]);

  const handleMarkAsReadWrapper = useCallback(async () => {
    if (!selectedConversation) return;
    
    try {
      await markAsRead(selectedConversation.leadId);
      // Refresh conversations to update unread counts
      await manualRefresh();
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  }, [selectedConversation, markAsRead, manualRefresh]);

  const handleRetry = useCallback(() => {
    console.log('📱 [MOBILE SMART INBOX] Retrying data load');
    manualRefresh();
  }, [manualRefresh]);

  // Show status display for loading, error, or empty states
  if (authLoading || loading || error || (initialized && conversations.length === 0)) {
    return (
      <div className="h-full flex flex-col bg-background">
        {/* Mobile Header with Glassmorphism */}
        <div className="flex items-center justify-between p-4 border-b border-border/50 bg-card/80 backdrop-blur-xl shadow-[var(--shadow-card)]">
          <div className="flex items-center gap-2">
            {onBack && (
              <Button variant="ghost" size="sm" onClick={onBack} className="hover:scale-110 transition-transform">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <h1 className="text-lg font-semibold bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
              Inbox
            </h1>
          </div>
          <Button variant="glass" size="sm" onClick={handleRetry}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        <InboxStatusDisplay
          loading={authLoading || loading}
          error={error}
          conversationsCount={conversations.length}
          onRetry={handleRetry}
        />
      </div>
    );
  }

  // Show conversation view if one is selected
  if (selectedConversation) {
    return (
      <ConversationView
        conversation={selectedConversation}
        messages={messages.map(msg => ({
          id: msg.id,
          body: msg.body,
          direction: msg.direction,
          sent_at: msg.sentAt,
          read_at: undefined,
          ai_generated: msg.aiGenerated
        }))}
        onBack={() => setSelectedConversation(null)}
        onSendMessage={handleSendMessageWrapper}
        sending={false}
        onMarkAsRead={handleMarkAsReadWrapper}
        canReply={true}
        loading={loading}
        error={error}
      />
    );
  }

  // Show main mobile inbox view
  return (
    <div className="h-full flex flex-col bg-background relative">
      {/* Animated background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-background to-transparent -z-10 pointer-events-none" />
      
      {/* Mobile Header with Glassmorphism */}
      <div className="flex items-center justify-between p-4 border-b border-border/50 bg-card/80 backdrop-blur-xl shadow-[var(--shadow-card)]">
        <div className="flex items-center gap-2">
          {onBack && (
            <Button variant="ghost" size="sm" onClick={onBack} className="hover:scale-110 transition-transform">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <h1 className="text-lg font-semibold bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
            Inbox
          </h1>
          <Badge variant="glass" className="text-xs">
            {displayConversations.length}
          </Badge>
        </div>
        <div className="flex gap-1">
          <Button 
            variant="glass" 
            size="sm" 
            onClick={() => setShowSearch(!showSearch)}
            className="hover:scale-110 transition-transform"
          >
            <Search className="h-4 w-4" />
          </Button>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="glass" size="sm" className="hover:scale-110 transition-transform">
                <Filter className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[80vh] bg-card/95 backdrop-blur-xl">
              <SmartFilters
                filters={filters}
                onFiltersChange={(updates) => {
                  Object.entries(updates).forEach(([key, value]) => {
                    updateFilter(key as keyof typeof filters, value);
                  });
                }}
                conversations={conversations}
                filteredConversations={displayConversations}
                hasActiveFilters={hasActiveFilters}
                filterSummary={getFilterSummary()}
                onClearFilters={clearFilters}
                userRole={profile?.role}
              />
            </SheetContent>
          </Sheet>
          <Button variant="glass" size="sm" onClick={handleRetry} className="hover:scale-110 transition-transform">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Mobile Search with Glassmorphism */}
      {showSearch && (
        <div className="p-4 border-b border-border/30 bg-card/60 backdrop-blur-xl animate-fade-in">
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-background/60 backdrop-blur-xl border-border/30 focus:shadow-[var(--shadow-glow)] transition-shadow"
          />
        </div>
      )}

      {/* Mobile Conversations List */}
      <div className="flex-1 overflow-hidden">
        <InboxConversationsList
          conversations={displayConversations}
          selectedConversationId={selectedConversation?.leadId || null}
          onConversationSelect={handleConversationSelect}
          loading={loading}
          searchQuery={searchQuery}
          onMarkAsRead={markAsRead}
          isMarkingAsRead={isMarkingAsRead}
        />
      </div>
    </div>
  );
};

export default MobileSmartInbox;
