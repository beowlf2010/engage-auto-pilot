
import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  MessageSquare, 
  Clock, 
  User, 
  ChevronDown, 
  ChevronRight, 
  Search,
  Tag,
  AlertCircle,
  ArrowLeft
} from 'lucide-react';
import { sanitizeSearchHighlight } from '@/utils/sanitization';

interface ThreadMessage {
  messageId: string;
  content: string;
  direction: 'in' | 'out';
  timestamp: Date;
  aiGenerated: boolean;
  threadPosition: number;
  sentiment?: string;
  intent?: string;
}

interface MessageThread {
  threadId: string;
  leadId: string;
  subject: string;
  participants: string[];
  messageCount: number;
  lastMessageAt: Date;
  firstMessageAt: Date;
  threadType: 'conversation' | 'follow_up' | 'appointment' | 'vehicle_inquiry';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'active' | 'resolved' | 'archived';
  messages: ThreadMessage[];
  summary?: string;
  tags: string[];
  relatedThreads: string[];
}

interface MessageThreadViewProps {
  thread: MessageThread;
  onBack?: () => void;
  onMessageClick?: (messageId: string) => void;
  onSearchInThread?: (query: string) => void;
  highlightedTerms?: string[];
  compact?: boolean;
}

const MessageThreadView: React.FC<MessageThreadViewProps> = ({
  thread,
  onBack,
  onMessageClick,
  onSearchInThread,
  highlightedTerms = [],
  compact = false
}) => {
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  const toggleMessageExpansion = (messageId: string) => {
    setExpandedMessages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });
  };

  const handleSearchInThread = () => {
    if (searchQuery.trim()) {
      onSearchInThread?.(searchQuery);
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    return timestamp.toLocaleString();
  };

  const getThreadTypeIcon = (type: string) => {
    switch (type) {
      case 'appointment': return '📅';
      case 'vehicle_inquiry': return '🚗';
      case 'follow_up': return '📞';
      default: return '💬';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-600 bg-red-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100';
      case 'resolved': return 'text-blue-600 bg-blue-100';
      case 'archived': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const highlightContent = (content: string) => {
    if (highlightedTerms.length === 0) return content;
    
    let highlighted = content;
    highlightedTerms.forEach(term => {
      const regex = new RegExp(`(${term})`, 'gi');
      highlighted = highlighted.replace(regex, '<mark class="bg-yellow-200">$1</mark>');
    });
    
    return highlighted;
  };

  return (
    <Card className="w-full h-full flex flex-col">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            {onBack && (
              <Button variant="ghost" size="sm" onClick={onBack}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            
            <div>
              <CardTitle className="flex items-center gap-2">
                <span>{getThreadTypeIcon(thread.threadType)}</span>
                {thread.subject}
              </CardTitle>
              
              <div className="flex items-center gap-2 mt-2 text-sm text-gray-600">
                <Badge className={getPriorityColor(thread.priority)}>
                  {thread.priority}
                </Badge>
                <Badge className={getStatusColor(thread.status)}>
                  {thread.status}
                </Badge>
                <span>{thread.messageCount} messages</span>
                <span>•</span>
                <span>Lead {thread.leadId.slice(0, 8)}...</span>
              </div>
            </div>
          </div>

          {thread.priority === 'urgent' && (
            <Badge variant="destructive">
              <AlertCircle className="h-3 w-3 mr-1" />
              Urgent
            </Badge>
          )}
        </div>

        {/* Thread Summary */}
        {thread.summary && (
          <div className="mt-3 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">{thread.summary}</p>
          </div>
        )}

        {/* Tags */}
        {thread.tags.length > 0 && (
          <div className="flex items-center gap-2 mt-3">
            <Tag className="h-4 w-4 text-gray-400" />
            {thread.tags.map((tag, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Search in Thread */}
        <div className="flex gap-2 mt-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearchInThread()}
              placeholder="Search in this thread..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm"
            />
          </div>
          <Button size="sm" onClick={handleSearchInThread}>
            Search
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto space-y-3">
        {thread.messages.map((message) => {
          const isExpanded = expandedMessages.has(message.messageId);
          const shouldTruncate = message.content.length > 200 && !isExpanded;
          
          return (
            <div
              key={message.messageId}
              className={`p-3 rounded-lg cursor-pointer transition-colors ${
                message.direction === 'in' 
                  ? 'bg-blue-50 border-l-4 border-blue-200' 
                  : 'bg-gray-50 border-l-4 border-gray-200'
              }`}
              onClick={() => onMessageClick?.(message.messageId)}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Badge 
                    variant={message.direction === 'in' ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    {message.direction === 'in' ? 'Incoming' : 'Outgoing'}
                  </Badge>
                  
                  {message.aiGenerated && (
                    <Badge variant="outline" className="text-xs">
                      AI Generated
                    </Badge>
                  )}
                  
                  {message.intent && (
                    <Badge variant="outline" className="text-xs">
                      {message.intent}
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Clock className="h-3 w-3" />
                  {formatTimestamp(message.timestamp)}
                  
                  {message.sentiment && (
                    <span className="ml-2">
                      {message.sentiment === 'positive' ? '😊' : 
                       message.sentiment === 'negative' ? '😞' : '😐'}
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <div 
                  className={`${compact ? 'text-sm' : 'text-base'} leading-relaxed`}
                  dangerouslySetInnerHTML={{ 
                    __html: sanitizeSearchHighlight(highlightContent(
                      shouldTruncate 
                        ? message.content.substring(0, 200) + '...' 
                        : message.content
                    ))
                  }}
                />

                {message.content.length > 200 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleMessageExpansion(message.messageId);
                    }}
                    className="text-blue-600 hover:text-blue-800 p-0 h-auto"
                  >
                    {isExpanded ? (
                      <>
                        <ChevronDown className="h-3 w-3 mr-1" />
                        Show less
                      </>
                    ) : (
                      <>
                        <ChevronRight className="h-3 w-3 mr-1" />
                        Show more
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          );
        })}

        {thread.messages.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No messages in this thread</p>
          </div>
        )}
      </CardContent>

      {/* Related Threads */}
      {thread.relatedThreads.length > 0 && (
        <div className="border-t p-4">
          <h4 className="font-medium text-sm text-gray-700 mb-2">Related Threads</h4>
          <div className="flex gap-2 flex-wrap">
            {thread.relatedThreads.slice(0, 3).map((relatedThreadId, index) => (
              <Badge key={index} variant="outline" className="text-xs cursor-pointer hover:bg-gray-100">
                Thread {relatedThreadId.slice(0, 8)}...
              </Badge>
            ))}
            {thread.relatedThreads.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{thread.relatedThreads.length - 3} more
              </Badge>
            )}
          </div>
        </div>
      )}
    </Card>
  );
};

export default MessageThreadView;
