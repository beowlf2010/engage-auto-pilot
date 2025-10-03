
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
    <div className="h-full overflow-y-auto bg-gradient-to-b from-gray-50/50 to-white dark:from-gray-900/50 dark:to-gray-800">
      {/* Modern Header with Glass Effect */}
      <div className="sticky top-0 z-10 p-3 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-700/30 flex justify-between items-center shadow-sm">
        <span className="text-xs font-medium text-muted-foreground">
          {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
        </span>
        <Button
          onClick={handleRefresh}
          disabled={isRefreshing}
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 hover:bg-primary/10 transition-all duration-300"
        >
          {isRefreshing ? (
            <RefreshCw className="h-3.5 w-3.5 animate-spin text-primary" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>

      <div className="p-3 space-y-3">
        {conversations.map((conversation, index) => (
          <div
            key={conversation.leadId}
            className="animate-in fade-in-0 slide-in-from-bottom-2"
            style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'backwards' }}
          >
            <Card 
              className={`group cursor-pointer transition-all duration-300 ease-out hover:scale-[1.02] hover:-translate-y-0.5 
                ${selectedLead === conversation.leadId 
                  ? 'ring-2 ring-primary shadow-lg shadow-primary/20 bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl' 
                  : 'bg-white/70 dark:bg-gray-800/70 backdrop-blur-lg hover:bg-white/90 dark:hover:bg-gray-800/90 hover:shadow-xl'
                }
                ${conversation.unreadCount > 0 ? 'border-l-4 border-primary shadow-lg shadow-primary/10' : 'border border-gray-200/50 dark:border-gray-700/30'}
              `}
              onClick={() => onSelectConversation(conversation.leadId)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="font-semibold text-foreground truncate text-base">
                        {conversation.leadName}
                      </h3>
                      {conversation.unreadCount > 0 && (
                        <Badge 
                          variant="default" 
                          className="text-xs px-2 py-0.5 bg-gradient-to-r from-primary to-blue-600 shadow-md shadow-primary/30 animate-pulse-glow"
                        >
                          {conversation.unreadCount}
                        </Badge>
                      )}
                      {showUrgencyIndicator && conversation.unreadCount > 0 && (
                        <div className="relative">
                          <AlertTriangle className="h-4 w-4 text-destructive animate-pulse" />
                          <div className="absolute inset-0 h-4 w-4 text-destructive blur-sm opacity-50 animate-pulse" />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-2 text-xs text-muted-foreground mb-2">
                      <Phone className="h-3.5 w-3.5" />
                      <span className="font-medium">{conversation.leadPhone}</span>
                    </div>
                    
                    {conversation.vehicleInterest && (
                      <div className="mb-2 px-2 py-1 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-md border border-blue-100 dark:border-blue-800/30">
                        <p className="text-xs text-foreground/80">
                          <span className="font-semibold text-primary">Interest:</span> {conversation.vehicleInterest}
                        </p>
                      </div>
                    )}
                    
                    <p className="text-sm text-foreground/70 line-clamp-2 mb-3 leading-relaxed">
                      {conversation.lastMessage}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1.5 text-xs text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
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
                          className="text-xs h-7 px-3 hover:bg-primary/10 hover:text-primary transition-all duration-300 opacity-0 group-hover:opacity-100"
                        >
                          <CheckCheck className="h-3.5 w-3.5 mr-1" />
                          Mark Read
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ConversationsList;
