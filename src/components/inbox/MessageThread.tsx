
import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Send, Loader2, Settings, X } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import LeadActionsSection from './LeadActionsSection';
import { markLeadAsLost, markLeadAsSold } from '@/services/leadStatusService';
import { updateAIFollowupLevel } from '@/services/vehicleUpdateService';
import type { MessageData, ConversationListItem } from '@/types/conversation';

interface MessageThreadProps {
  leadId: string;
  messages: MessageData[];
  conversation: ConversationListItem;
  onSendMessage: (message: string) => Promise<void>;
  canReply: boolean;
  loading: boolean;
  onRefresh?: () => void;
}

const MessageThread: React.FC<MessageThreadProps> = ({
  leadId,
  messages,
  conversation,
  onSendMessage,
  canReply,
  loading,
  onRefresh
}) => {
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [isMarkingLost, setIsMarkingLost] = useState(false);
  const [isMarkingSold, setIsMarkingSold] = useState(false);
  const [isSettingSlowerFollowup, setIsSettingSlowerFollowup] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || sending || !canReply) return;

    setSending(true);
    try {
      await onSendMessage(newMessage.trim());
      setNewMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleMarkAsLost = async () => {
    setIsMarkingLost(true);
    try {
      const result = await markLeadAsLost(leadId);
      
      if (result.success) {
        toast({
          title: "Lead Marked as Lost",
          description: "The lead has been successfully marked as lost and AI automation has been disabled.",
        });
        if (onRefresh) {
          onRefresh();
        }
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to mark lead as lost",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error marking lead as lost:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setIsMarkingLost(false);
    }
  };

  const handleMarkAsSold = async () => {
    setIsMarkingSold(true);
    try {
      const result = await markLeadAsSold(leadId);
      
      if (result.success) {
        toast({
          title: "Lead Marked as Sold",
          description: "The lead has been successfully marked as sold and AI automation has been disabled.",
        });
        if (onRefresh) {
          onRefresh();
        }
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to mark lead as sold",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error marking lead as sold:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setIsMarkingSold(false);
    }
  };

  const handleSlowerFollowup = async () => {
    setIsSettingSlowerFollowup(true);
    try {
      const result = await updateAIFollowupLevel(leadId, 'gentle');
      
      if (result.success) {
        toast({
          title: "Follow-up Updated",
          description: "Lead has been set to weekly follow-up schedule.",
        });
        if (onRefresh) {
          onRefresh();
        }
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to update follow-up schedule",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error updating follow-up:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setIsSettingSlowerFollowup(false);
    }
  };

  const formatMessageTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleString();
    } catch {
      return 'Unknown time';
    }
  };

  if (loading && messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-blue-600" />
          <p className="text-sm text-gray-600">Loading messages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col relative">
      {/* Header with Actions Toggle */}
      <div className="flex items-center justify-between p-4 border-b bg-white">
        <div>
          <h3 className="font-semibold">{conversation.leadName}</h3>
          <p className="text-sm text-gray-600">{conversation.vehicleInterest}</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowActions(!showActions)}
          className="p-2"
        >
          {showActions ? <X className="h-4 w-4" /> : <Settings className="h-4 w-4" />}
        </Button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Messages */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <p>No messages yet</p>
                {canReply && <p className="text-sm mt-1">Start the conversation below</p>}
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.direction === 'out' ? 'justify-end' : 'justify-start'}`}
                >
                  <Card className={`max-w-[80%] p-3 ${
                    message.direction === 'out'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}>
                    <div className="space-y-1">
                      <p className="text-sm">{message.body}</p>
                      <div className={`flex items-center justify-between text-xs ${
                        message.direction === 'out' ? 'text-blue-100' : 'text-gray-500'
                      }`}>
                        <span>{formatMessageTime(message.sentAt)}</span>
                        {message.direction === 'out' && (
                          <span className="ml-2">
                            {message.smsStatus === 'delivered' ? '✓' : 
                             message.smsStatus === 'failed' ? '✗' : '⌛'}
                          </span>
                        )}
                      </div>
                      {message.aiGenerated && (
                        <div className={`text-xs ${
                          message.direction === 'out' ? 'text-blue-200' : 'text-gray-400'
                        }`}>
                          AI Generated
                        </div>
                      )}
                    </div>
                  </Card>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          {canReply ? (
            <div className="border-t p-4">
              <div className="flex space-x-2">
                <Textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your message..."
                  className="flex-1 min-h-[40px] max-h-[120px]"
                  disabled={sending}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || sending}
                  size="sm"
                  className="px-3"
                >
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="border-t p-4 text-center text-sm text-gray-500">
              Cannot reply - no phone number available
            </div>
          )}
        </div>

        {/* Actions Panel */}
        {showActions && (
          <div className="w-80 border-l bg-gray-50 p-4 overflow-y-auto">
            <LeadActionsSection
              conversation={conversation}
              onMarkAsLost={handleMarkAsLost}
              onMarkAsSold={handleMarkAsSold}
              onSlowerFollowup={handleSlowerFollowup}
              isMarkingLost={isMarkingLost}
              isMarkingSold={isMarkingSold}
              isSettingSlowerFollowup={isSettingSlowerFollowup}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageThread;
