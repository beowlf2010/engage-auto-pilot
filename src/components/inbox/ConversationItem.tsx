
import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Phone, MessageSquare, Clock, CheckCircle, Loader2 } from 'lucide-react';
import { ConversationListItem } from '@/types/conversation';

interface ConversationItemProps {
  conversation: ConversationListItem;
  isSelected: boolean;
  onSelect: () => void;
  canReply: boolean;
  markAsRead: (leadId: string) => Promise<void>;
  isMarkingAsRead: boolean;
}

const ConversationItem: React.FC<ConversationItemProps> = ({
  conversation,
  isSelected,
  onSelect,
  canReply,
  markAsRead,
  isMarkingAsRead
}) => {
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const getTimeAgo = (dateString: string) => {
    if (!dateString || dateString === 'Never') return 'Never';
    
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffHours / 24);
      
      if (diffDays > 0) return `${diffDays}d ago`;
      if (diffHours > 0) return `${diffHours}h ago`;
      return 'Recently';
    } catch {
      return 'Recently';
    }
  };

  const handleMarkAsRead = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await markAsRead(conversation.leadId);
  };

  return (
    <Card 
      className={`p-3 cursor-pointer transition-all hover:shadow-md ${
        isSelected 
          ? 'ring-2 ring-blue-500 border-blue-200' 
          : conversation.unreadCount > 0 
            ? 'border-l-4 border-l-red-400 bg-red-50' 
            : 'border-gray-200'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-start space-x-3">
        {/* Avatar */}
        <Avatar className="w-10 h-10 flex-shrink-0">
          <AvatarFallback className="bg-blue-100 text-blue-700 text-sm font-medium">
            {getInitials(conversation.leadName)}
          </AvatarFallback>
        </Avatar>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between mb-1">
            <h4 className="font-medium text-gray-900 truncate">
              {conversation.leadName}
            </h4>
            <div className="flex items-center space-x-1 flex-shrink-0">
              {conversation.unreadCount > 0 && (
                <>
                  <Badge variant="destructive" className="text-xs px-1.5 py-0.5">
                    {conversation.unreadCount}
                  </Badge>
                  <Button
                    onClick={handleMarkAsRead}
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    disabled={isMarkingAsRead}
                  >
                    {isMarkingAsRead ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <CheckCircle className="w-3 h-3" />
                    )}
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Vehicle Interest & Source */}
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-gray-600 truncate flex-1">
              {conversation.vehicleInterest}
            </span>
            {conversation.leadSource && (
              <Badge variant="outline" className="text-xs">
                {conversation.leadSource}
              </Badge>
            )}
          </div>

          {/* Last Message */}
          <p className="text-sm text-gray-700 line-clamp-2 mb-2">
            {conversation.lastMessage}
          </p>

          {/* Footer */}
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center space-x-3">
              <div className="flex items-center">
                <Phone className="w-3 h-3 mr-1" />
                <span className="truncate">
                  {conversation.primaryPhone?.slice(-4) || 'No phone'}
                </span>
              </div>
              
              <div className="flex items-center">
                <MessageSquare className="w-3 h-3 mr-1" />
                <span>{conversation.messageCount || 0}</span>
              </div>

              {conversation.salespersonName && (
                <div className="truncate">
                  Rep: {conversation.salespersonName}
                </div>
              )}
            </div>

            <div className="flex items-center">
              <Clock className="w-3 h-3 mr-1" />
              <span>{getTimeAgo(conversation.lastMessageTime)}</span>
            </div>
          </div>

          {/* Direction Indicator */}
          {conversation.lastMessageDirection && (
            <div className={`mt-1 text-xs ${
              conversation.lastMessageDirection === 'in' 
                ? 'text-blue-600' 
                : 'text-green-600'
            }`}>
              {conversation.lastMessageDirection === 'in' ? '← Customer' : '→ You'}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

export default ConversationItem;
