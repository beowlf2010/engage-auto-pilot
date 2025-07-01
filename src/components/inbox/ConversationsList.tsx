
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MessageSquare, Phone, Clock, CheckCheck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ConversationListItem } from '@/types/conversation';

interface ConversationsListProps {
  conversations: ConversationListItem[];
  selectedConversationId?: string | null;
  selectedLead?: string | null; // Add this for backward compatibility
  onSelectConversation: (conversation: ConversationListItem) => void;
  userRole?: string;
  userId?: string;
  canReply?: (conversation: ConversationListItem) => boolean;
  markAsRead?: (leadId: string) => Promise<void>;
  markingAsRead?: string | null;
  showUrgencyIndicator?: boolean;
  showTimestamps?: boolean;
}

const ConversationsList = ({
  conversations,
  selectedConversationId,
  selectedLead,
  onSelectConversation,
  userRole = 'user',
  userId = '',
  canReply = () => true,
  markAsRead,
  markingAsRead,
  showUrgencyIndicator = false,
  showTimestamps = false
}: ConversationsListProps) => {
  // Use either selectedConversationId or selectedLead for compatibility
  const selectedId = selectedConversationId || selectedLead;

  if (conversations.length === 0) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="text-center">
          <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No conversations found</h3>
          <p className="text-gray-500">New conversations will appear here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 space-y-2">
        {conversations.map((conversation) => (
          <Card 
            key={conversation.leadId}
            className={`cursor-pointer transition-all hover:shadow-md ${
              selectedId === conversation.leadId ? 'ring-2 ring-blue-500 bg-blue-50' : ''
            }`}
            onClick={() => onSelectConversation(conversation)}
          >
            <CardContent className="p-4">
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
                    {showUrgencyIndicator && conversation.unreadCount > 3 && (
                      <Badge variant="destructive" className="text-xs bg-red-600">
                        URGENT
                      </Badge>
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
                      {showTimestamps && conversation.lastMessageDate && (
                        <span className="ml-2">
                          ({formatDistanceToNow(conversation.lastMessageDate, { addSuffix: true })})
                        </span>
                      )}
                    </div>
                    
                    {conversation.unreadCount > 0 && markAsRead && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsRead(conversation.leadId);
                        }}
                        disabled={markingAsRead === conversation.leadId}
                        className="text-xs h-6 px-2"
                      >
                        <CheckCheck className="h-3 w-3 mr-1" />
                        {markingAsRead === conversation.leadId ? 'Marking...' : 'Mark Read'}
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
