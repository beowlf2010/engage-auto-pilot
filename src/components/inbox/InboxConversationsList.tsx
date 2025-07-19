
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MessageSquare, Phone, Clock, CheckCheck, AlertTriangle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface InboxConversationsListProps {
  conversations: any[];
  selectedConversationId: string | null;
  onConversationSelect: (conversation: any) => void;
  loading: boolean;
  searchQuery: string;
  onMarkAsRead: (leadId: string) => Promise<void>;
  isMarkingAsRead: boolean;
}

const InboxConversationsList = ({
  conversations,
  selectedConversationId,
  onConversationSelect,
  loading,
  searchQuery,
  onMarkAsRead,
  isMarkingAsRead
}: InboxConversationsListProps) => {
  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-sm text-gray-500">Loading conversations...</p>
        </div>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="text-center">
          <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No conversations found</h3>
          <p className="text-gray-500">
            {searchQuery ? 'Try adjusting your search or filters' : 'New conversations will appear here'}
          </p>
        </div>
      </div>
    );
  }

  // Show debug info at the top
  const totalUnread = conversations.reduce((sum, conv) => sum + (conv.unreadCount || 0), 0);

  return (
    <div className="h-full overflow-y-auto">
      {/* Debug info */}
      <div className="p-3 bg-blue-50 border-b text-xs text-blue-700">
        <div className="flex justify-between items-center">
          <span>📊 {conversations.length} conversations loaded</span>
          <span>🔴 {totalUnread} total unread messages</span>
        </div>
      </div>
      
      <div className="p-4 space-y-2">
        {conversations.map((conversation) => (
          <Card 
            key={conversation.leadId}
            className={`cursor-pointer transition-all hover:shadow-md ${
              selectedConversationId === conversation.leadId ? 'ring-2 ring-blue-500 bg-blue-50' : ''
            } ${conversation.unreadCount > 0 ? 'border-l-4 border-l-red-500' : ''}`}
            onClick={() => onConversationSelect(conversation)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <h3 className="font-semibold text-gray-900 truncate">
                      {conversation.leadName}
                    </h3>
                    {conversation.unreadCount > 0 && (
                      <>
                        <Badge variant="destructive" className="text-xs">
                          {conversation.unreadCount}
                        </Badge>
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                      </>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2 text-sm text-gray-600 mb-2">
                    <Phone className="h-3 w-3" />
                    <span>{conversation.leadPhone}</span>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-2">
                    <strong>Interest:</strong> {conversation.vehicleInterest}
                  </p>
                  
                  <p className="text-sm text-gray-800 line-clamp-2 mb-2">
                    {conversation.lastMessage}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1 text-xs text-gray-500">
                      <Clock className="h-3 w-3" />
                      <span>{conversation.lastMessageTime}</span>
                      <span className="text-blue-500">
                        • {conversation.messageCount || 0} messages
                      </span>
                    </div>
                    
                    {conversation.unreadCount > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onMarkAsRead(conversation.leadId);
                        }}
                        disabled={isMarkingAsRead}
                        className="text-xs h-6 px-2"
                      >
                        <CheckCheck className="h-3 w-3 mr-1" />
                        Mark Read
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default InboxConversationsList;
