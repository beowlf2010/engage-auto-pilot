
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MessageSquare, Phone, Clock, CheckCheck, RefreshCw, AlertTriangle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useManualRefresh } from '@/hooks/useManualRefresh';
import type { ConversationListItem } from '@/hooks/conversation/conversationTypes';

interface ConversationsListProps {
  conversations: ConversationListItem[];
  selectedLead?: string | null;
  onSelectConversation: (leadId: string) => void;
  canReply?: (conversation: ConversationListItem) => boolean;
  showUrgencyIndicator?: boolean;
  showTimestamps?: boolean;
  markAsRead?: (leadId: string) => Promise<void>;
  isMarkingAsRead?: boolean;
}

const ConversationsList: React.FC<ConversationsListProps> = ({
  conversations,
  selectedLead,
  onSelectConversation,
  canReply,
  showUrgencyIndicator = false,
  showTimestamps = false,
  markAsRead,
  isMarkingAsRead
}) => {
  const { handleRefresh, isRefreshing } = useManualRefresh({
    onRefresh: () => {
      // Force a page refresh to ensure latest data
      window.location.reload();
    },
    refreshMessage: "Conversations refreshed"
  });

  const getUrgencyColor = (conversation: ConversationListItem) => {
    if (!showUrgencyIndicator) return '';

    // Red only when there are unread messages
    if (conversation.unreadCount > 0) return 'border-l-4 border-red-500';

    return '';
  };

  if (conversations.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8">
        <div className="text-center">
          <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No conversations found</h3>
          <p className="text-gray-500 mb-4">New conversations will appear here</p>
          <Button
            onClick={handleRefresh}
            disabled={isRefreshing}
            variant="outline"
            size="sm"
          >
            {isRefreshing ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Refresh
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      {/* Manual Refresh Button */}
      <div className="p-2 border-b bg-gray-50 flex justify-between items-center">
        <span className="text-xs text-gray-600">
          {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
        </span>
        <Button
          onClick={handleRefresh}
          disabled={isRefreshing}
          variant="ghost"
          size="sm"
        >
          {isRefreshing ? (
            <RefreshCw className="h-3 w-3 animate-spin" />
          ) : (
            <RefreshCw className="h-3 w-3" />
          )}
        </Button>
      </div>

      <div className="p-2 space-y-2">
        {conversations.map((conversation) => (
          <Card 
            key={conversation.leadId}
            className={`cursor-pointer transition-all hover:shadow-md ${
              selectedLead === conversation.leadId ? 'ring-2 ring-blue-500 bg-blue-50' : ''
            } ${getUrgencyColor(conversation)}`}
            onClick={() => onSelectConversation(conversation.leadId)}
          >
            <CardContent className="p-3">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <h3 className="font-semibold text-gray-900 truncate">
                      {conversation.leadName}
                    </h3>
                    {conversation.unreadCount > 0 && (
                      <Badge variant="destructive" className="text-xs">
                        {conversation.unreadCount}
                      </Badge>
                    )}
                    {showUrgencyIndicator && conversation.unreadCount > 0 && (
                      <AlertTriangle className="h-3 w-3 text-red-500" />
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2 text-xs text-gray-600 mb-1">
                    <Phone className="h-3 w-3" />
                    <span>{conversation.leadPhone}</span>
                  </div>
                  
                  {conversation.vehicleInterest && (
                    <p className="text-xs text-gray-600 mb-2">
                      <strong>Interest:</strong> {conversation.vehicleInterest}
                    </p>
                  )}
                  
                  <p className="text-sm text-gray-800 line-clamp-2 mb-2">
                    {conversation.lastMessage}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1 text-xs text-gray-500">
                      <Clock className="h-3 w-3" />
                      <span>
                        {showTimestamps && conversation.lastMessageDate
                          ? formatDistanceToNow(conversation.lastMessageDate, { addSuffix: true })
                          : conversation.lastMessageTime
                        }
                      </span>
                    </div>
                    
                    {conversation.unreadCount > 0 && markAsRead && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsRead(conversation.leadId);
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

export default ConversationsList;
