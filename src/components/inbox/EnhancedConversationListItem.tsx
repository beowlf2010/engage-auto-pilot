
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, MessageSquare, User } from 'lucide-react';
import { formatDistanceToNow, isValid, parseISO } from 'date-fns';
import AIInsightIndicator from './AIInsightIndicator';

interface EnhancedConversationListItemProps {
  conversation: any;
  isSelected: boolean;
  onSelect: (leadId: string) => void;
  canReply: boolean;
  markAsRead: (leadId: string) => Promise<void>;
  isMarkingAsRead: boolean;
  predictions?: any[];
  viewMode?: 'list' | 'grid' | 'thread';
}

const EnhancedConversationListItem: React.FC<EnhancedConversationListItemProps> = ({
  conversation,
  isSelected,
  onSelect,
  canReply,
  markAsRead,
  isMarkingAsRead,
  predictions = [],
  viewMode = 'list'
}) => {
  const getInitials = (name?: string) => {
    // Handle null, undefined, empty string, or non-string values
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return 'U';
    }
    
    try {
      const trimmedName = name.trim();
      const nameParts = trimmedName.split(' ').filter(part => part.length > 0);
      
      if (nameParts.length === 0) {
        return 'U';
      }
      
      const initials = nameParts
        .map((part) => part.charAt(0).toUpperCase())
        .join('')
        .substring(0, 2);
      
      return initials || 'U';
    } catch (error) {
      console.warn('Error generating initials for name:', name, error);
      return 'U';
    }
  };

  const formatTime = (timestamp: string | null | undefined) => {
    if (!timestamp) {
      return 'Unknown time';
    }

    try {
      // Try to parse the timestamp
      let date: Date;
      
      if (typeof timestamp === 'string') {
        // Try parsing as ISO string first
        date = parseISO(timestamp);
        
        // If that fails, try creating a new Date
        if (!isValid(date)) {
          date = new Date(timestamp);
        }
      } else {
        date = new Date(timestamp);
      }

      // Check if the date is valid
      if (!isValid(date)) {
        console.warn('Invalid date timestamp:', timestamp);
        return 'Invalid date';
      }

      return formatDistanceToNow(date, { addSuffix: true });
    } catch (error) {
      console.warn('Error formatting time for timestamp:', timestamp, error);
      return 'Time error';
    }
  };

  const handleClick = () => {
    onSelect(conversation.leadId);
  };

  const isFollowUpDue = () => {
    // Implement logic to check if follow-up is due based on conversation data
    return false;
  };

  const handleMarkAsRead = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await markAsRead(conversation.leadId);
  };

  // Safely get the conversation name with fallbacks
  const conversationName = conversation.name || conversation.leadName || 'Unknown';

  return (
    <div
      className={`cursor-pointer transition-all duration-200 ${
        isSelected 
          ? 'bg-blue-50 border-r-2 border-blue-500' 
          : 'hover:bg-gray-50'
      } ${viewMode === 'grid' ? 'p-4 border rounded-lg' : 'p-4 border-b'}`}
      onClick={handleClick}
    >
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium">
            {getInitials(conversationName)}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-semibold text-gray-900 truncate">
              {conversationName}
            </h3>
            <div className="flex items-center space-x-2">
              {/* AI Insights Indicator */}
              <AIInsightIndicator
                leadTemperature={conversation.aiStage}
                urgencyLevel={conversation.priority}
                hasRecommendations={conversation.aiOptIn}
                followUpDue={isFollowUpDue()}
              />
              
              <span className="text-xs text-gray-500">
                {formatTime(conversation.lastMessageTime)}
              </span>
            </div>
          </div>

          <p className="text-sm text-gray-500 truncate">
            {conversation.vehicleInterest && (
              <span className="mr-2">
                🚗 {conversation.vehicleInterest}
              </span>
            )}
            {conversation.lastMessage}
          </p>

          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center space-x-2">
              {conversation.unreadCount > 0 && (
                <Badge variant="secondary">
                  {conversation.unreadCount}
                </Badge>
              )}
              {isMarkingAsRead ? (
                <div className="text-blue-500 animate-pulse">
                  Marking as read...
                </div>
              ) : conversation.unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleMarkAsRead}
                  className="h-6 w-6 p-0"
                >
                  <CheckCircle className="h-4 w-4" />
                </Button>
              )}
              
              {/* AI Status Indicator */}
              {conversation.aiOptIn && (
                <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                  AI Active
                </Badge>
              )}
            </div>

            {canReply ? (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClick}
                className="h-6 w-6 p-0"
              >
                <MessageSquare className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                disabled
                className="h-6 w-6 p-0"
              >
                <MessageSquare className="h-4 w-4 text-gray-400" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedConversationListItem;
