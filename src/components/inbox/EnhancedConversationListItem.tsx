
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { 
  AlertCircle, 
  Bot, 
  Clock, 
  MessageSquare, 
  Star,
  Eye,
  EyeOff,
  ArrowDown,
  ArrowUp,
  Loader2
} from 'lucide-react';
import type { ConversationListItem } from '@/types/conversation';

interface EnhancedConversationListItemProps {
  conversation: ConversationListItem;
  isSelected: boolean;
  onSelect: (leadId: string) => void;
  canReply: boolean;
  markAsRead: (leadId: string) => Promise<void>;
  isMarkingAsRead: boolean;
  predictions?: any[];
  viewMode: 'list' | 'grid' | 'thread';
}

const EnhancedConversationListItem: React.FC<EnhancedConversationListItemProps> = ({
  conversation,
  isSelected,
  onSelect,
  canReply,
  markAsRead,
  isMarkingAsRead,
  predictions = [],
  viewMode
}) => {
  const prediction = predictions.find(p => p.leadId === conversation.leadId);
  const isUrgent = conversation.status === 'urgent' || conversation.aiStage === 'urgent';
  const hasUnread = conversation.unreadCount > 0;
  
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString();
  };

  const handleMarkAsRead = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasUnread && !isMarkingAsRead) {
      await markAsRead(conversation.leadId);
    }
  };

  const getGridLayoutClass = () => {
    if (viewMode === 'grid') {
      return 'p-4 rounded-lg';
    }
    return 'p-3 border-b border-gray-100';
  };

  const getSelectionClass = () => {
    if (isSelected) {
      return 'bg-blue-50 border-l-4 border-l-blue-500';
    }
    if (hasUnread) {
      return 'bg-blue-25 hover:bg-blue-50';
    }
    return 'hover:bg-gray-50';
  };

  return (
    <div
      onClick={() => onSelect(conversation.leadId)}
      className={`
        cursor-pointer transition-all duration-200 relative
        ${getGridLayoutClass()}
        ${getSelectionClass()}
        ${isUrgent ? 'border-l-2 border-l-red-400' : ''}
      `}
    >
      {/* Prediction indicator */}
      {prediction?.shouldPreload && (
        <div className="absolute top-2 right-2">
          <div className={`w-2 h-2 rounded-full ${
            prediction.confidenceLevel > 0.8 ? 'bg-green-400' : 
            prediction.confidenceLevel > 0.6 ? 'bg-yellow-400' : 'bg-blue-400'
          }`} title={`AI Prediction: ${(prediction.confidenceLevel * 100).toFixed(0)}% confidence`} />
        </div>
      )}

      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          {/* Header with name and time */}
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <h3 className={`font-medium truncate ${hasUnread ? 'font-semibold' : ''}`}>
                {conversation.leadName || 'Unknown Lead'}
              </h3>
              
              {/* Status badges */}
              <div className="flex items-center gap-1">
                {isUrgent && (
                  <AlertCircle className="h-3 w-3 text-red-500" />
                )}
                {conversation.aiOptIn && (
                  <Bot className="h-3 w-3 text-purple-500" />
                )}
                {hasUnread && (
                  <Badge variant="secondary" className="text-xs px-1">
                    {conversation.unreadCount}
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-gray-500">
              {formatTime(conversation.lastMessageTime)}
              
              {/* Message direction indicator */}
              {conversation.lastMessageDirection === 'in' ? (
                <ArrowDown className="h-3 w-3 text-green-500" />
              ) : conversation.lastMessageDirection === 'out' ? (
                <ArrowUp className="h-3 w-3 text-blue-500" />
              ) : null}
            </div>
          </div>

          {/* Last message preview */}
          <p className={`text-sm text-gray-600 truncate mb-2 ${hasUnread ? 'font-medium' : ''}`}>
            {conversation.lastMessage || 'No messages yet'}
          </p>

          {/* Metadata row */}
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <MessageSquare className="h-3 w-3" />
                {conversation.messageCount}
              </span>
              
              {conversation.vehicleInterest && (
                <span className="truncate max-w-20" title={conversation.vehicleInterest}>
                  🚗 {conversation.vehicleInterest}
                </span>
              )}
              
              {conversation.salespersonName && canReply && (
                <span className="truncate max-w-20" title={conversation.salespersonName}>
                  👤 {conversation.salespersonName}
                </span>
              )}
            </div>

            {/* Read/Unread toggle */}
            {hasUnread && (
              <button
                onClick={handleMarkAsRead}
                disabled={isMarkingAsRead}
                className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                title="Mark as read"
              >
                {isMarkingAsRead ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <EyeOff className="h-3 w-3" />
                )}
              </button>
            )}
          </div>

          {/* AI Stage indicator */}
          {conversation.aiStage && (
            <div className="mt-2">
              <Badge 
                variant="outline" 
                className="text-xs"
              >
                AI: {conversation.aiStage}
              </Badge>
            </div>
          )}
        </div>
      </div>

      {/* Grid view additional info */}
      {viewMode === 'grid' && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Lead Source: {conversation.leadSource || 'Unknown'}</span>
            <span>Messages: {conversation.incomingCount || 0} in / {conversation.outgoingCount || 0} out</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedConversationListItem;
