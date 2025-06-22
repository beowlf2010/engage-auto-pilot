
import React from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, AlertCircle, Inbox } from 'lucide-react';
import ConversationsList from './ConversationsList';
import type { ConversationListItem } from '@/hooks/conversation/conversationTypes';

interface EnhancedInboxTabsProps {
  conversations: ConversationListItem[];
  selectedLead: string | null;
  onSelectConversation: (leadId: string) => Promise<void>;
  canReply: (conversation: ConversationListItem) => boolean;
}

const EnhancedInboxTabs: React.FC<EnhancedInboxTabsProps> = ({
  conversations,
  selectedLead,
  onSelectConversation,
  canReply
}) => {
  // Filter unread incoming messages (highest priority)
  const unreadIncoming = conversations.filter(conv => 
    conv.unreadCount > 0 && conv.lastMessageDirection === 'in'
  );

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
  const sortedUnreadIncoming = [...unreadIncoming].sort((a, b) => {
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

  return (
    <Tabs defaultValue="unread" className="w-full">
      <TabsList className="grid w-full grid-cols-3 bg-gray-100">
        <TabsTrigger value="unread" className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span>Unread</span>
          {unreadIncoming.length > 0 && (
            <Badge variant="destructive" className="text-xs">
              {unreadIncoming.length}
            </Badge>
          )}
        </TabsTrigger>
        
        <TabsTrigger value="incoming" className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4" />
          <span>All Incoming</span>
          <Badge variant="secondary" className="text-xs">
            {allIncoming.length}
          </Badge>
        </TabsTrigger>
        
        <TabsTrigger value="all" className="flex items-center gap-2">
          <Inbox className="w-4 h-4" />
          <span>All Conversations</span>
          <Badge variant="outline" className="text-xs">
            {conversations.length}
          </Badge>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="unread" className="mt-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between px-2 py-1 bg-red-50 border border-red-200 rounded">
            <span className="text-sm font-medium text-red-800">
              🚨 Urgent: Unread Customer Messages
            </span>
            <span className="text-xs text-red-600">
              {unreadIncoming.length} need attention
            </span>
          </div>
          
          <ConversationsList
            conversations={sortedUnreadIncoming}
            selectedLead={selectedLead}
            onSelectConversation={onSelectConversation}
            canReply={canReply}
            showUrgencyIndicator={true}
          />
        </div>
      </TabsContent>

      <TabsContent value="incoming" className="mt-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between px-2 py-1 bg-blue-50 border border-blue-200 rounded">
            <span className="text-sm font-medium text-blue-800">
              📥 All Customer Messages
            </span>
            <span className="text-xs text-blue-600">
              Last customer message shown first
            </span>
          </div>
          
          <ConversationsList
            conversations={sortedAllIncoming}
            selectedLead={selectedLead}
            onSelectConversation={onSelectConversation}
            canReply={canReply}
            showTimestamps={true}
          />
        </div>
      </TabsContent>

      <TabsContent value="all" className="mt-4">
        <ConversationsList
          conversations={conversations}
          selectedLead={selectedLead}
          onSelectConversation={onSelectConversation}
          canReply={canReply}
        />
      </TabsContent>
    </Tabs>
  );
};

export default EnhancedInboxTabs;
