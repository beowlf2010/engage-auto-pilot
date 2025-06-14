
import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Loader2, MessageSquare } from 'lucide-react';
import MessageBubble from '@/components/inbox/MessageBubble';
import { useConversationData } from '@/hooks/useConversationData';

interface LeadMessagingProps {
  leadId: string;
}

const LeadMessaging = ({ leadId }: LeadMessagingProps) => {
  const { messages, loading, loadMessages, sendMessage, setMessages } = useConversationData();
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (leadId) {
      loadMessages(leadId);
    }
    return () => {
      // Clear messages when component unmounts or leadId changes
      setMessages([]);
    };
  }, [leadId, loadMessages, setMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (newMessage.trim() && !isSending && leadId) {
      setIsSending(true);
      try {
        await sendMessage(leadId, newMessage.trim());
        setNewMessage('');
      } catch (err) {
        console.error("Failed to send message from LeadMessaging", err);
        // Error toast is likely handled in the sendMessage service/hook
      } finally {
        setIsSending(false);
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (loading && messages.length === 0) {
    return <div className="flex justify-center items-center h-48"><Loader2 className="h-8 w-8 animate-spin text-slate-500" /></div>;
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 rounded-b-lg">
      <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[50vh]">
        {messages.length > 0 ? (
          messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))
        ) : (
          <div className="text-center text-slate-500 py-8">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 text-slate-400" />
            <p>No messages yet. Start the conversation!</p>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="p-4 border-t bg-white rounded-b-lg">
        <div className="relative">
          <Textarea
            placeholder="Type your message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            className="pr-14 min-h-[60px]"
            disabled={isSending}
          />
          <Button
            onClick={handleSend}
            disabled={!newMessage.trim() || isSending}
            size="icon"
            className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9"
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            <span className="sr-only">Send</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default LeadMessaging;
