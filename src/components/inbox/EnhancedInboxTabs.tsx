import React from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, AlertCircle, Inbox } from 'lucide-react';
import ConversationsList from './ConversationsList';
import { ConversationListSkeleton } from '@/components/ui/skeletons/ConversationSkeleton';
import type { ConversationListItem } from '@/hooks/conversation/conversationTypes';

interface EnhancedInboxTabsProps {
  conversations: ConversationListItem[];
  selectedLead: string | null;
  onSelectConversation: (leadId: string) => Promise<void>;
  canReply: (conversation: ConversationListItem) => boolean;
  markAsRead: (leadId: string) => Promise<void>;
  markingAsRead: string | null;
  loading?: boolean;
}

const EnhancedInboxTabs: React.FC<EnhancedInboxTabsProps> = ({
  conversations,
  selectedLead,
  onSelectConversation,
  canReply,
  markAsRead,
  markingAsRead,
  loading = false
}) => {
  // Filter ALL conversations with unread messages (regardless of last message direction)
  const unreadConversations = conversations.filter(conv => conv.unreadCount > 0);

  // Filter all conversations with incoming messages
  const allIncoming = conversations.filter(conv => 
    conv.lastMessageDirection === 'in'
  );

  // Calculate urgency levels for unread messages
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

  // Create wrapper function to match expected signature
  const handleConversationSelect = (conversation: ConversationListItem) => {
    onSelectConversation(conversation.leadId);
  };

  return (
    <Tabs defaultValue="unread" className="w-full">
      <TabsList className="grid w-full grid-cols-3 bg-gray-100">
        <TabsTrigger value="unread" className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span>Unread</span>
          {!loading && unreadConversations.length > 0 && (
            <Badge variant="destructive" className="text-xs">
              {unreadConversations.length}
            </Badge>
          )}
        </TabsTrigger>
        
        <TabsTrigger value="incoming" className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4" />
          <span>All Incoming</span>
          {!loading && (
            <Badge variant="secondary" className="text-xs">
              {allIncoming.length}
            </Badge>
          )}
        </TabsTrigger>
        
        <TabsTrigger value="all" className="flex items-center gap-2">
          <Inbox className="w-4 h-4" />
          <span>All Conversations</span>
          {!loading && (
            <Badge variant="outline" className="text-xs">
              {conversations.length}
            </Badge>
          )}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="unread" className="mt-4">
        <div className="space-y-2">
          {!loading && (
            <div className="flex items-center justify-between px-2 py-1 bg-red-50 border border-red-200 rounded">
              <span className="text-sm font-medium text-red-800">
                🚨 Priority: All Unread Messages
              </span>
              <span className="text-xs text-red-600">
                {unreadConversations.length} leads need attention
              </span>
            </div>
          )}
          
          {loading ? (
            <ConversationListSkeleton />
          ) : (
            <ConversationsList
              conversations={sortedUnreadConversations}
              selectedLead={selectedLead}
              onSelectConversation={handleConversationSelect}
              canReply={canReply}
              showUrgencyIndicator={true}
              markAsRead={markAsRead}
              markingAsRead={markingAsRead}
            />
          )}
        </div>
      </TabsContent>

      <TabsContent value="incoming" className="mt-4">
        <div className="space-y-2">
          {!loading && (
            <div className="flex items-center justify-between px-2 py-1 bg-blue-50 border border-blue-200 rounded">
              <span className="text-sm font-medium text-blue-800">
                📥 All Customer Messages
              </span>
              <span className="text-xs text-blue-600">
                Last customer message shown first
              </span>
            </div>
          )}
          
          {loading ? (
            <ConversationListSkeleton />
          ) : (
            <ConversationsList
              conversations={sortedAllIncoming}
              selectedLead={selectedLead}
              onSelectConversation={handleConversationSelect}
              canReply={canReply}
              showTimestamps={true}
              markAsRead={markAsRead}
              markingAsRead={markingAsRead}
            />
          )}
        </div>
      </TabsContent>

      <TabsContent value="all" className="mt-4">
        {loading ? (
          <ConversationListSkeleton />
        ) : (
          <ConversationsList
            conversations={conversations}
            selectedLead={selectedLead}
            onSelectConversation={handleConversationSelect}
            canReply={canReply}
            markAsRead={markAsRead}
            markingAsRead={markingAsRead}
          />
        )}
      </TabsContent>
    </Tabs>
  );
};

export default EnhancedInboxTabs;
