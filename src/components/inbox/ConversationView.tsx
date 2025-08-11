
import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Send, Phone, User, CheckCheck, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { ConversationListItem } from '@/types/conversation';
import { Switch } from '@/components/ui/switch';
import { useAutoMarkAsReadSetting } from '@/hooks/inbox/useAutoMarkAsReadSetting';
interface Message {
  id: string;
  body: string;
  direction: 'in' | 'out';
  sent_at: string;
  read_at?: string;
  ai_generated?: boolean;
}

interface ConversationViewProps {
  conversation: ConversationListItem;
  messages: Message[];
  onBack: () => void;
  onSendMessage: (message: string) => Promise<void>;
  sending: boolean;
  onMarkAsRead: () => Promise<void>;
  canReply: boolean;
  loading: boolean;
  error?: string | null;
}

const ConversationView: React.FC<ConversationViewProps> = ({
  conversation,
  messages,
  onBack,
  onSendMessage,
  sending,
  onMarkAsRead,
  canReply,
  loading,
  error
}) => {
  const [messageText, setMessageText] = useState('');
  const [sendingLocal, setSendingLocal] = useState(false);
  const { enabled, setEnabled } = useAutoMarkAsReadSetting();

  const handleSendMessage = useCallback(async () => {
    if (!messageText.trim() || sendingLocal || sending) return;
    
    try {
      setSendingLocal(true);
      await onSendMessage(messageText.trim());
      setMessageText('');
    } catch (err) {
      console.error('Error sending message:', err);
    } finally {
      setSendingLocal(false);
    }
  }, [messageText, sendingLocal, sending, onSendMessage]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-card">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-3">
            <div>
              <h2 className="font-semibold text-foreground">{conversation.leadName}</h2>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-3 w-3" />
                <span>{conversation.leadPhone}</span>
              </div>
            </div>
            {conversation.unreadCount > 0 && (
              <Badge variant="destructive">
                {conversation.unreadCount} unread
              </Badge>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 mr-2">
            <span className="text-xs text-muted-foreground">Auto-mark on open</span>
            <Switch
              checked={enabled}
              onCheckedChange={setEnabled}
              aria-label="Auto-mark messages as read when opening a conversation"
            />
          </div>
          {conversation.unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={onMarkAsRead}
              disabled={loading}
            >
              <CheckCheck className="h-4 w-4 mr-1" />
              Mark Read
            </Button>
          )}
          {!conversation.salespersonId && (
            <Badge variant="outline" className="text-orange-600 border-orange-300">
              <User className="h-3 w-3 mr-1" />
              Unassigned
            </Badge>
          )}
        </div>
      </div>

      {/* Lead Info */}
      <div className="p-4 bg-muted/30 border-b">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="font-medium text-muted-foreground">Vehicle Interest:</span>
            <p className="text-foreground mt-1">{conversation.vehicleInterest}</p>
          </div>
          <div>
            <span className="font-medium text-muted-foreground">Lead Source:</span>
            <p className="text-foreground mt-1">{conversation.leadSource || 'Unknown'}</p>
          </div>
          <div>
            <span className="font-medium text-muted-foreground">Status:</span>
            <p className="text-foreground mt-1 capitalize">{conversation.status}</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-center">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Loading messages...</p>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-center">
              <p className="text-muted-foreground">No messages yet</p>
              <p className="text-sm text-muted-foreground mt-1">Start the conversation!</p>
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.direction === 'out' ? 'justify-end' : 'justify-start'}`}
            >
              <Card className={`max-w-md ${
                message.direction === 'out' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-card'
              }`}>
                <CardContent className="p-3">
                  <p className="text-sm whitespace-pre-wrap">{message.body}</p>
                  <div className={`flex items-center justify-between mt-2 text-xs ${
                    message.direction === 'out' 
                      ? 'text-primary-foreground/70' 
                      : 'text-muted-foreground'
                  }`}>
                    <span>
                      {formatDistanceToNow(new Date(message.sent_at), { addSuffix: true })}
                    </span>
                    <div className="flex items-center gap-1">
                      {message.ai_generated && (
                        <Badge variant="outline" className="text-xs px-1 py-0">
                          AI
                        </Badge>
                      )}
                      {message.direction === 'out' && (
                        <span>{message.read_at ? '✓✓' : '✓'}</span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ))
        )}
      </div>

      {/* Message Input */}
      {canReply && (
        <div className="p-4 border-t bg-card">
          <div className="flex gap-2">
            <Input
              placeholder="Type your message..."
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={sendingLocal || sending}
              className="flex-1"
            />
            <Button
              onClick={handleSendMessage}
              disabled={!messageText.trim() || sendingLocal || sending}
              size="sm"
            >
              {sendingLocal || sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          {!canReply && (
            <p className="text-xs text-muted-foreground mt-2">
              You don't have permission to reply to this conversation
            </p>
          )}
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="p-3 bg-destructive/10 border-t">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}
    </div>
  );
};

export default ConversationView;
