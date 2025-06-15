import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Loader2, MessageSquare, AlertTriangle, Wifi, WifiOff } from 'lucide-react';
import MessageBubble from '@/components/inbox/MessageBubble';
import { useConversationData } from '@/hooks/useConversationData';
import { toast } from '@/hooks/use-toast';
import { useCompliance } from "@/hooks/useCompliance";

interface LeadMessagingProps {
  leadId: string;
}

const LeadMessaging = ({ leadId }: LeadMessagingProps) => {
  const compliance = useCompliance();
  const { messages, messagesLoading, messagesError, loadMessages, sendMessage, setMessages } = useConversationData();
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'unknown'>('unknown');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (leadId) {
      console.log('LeadMessaging: Loading messages for lead:', leadId);
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

  // Check connection status
  useEffect(() => {
    const checkConnection = () => {
      setConnectionStatus(navigator.onLine ? 'connected' : 'disconnected');
    };
    
    checkConnection();
    window.addEventListener('online', checkConnection);
    window.addEventListener('offline', checkConnection);
    
    return () => {
      window.removeEventListener('online', checkConnection);
      window.removeEventListener('offline', checkConnection);
    };
  }, []);

  const handleSend = async () => {
    // ENFORCE consent before outbound message
    try {
      await compliance.enforceConsent(leadId, "sms");
      if (newMessage.trim() && !isSending && leadId) {
        if (connectionStatus === 'disconnected') {
          toast({
            title: "No Internet Connection",
            description: "Please check your internet connection and try again.",
            variant: "destructive"
          });
          return;
        }

        setIsSending(true);
        try {
          console.log('LeadMessaging: Sending message:', newMessage.trim());
          const result = await sendMessage(leadId, newMessage.trim());
          
          if (result.warning) {
            console.log('Message sent with warning:', result.warning);
          }
          
          setNewMessage('');
        } catch (err) {
          console.error("Failed to send message from LeadMessaging", err);
          // Error handling is already done in the sendMessage service
        } finally {
          setIsSending(false);
        }
      }
    } catch (err) {
      toast({
        title: "Consent Not Found",
        description: "This lead cannot be messaged until opt-in is recorded.",
        variant: "destructive"
      });
      return;
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleRetryLoad = () => {
    if (leadId) {
      loadMessages(leadId);
    }
  };

  if (messagesLoading) {
    return (
      <div className="flex justify-center items-center h-48">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-slate-500 mx-auto mb-2" />
          <p className="text-sm text-slate-500">Loading messages...</p>
        </div>
      </div>
    );
  }

  if (messagesError) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-center p-4">
        <AlertTriangle className="h-8 w-8 mb-2 text-destructive" />
        <p className="font-semibold text-destructive">Failed to load messages</p>
        <p className="text-sm text-slate-500 mt-1">There was a problem retrieving the conversation history.</p>
        <p className="text-xs text-slate-400 mt-2 break-all">Details: {messagesError}</p>
        <Button onClick={handleRetryLoad} variant="outline" className="mt-3" size="sm">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 rounded-b-lg">
      {/* Connection Status */}
      {connectionStatus === 'disconnected' && (
        <div className="bg-red-50 border-b border-red-200 p-2 text-center">
          <div className="flex items-center justify-center gap-2 text-red-700 text-sm">
            <WifiOff className="h-4 w-4" />
            <span>No internet connection</span>
          </div>
        </div>
      )}

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
            disabled={isSending || connectionStatus === 'disconnected'}
          />
          <Button
            onClick={handleSend}
            disabled={!newMessage.trim() || isSending || connectionStatus === 'disconnected'}
            size="icon"
            className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9"
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : connectionStatus === 'connected' ? (
              <Send className="h-4 w-4" />
            ) : (
              <WifiOff className="h-4 w-4" />
            )}
            <span className="sr-only">Send</span>
          </Button>
        </div>
        {connectionStatus === 'disconnected' && (
          <p className="text-xs text-red-600 mt-1">Cannot send messages while offline</p>
        )}
      </div>
    </div>
  );
};

export default LeadMessaging;
