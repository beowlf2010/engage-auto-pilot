
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MessageSquare, Phone, Clock, CheckCheck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ConversationListItem } from '@/types/conversation';

interface ConversationsListProps {
  conversations: ConversationListItem[];
  selectedConversationId: string | null;
  onSelectConversation: (conversation: ConversationListItem) => void;
  userRole: string;
  userId: string;
}

const ConversationsList = ({
  conversations,
  selectedConversationId,
  onSelectConversation,
  userRole,
  userId
}: ConversationsListProps) => {
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
              selectedConversationId === conversation.leadId ? 'ring-2 ring-blue-500 bg-blue-50' : ''
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
                    </div>
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
