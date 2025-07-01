
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useConversationOperations } from '@/hooks/useConversationOperations';
import { useInboxOperations } from '@/hooks/inbox/useInboxOperations';
import ConversationsList from './ConversationsList';
import EnhancedChatView from './EnhancedChatView';
import MessageDebugPanel from './MessageDebugPanel';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, MessageSquare, AlertCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface ConsolidatedSmartInboxProps {
  onLeadsRefresh?: () => void;
}

const ConsolidatedSmartInbox: React.FC<ConsolidatedSmartInboxProps> = ({ onLeadsRefresh }) => {
  const { profile } = useAuth();
  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  const [showTemplates, setShowTemplates] = useState(false);

  const {
    conversations,
    messages,
    selectedLeadId,
    loading,
    messagesLoading,
    sendingMessage,
    error,
    totalConversations,
    loadMessages,
    sendMessage,
    manualRefresh,
    debugConversationState,
    setError
  } = useConversationOperations();

  const {
    canReply,
    handleSelectConversation,
    handleSendMessage
  } = useInboxOperations({
    user: profile ? { role: profile.role || 'user', id: profile.id } : { role: 'user', id: '' },
    loadMessages,
    sendMessage,
    sendingMessage,
    setError
  });

  // Enhanced conversation selection with debug logging
  const onSelectConversation = useCallback(async (conversation: ConversationListItem) => {
    console.log('📱 [CONSOLIDATED INBOX] Selecting conversation:', {
      leadId: conversation.leadId,
      leadName: conversation.leadName,
      unreadCount: conversation.unreadCount,
      lastMessage: conversation.lastMessage?.substring(0, 50) + '...'
    });

    setSelectedConversation(conversation);
    
    try {
      await handleSelectConversation(conversation.leadId);
      console.log('✅ [CONSOLIDATED INBOX] Conversation selected successfully');
    } catch (error) {
      console.error('❌ [CONSOLIDATED INBOX] Error selecting conversation:', error);
      toast({
        title: "Error",
        description: "Failed to load conversation messages",
        variant: "destructive"
      });
    }
  }, [handleSelectConversation]);

  // Enhanced message sending with debug logging
  const onSendMessage = useCallback(async (message: string) => {
    if (!selectedConversation) return;
    
    console.log('📤 [CONSOLIDATED INBOX] Sending message:', {
      leadId: selectedConversation.leadId,
      messageLength: message.length
    });

    try {
      await handleSendMessage(
        selectedConversation.leadId,
        selectedConversation,
        message
      );
      console.log('✅ [CONSOLIDATED INBOX] Message sent successfully');
    } catch (error) {
      console.error('❌ [CONSOLIDATED INBOX] Error sending message:', error);
      toast({
        title: "Error", 
        description: error instanceof Error ? error.message : "Failed to send message",
        variant: "destructive"
      });
    }
  }, [selectedConversation, handleSendMessage]);

  // Enhanced manual refresh with debug logging
  const onManualRefresh = useCallback(() => {
    console.log('🔄 [CONSOLIDATED INBOX] Manual refresh triggered');
    manualRefresh();
    debugConversationState();
    
    if (onLeadsRefresh) {
      onLeadsRefresh();
    }
    
    toast({
      title: "Refreshed",
      description: "Conversations and messages have been refreshed"
    });
  }, [manualRefresh, debugConversationState, onLeadsRefresh]);

  // Log state changes for debugging
  useEffect(() => {
    console.log('📊 [CONSOLIDATED INBOX] State update:', {
      conversationsCount: conversations.length,
      messagesCount: messages.length,
      selectedLeadId,
      loading,
      messagesLoading,
      error
    });
  }, [conversations.length, messages.length, selectedLeadId, loading, messagesLoading, error]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg font-medium text-gray-700">Loading conversations...</p>
          <p className="text-sm text-gray-500">Setting up real-time updates</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-6 text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Conversations</h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <Button onClick={onManualRefresh} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </Card>
    );
  }

  return (
    <div className="h-full flex">
      {/* Conversations List */}
      <div className="w-80 border-r bg-white flex flex-col">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Conversations</h2>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{totalConversations}</Badge>
              <Button 
                onClick={onManualRefresh}
                variant="ghost" 
                size="sm"
                className="p-2"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {/* Unread summary */}
          {conversations.some(c => c.unreadCount > 0) && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-red-600" />
                <span className="text-sm font-medium text-red-800">
                  {conversations.reduce((sum, c) => sum + c.unreadCount, 0)} unread messages
                </span>
              </div>
            </div>
          )}
        </div>
        
        <div className="flex-1 overflow-auto">
          <ConversationsList
            conversations={conversations}
            selectedConversationId={selectedConversation?.leadId || null}
            onSelectConversation={onSelectConversation}
            userRole={profile?.role || 'user'}
            userId={profile?.id || ''}
          />
        </div>
      </div>

      {/* Chat View */}
      <div className="flex-1 flex flex-col">
        <EnhancedChatView
          selectedConversation={selectedConversation}
          messages={messages}
          onSendMessage={onSendMessage}
          showTemplates={showTemplates}
          onToggleTemplates={() => setShowTemplates(!showTemplates)}
          user={profile ? { role: profile.role || 'user', id: profile.id } : { role: 'user', id: '' }}
          isLoading={messagesLoading || sendingMessage}
        />
      </div>

      {/* Debug Panel */}
      <MessageDebugPanel
        selectedLeadId={selectedLeadId}
        messages={messages}
        conversations={conversations}
        onRefresh={onManualRefresh}
      />
    </div>
  );
};

export default ConsolidatedSmartInbox;
