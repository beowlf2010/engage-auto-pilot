
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Send, 
  Smile, 
  Paperclip, 
  MoreVertical, 
  MessageSquare,
  Phone,
  User,
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  Search,
  Filter,
  Bookmark,
  Eye,
  EyeOff
} from 'lucide-react';
import MessageTemplates from '../MessageTemplates';
import type { ConversationListItem, MessageData } from '@/types/conversation';

interface EnhancedChatViewProps {
  selectedConversation: ConversationListItem | undefined;
  messages: MessageData[];
  onSendMessage: (message: string, isTemplate?: boolean) => Promise<void>;
  showTemplates: boolean;
  onToggleTemplates: () => void;
  user: {
    role: string;
    id: string;
  };
  isLoading?: boolean;
  onThreadView?: () => void;
}

const EnhancedChatView: React.FC<EnhancedChatViewProps> = ({
  selectedConversation,
  messages,
  onSendMessage,
  showTemplates,
  onToggleTemplates,
  user,
  isLoading = false,
  onThreadView
}) => {
  const [messageInput, setMessageInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when conversation changes
  useEffect(() => {
    if (selectedConversation && inputRef.current) {
      inputRef.current.focus();
    }
  }, [selectedConversation]);

  const handleSendMessage = async () => {
    if (!messageInput.trim() || isLoading) return;

    const message = messageInput.trim();
    setMessageInput('');
    setIsTyping(false);

    try {
      await onSendMessage(message);
    } catch (error) {
      console.error('Failed to send message:', error);
      // Restore message input on error
      setMessageInput(message);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatMessageDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  };

  // Group messages by date
  const groupedMessages = useMemo(() => {
    const groups: { [key: string]: MessageData[] } = {};
    
    messages.forEach(message => {
      const dateKey = new Date(message.sentAt).toDateString();
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(message);
    });

    return Object.entries(groups).sort(([a], [b]) => 
      new Date(a).getTime() - new Date(b).getTime()
    );
  }, [messages]);

  if (!selectedConversation) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center text-gray-500">
          <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium mb-2">No conversation selected</h3>
          <p>Choose a conversation from the sidebar to start messaging</p>
        </div>
      </div>
    );
  }

  const canReply = user.role === "manager" || user.role === "admin" || 
    !selectedConversation.salespersonId || selectedConversation.salespersonId === user.id;

  return (
    <div className="flex-1 flex flex-col bg-white">
      {/* Enhanced header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <User className="h-5 w-5 text-white" />
              </div>
              
              <div>
                <h2 className="font-semibold text-lg">
                  {selectedConversation.leadName || 'Unknown Lead'}
                </h2>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone className="h-3 w-3" />
                  {selectedConversation.primaryPhone}
                  
                  {selectedConversation.vehicleInterest && (
                    <>
                      <span>•</span>
                      <span>🚗 {selectedConversation.vehicleInterest}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Status badges */}
            <div className="flex items-center gap-2">
              {selectedConversation.unreadCount > 0 && (
                <Badge variant="secondary">
                  {selectedConversation.unreadCount} unread
                </Badge>
              )}
              
              {selectedConversation.aiOptIn && (
                <Badge variant="outline" className="bg-purple-50 text-purple-700">
                  AI Enabled
                </Badge>
              )}
              
              {selectedConversation.aiStage && (
                <Badge variant="outline">
                  AI: {selectedConversation.aiStage}
                </Badge>
              )}
            </div>
          </div>

          {/* Header actions */}
          <div className="flex items-center gap-2">
            {onThreadView && (
              <Button
                variant="outline"
                size="sm"
                onClick={onThreadView}
                title="View as threads"
              >
                <MessageSquare className="h-4 w-4" />
              </Button>
            )}
            
            <Button variant="outline" size="sm">
              <Search className="h-4 w-4" />
            </Button>
            
            <Button variant="outline" size="sm">
              <Bookmark className="h-4 w-4" />
            </Button>
            
            <Button variant="ghost" size="sm">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {groupedMessages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No messages yet</p>
              <p className="text-sm">Start the conversation!</p>
            </div>
          </div>
        ) : (
          groupedMessages.map(([dateKey, dateMessages]) => (
            <div key={dateKey}>
              {/* Date separator */}
              <div className="flex items-center justify-center my-6">
                <div className="bg-gray-100 px-3 py-1 rounded-full text-xs text-gray-600">
                  {formatMessageDate(dateKey)}
                </div>
              </div>

              {/* Messages for this date */}
              <div className="space-y-3">
                {dateMessages.map((message, index) => {
                  const isIncoming = message.direction === 'in';
                  const showTime = index === 0 || 
                    new Date(message.sentAt).getTime() - new Date(dateMessages[index - 1].sentAt).getTime() > 300000; // 5 minutes

                  return (
                    <div
                      key={message.id}
                      className={`flex ${isIncoming ? 'justify-start' : 'justify-end'} animate-fade-in`}
                    >
                      <div className={`max-w-xs lg:max-w-md ${isIncoming ? 'order-2' : 'order-1'}`}>
                        <div
                          className={`
                            px-4 py-3 rounded-lg shadow-sm
                            ${isIncoming 
                              ? 'bg-gray-100 text-gray-900' 
                              : 'bg-blue-600 text-white'
                            }
                            ${message.aiGenerated ? 'border-l-4 border-purple-400' : ''}
                          `}
                        >
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">
                            {message.body}
                          </p>
                          
                          {message.aiGenerated && (
                            <div className="mt-2 pt-2 border-t border-purple-200">
                              <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700">
                                AI Generated
                              </Badge>
                            </div>
                          )}
                        </div>

                        {showTime && (
                          <div className={`flex items-center gap-2 mt-1 text-xs text-gray-500 ${
                            isIncoming ? 'justify-start' : 'justify-end'
                          }`}>
                            <span>{formatMessageTime(message.sentAt)}</span>
                            {!isIncoming && message.smsStatus && (
                              <span className="flex items-center gap-1">
                                {message.smsStatus === 'sent' ? (
                                  <CheckCircle className="h-3 w-3 text-green-500" />
                                ) : message.smsStatus === 'failed' ? (
                                  <AlertCircle className="h-3 w-3 text-red-500" />
                                ) : (
                                  <Clock className="h-3 w-3" />
                                )}
                                {message.smsStatus}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
        
        {/* Typing indicator */}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-gray-100 px-4 py-3 rounded-lg">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Message templates */}
      {showTemplates && (
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <MessageTemplates
            onSelectTemplate={(template) => onSendMessage(template, true)}
            leadInterest={selectedConversation.vehicleInterest}
          />
        </div>
      )}

      {/* Input area */}
      {canReply ? (
        <div className="p-4 border-t border-gray-200 bg-white">
          <div className="flex items-end gap-3">
            <div className="flex-1 relative">
              <Input
                ref={inputRef}
                value={messageInput}
                onChange={(e) => {
                  setMessageInput(e.target.value);
                  setIsTyping(e.target.value.length > 0);
                }}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                disabled={isLoading}
                className="pr-20 resize-none"
                maxLength={1000}
              />
              
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  title="Add emoji"
                >
                  <Smile className="h-4 w-4" />
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  title="Attach file"
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={onToggleTemplates}
              className={showTemplates ? 'bg-blue-50' : ''}
            >
              Templates
            </Button>

            <Button
              onClick={handleSendMessage}
              disabled={!messageInput.trim() || isLoading}
              className="shrink-0"
            >
              {isLoading ? (
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>

          <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
            <span>{messageInput.length}/1000 characters</span>
            <span>Press Enter to send, Shift+Enter for new line</span>
          </div>
        </div>
      ) : (
        <div className="p-4 border-t border-gray-200 bg-gray-50 text-center text-gray-600">
          <p>You don't have permission to reply to this conversation.</p>
          <p className="text-sm">Contact your manager or the assigned salesperson.</p>
        </div>
      )}
    </div>
  );
};

export default EnhancedChatView;
