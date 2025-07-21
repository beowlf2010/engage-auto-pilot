import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useConversationOperations } from '@/hooks/useConversationOperations';
import { useInboxFilters } from '@/hooks/useInboxFilters';
import { useMarkAsRead } from '@/hooks/useMarkAsRead';
import ConversationViewWithDebug from './ConversationViewWithDebug';
import SmartInboxLoadingProgress from './SmartInboxLoadingProgress';
import { smartInboxDataLoader } from '@/services/smartInboxDataLoader';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { RefreshCw, Search, ArrowLeft, MessageSquare, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { ConversationListItem } from '@/types/conversation';

interface SmartInboxProps {
  onBack?: () => void;
  leadId?: string;
}

const SmartInboxRobust: React.FC<SmartInboxProps> = ({ onBack, leadId: propLeadId }) => {
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<ConversationListItem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingProgress, setLoadingProgress] = useState<{
    stage: 'initializing' | 'loading_basic' | 'loading_details' | 'processing' | 'complete' | 'error';
    progress: number;
    message: string;
    error?: string;
  }>({
    stage: 'initializing',
    progress: 0,
    message: 'Initializing...'
  });
  const { profile } = useAuth();
  const { handleError } = useErrorHandler();
  const {
    filteredConversations,
    activeStatusTab,
    setActiveStatusTab,
    isFilterActive,
    handleStatusTabClick,
    clearFilters
  } = useInboxFilters(conversations);
  const { sendMessage } = useConversationOperations();
  const { markMessagesAsRead } = useMarkAsRead();

  const loadConversations = useCallback(async () => {
    if (!profile) {
      console.warn('No profile available to load conversations');
      return;
    }

    try {
      setLoadingProgress(prev => ({ ...prev, stage: 'loading_basic', progress: 30, message: 'Loading basic lead information...' }));
      const initialData = await smartInboxDataLoader.loadInitialData(profile);
      
      setLoadingProgress(prev => ({ ...prev, stage: 'loading_details', progress: 60, message: 'Fetching detailed conversation data...' }));
      const detailedConversations = await smartInboxDataLoader.loadConversationDetails(initialData);
      
      setLoadingProgress(prev => ({ ...prev, stage: 'processing', progress: 80, message: 'Processing and organizing data...' }));
      setConversations(detailedConversations);

      setLoadingProgress(prev => ({ ...prev, stage: 'complete', progress: 100, message: 'Data loaded successfully!' }));
      setTimeout(() => {
        setLoadingProgress(prev => ({ ...prev, stage: 'complete', progress: 100, message: 'Data loaded successfully!' }));
      }, 500);

    } catch (error) {
      console.error('Error loading conversations:', error);
      handleError(error, 'Smart Inbox data loading', {
        showToast: true,
        logError: true,
        fallbackMessage: 'Failed to load Smart Inbox data. Please try again.'
      });
      setLoadingProgress(prev => ({
        ...prev,
        stage: 'error',
        progress: 0,
        message: 'Failed to load data.',
        error: (error as Error).message
      }));
    }
  }, [profile, handleError]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const handleConversationClick = (conversation: ConversationListItem) => {
    setSelectedConversation(conversation);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const filteredBySearch = React.useMemo(() => {
    const term = searchTerm.toLowerCase();
    return filteredConversations.filter(conversation => {
      return (
        conversation.leadName.toLowerCase().includes(term) ||
        conversation.leadPhone.toLowerCase().includes(term) ||
        conversation.vehicleInterest.toLowerCase().includes(term)
      );
    });
  }, [searchTerm, filteredConversations]);

  const renderContent = () => {
    if (loadingProgress.stage !== 'complete' && loadingProgress.stage !== 'error') {
      return <SmartInboxLoadingProgress progress={loadingProgress} onRetry={loadConversations} />;
    }

    if (loadingProgress.stage === 'error') {
      return (
        <div className="h-full flex items-center justify-center p-6">
          <div className="text-center">
            <div className="text-lg font-medium text-gray-700 mb-2">
              Smart Inbox Unavailable
            </div>
            <div className="text-sm text-gray-500 mb-4">
              There was an error loading the inbox. Please refresh the page or try again.
            </div>
            <Button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Refresh Page
            </Button>
          </div>
        </div>
      );
    }

    // Selected conversation view
    if (selectedConversation) {
      return (
        <ConversationViewWithDebug
          conversation={selectedConversation}
          onBack={() => setSelectedConversation(null)}
          onSendMessage={async (message: string) => {
            try {
              await sendMessage(selectedConversation.leadId, message);
              // Reload conversations to update unread counts
              loadConversations();
            } catch (error) {
              console.error('Error sending message:', error);
              throw error;
            }
          }}
          sending={false}
          onMarkAsRead={async () => {
            try {
              await markMessagesAsRead(selectedConversation.leadId);
              // Reload conversations to update unread counts
              loadConversations();
            } catch (error) {
              console.error('Error marking as read:', error);
            }
          }}
          canReply={true}
        />
      );
    }

    return (
      <div className="flex flex-col h-full">
        {/* Header with Back Button and Search */}
        <div className="flex items-center justify-between p-4 border-b bg-card">
          <div className="flex items-center gap-3">
            {onBack && (
              <Button variant="ghost" size="sm" onClick={onBack}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <Input
              type="search"
              placeholder="Search leads..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="max-w-md"
            />
            {searchTerm && (
              <Button variant="ghost" size="sm" onClick={() => setSearchTerm('')}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Status Tabs */}
        <div className="flex justify-start gap-2 p-2 bg-muted/50 border-b overflow-x-auto">
          {smartInboxDataLoader.statusTabs.map(tab => (
            <Button
              key={tab.status}
              variant={activeStatusTab === tab.status ? 'default' : 'outline'}
              onClick={() => handleStatusTabClick(tab.status)}
              size="sm"
            >
              {tab.label}
              {isFilterActive(tab.status) && (
                <Badge variant="secondary" className="ml-1">
                  {conversations.filter(c => c.status === tab.status).length}
                </Badge>
              )}
            </Button>
          ))}
          {isFilterActive() && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear Filters
            </Button>
          )}
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto">
          {filteredBySearch.length === 0 ? (
            <Card className="m-4">
              <CardContent className="py-8 flex flex-col items-center justify-center">
                <MessageSquare className="h-6 w-6 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No conversations found.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="divide-y divide-border">
              {filteredBySearch.map(conversation => (
                <Card
                  key={conversation.leadId}
                  className="bg-card text-card-foreground rounded-none shadow-none hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => handleConversationClick(conversation)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div>
                          <div className="font-semibold">{conversation.leadName}</div>
                          <div className="text-sm text-muted-foreground flex items-center gap-2">
                            <User className="h-3 w-3" />
                            {conversation.leadPhone}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {conversation.unreadCount > 0 && (
                          <Badge variant="destructive">
                            {conversation.unreadCount}
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(conversation.lastMessageDate), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return renderContent();
};

export default SmartInboxRobust;
