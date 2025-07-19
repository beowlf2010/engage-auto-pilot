
import React, { memo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MessageSquare, Phone, Clock, CheckCheck } from 'lucide-react';

interface ConversationItemProps {
  conversation: {
    leadId: string;
    leadName: string;
    leadPhone: string;
    vehicleInterest: string;
    lastMessage: string;
    lastMessageTime: string;
    unreadCount: number;
  };
  isSelected: boolean;
  onSelect: (conversation: any) => void;
  onMarkAsRead: (leadId: string) => void;
  isMarkingAsRead: boolean;
}

const OptimizedConversationItem = memo<ConversationItemProps>(({
  conversation,
  isSelected,
  onSelect,
  onMarkAsRead,
  isMarkingAsRead
}) => {
  const handleSelect = () => onSelect(conversation);
  const handleMarkAsRead = (e: React.MouseEvent) => {
    e.stopPropagation();
    onMarkAsRead(conversation.leadId);
  };

  return (
    <Card 
      className={`cursor-pointer transition-all hover:shadow-md ${
        isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : ''
      }`}
      onClick={handleSelect}
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
              
              {conversation.unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleMarkAsRead}
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
  );
});

OptimizedConversationItem.displayName = 'OptimizedConversationItem';

export default OptimizedConversationItem;
