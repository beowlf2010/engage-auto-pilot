
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useMarkAsRead } from '@/hooks/useMarkAsRead';
import { smartInboxDataLoader } from '@/services/smartInboxDataLoader';
import InboxConversationsList from './InboxConversationsList';
import ConversationView from './ConversationView';
import SmartFilters from './SmartFilters';
import SmartInboxErrorBoundary from './SmartInboxErrorBoundary';
import SmartInboxLoadingProgress from './SmartInboxLoadingProgress';
import { Button } from '@/components/ui/button';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import type { ConversationListItem } from '@/types/conversation';

interface LoadingProgress {
  stage: 'initializing' | 'loading_basic' | 'loading_details' | 'processing' | 'complete' | 'error';
  progress: number;
  message: string;
  error?: string;
}

interface SmartInboxRobustProps {
  onBack?: () => void;
  leadId?: string;
}

const SmartInboxRobust: React.FC<SmartInboxRobustProps> = ({ onBack, leadId }) => {
  const { profile } = useAuth();
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<ConversationListItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingProgress, setLoadingProgress] = useState<LoadingProgress>({
    stage: 'initializing',
    progress: 0,
    message: 'Initializing...'
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { markAsRead, isMarkingAsRead } = useMarkAsRead();

  const loadConversationsRobust = useCallback(async () => {
    if (!profile) {
      console.log('⚠️ [SMART INBOX ROBUST] No profile available');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setLoadingProgress({
        stage: 'initializing',
        progress: 0,
        message: 'Starting to load conversations...'
      });

      console.log('🔄 [SMART INBOX ROBUST] Starting robust conversation loading');

      const result = await smartInboxDataLoader.loadConversationsRobustly(profile, {
        maxRetries: 3,
        timeoutMs: 30000,
        pageSize: 100,
        progressCallback: setLoadingProgress
      });

      console.log(`✅ [SMART INBOX ROBUST] Successfully loaded ${result.length} conversations`);
      setConversations(result);
      setIsLoading(false);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load conversations';
      console.error('❌ [SMART INBOX ROBUST] Loading failed:', errorMessage);
      
      setError(errorMessage);
      setIsLoading(false);
      setLoadingProgress({
        stage: 'error',
        progress: 0,
        message: 'Failed to load conversations',
        error: errorMessage
      });

      toast({
        title: "Loading Error",
        description: "Failed to load conversations. Please try again.",
        variant: "destructive"
      });
    }
  }, [profile]);

  // Load conversations on mount and profile change
  useEffect(() => {
    loadConversationsRobust();
  }, [loadConversationsRobust]);

  // Auto-select conversation if leadId provided
  useEffect(() => {
    if (leadId && conversations.length > 0 && !selectedConversation) {
      const conversation = conversations.find(c => c.leadId === leadId);
      if (conversation) {
        console.log('📱 [SMART INBOX ROBUST] Auto-selecting conversation for lead:', leadId);
        setSelectedConversation(conversation);
      }
    }
  }, [leadId, conversations, selectedConversation]);

  const handleConversationSelect = useCallback(async (conversation: ConversationListItem) => {
    console.log('📱 [SMART INBOX ROBUST] Selecting conversation:', conversation.leadId);
    setSelectedConversation(conversation);
  }, []);

  const handleRetry = useCallback(() => {
    console.log('🔄 [SMART INBOX ROBUST] Manual retry triggered');
    loadConversationsRobust();
  }, [loadConversationsRobust]);

  const handleMarkAsReadWrapper = useCallback(async (leadId: string) => {
    try {
      await markAsRead(leadId);
      // Refresh conversations to update unread counts
      await loadConversationsRobust();
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  }, [markAsRead, loadConversationsRobust]);

  // Filter conversations based on search
  const displayConversations = conversations.filter(conv => {
    if (!searchQuery) return true;
    return conv.leadName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
           conv.leadSource?.toLowerCase().includes(searchQuery.toLowerCase()) ||
           conv.vehicleInterest?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Show loading progress
  if (isLoading) {
    return (
      <div className="h-full flex flex-col bg-background">
        <div className="flex items-center justify-between p-4 border-b bg-card">
          <div className="flex items-center gap-2">
            {onBack && (
              <Button variant="ghost" size="sm" onClick={onBack}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <h1 className="text-xl font-semibold">Smart Inbox</h1>
          </div>
        </div>
        <SmartInboxLoadingProgress 
          progress={loadingProgress} 
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
        messages={[]} // TODO: Load messages for selected conversation
        onBack={() => setSelectedConversation(null)}
        onSendMessage={async () => {}} // TODO: Implement message sending
        sending={false}
        onMarkAsRead={async () => {}}
        canReply={true}
        loading={false}
        error={null}
      />
    );
  }

  // Show main inbox view
  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-card">
        <div className="flex items-center gap-2">
          {onBack && (
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <h1 className="text-xl font-semibold">Smart Inbox</h1>
          <span className="text-sm text-muted-foreground">
            ({displayConversations.length} conversations)
          </span>
        </div>
        <Button variant="outline" size="sm" onClick={handleRetry}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Search */}
      <div className="p-4 border-b bg-card">
        <Input
          placeholder="Search conversations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full"
        />
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-hidden">
        <InboxConversationsList
          conversations={displayConversations}
          selectedConversationId={selectedConversation?.leadId || null}
          onConversationSelect={handleConversationSelect}
          loading={false}
          searchQuery={searchQuery}
          onMarkAsRead={handleMarkAsReadWrapper}
          isMarkingAsRead={isMarkingAsRead}
        />
      </div>
    </div>
  );
};

// Wrap with error boundary
const SmartInboxRobustWithErrorBoundary: React.FC<SmartInboxRobustProps> = (props) => {
  return (
    <SmartInboxErrorBoundary onRetry={() => window.location.reload()}>
      <SmartInboxRobust {...props} />
    </SmartInboxErrorBoundary>
  );
};

export default SmartInboxRobustWithErrorBoundary;
