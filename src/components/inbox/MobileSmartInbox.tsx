import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ArrowLeft,
  Send,
  Loader2,
  RefreshCw,
  MessageSquare,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useToast } from "@/hooks/use-toast"
import { useStableRealtimeInbox } from '@/hooks/useStableRealtimeInbox';
import StableConnectionStatus from '@/components/inbox/StableConnectionStatus';
import { useIntelligentMessageFlow } from '@/hooks/useIntelligentMessageFlow';

interface MobileSmartInboxProps {
  onLeadsRefresh?: () => void;
  preselectedLeadId?: string | null;
}

const MobileSmartInbox: React.FC<MobileSmartInboxProps> = ({ 
  onLeadsRefresh, 
  preselectedLeadId 
}) => {
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(preselectedLeadId || null);
  const [messageInput, setMessageInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const [leads, setLeads] = useState([
    {
      id: '1',
      name: 'John Doe',
      phone: '555-1234',
      lastMessage: 'Interested in a truck',
      lastActivity: '2 hours ago',
      unreadCount: 2,
      vehicleInterest: 'Silverado'
    },
    {
      id: '2',
      name: 'Jane Smith',
      phone: '555-5678',
      lastMessage: 'What colors are available?',
      lastActivity: '1 hour ago',
      unreadCount: 1,
      vehicleInterest: 'Equinox'
    },
    {
      id: '3',
      name: 'Mike Johnson',
      phone: '555-9012',
      lastMessage: 'Do you have any SUVs?',
      lastActivity: '30 minutes ago',
      unreadCount: 0,
      vehicleInterest: 'Tahoe'
    },
  ]);

  const selectedLead = leads.find((lead) => lead.id === selectedLeadId);

  // Replace useStableRealtimeInbox with useIntelligentMessageFlow
  const {
    conversations,
    messages: intelligentMessages,
    loading: conversationsLoading,
    error,
    fetchMessages,
    sendMessage: sendIntelligentMessage,
    refetch,
    isRealtimeConnected,
    forceRefresh
  } = useStableRealtimeInbox();

  // Use intelligent message flow for the selected lead
  const {
    messages: orderedMessages,
    loading: messagesLoading,
    needsResponse,
    loadMessages: reloadMessages,
    processIncomingMessage
  } = useIntelligentMessageFlow(selectedLeadId);

  // Use ordered messages when available, fallback to intelligent messages
  const displayMessages = selectedLeadId ? orderedMessages : intelligentMessages;
  const isLoadingMessages = messagesLoading || conversationsLoading;

  useEffect(() => {
    if (preselectedLeadId) {
      setSelectedLeadId(preselectedLeadId);
    }
  }, [preselectedLeadId]);

  useEffect(() => {
    if (selectedLeadId) {
      fetchMessages(selectedLeadId);
    }
  }, [selectedLeadId, fetchMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [displayMessages]);

  const handleSendMessage = async (content: string) => {
    if (!selectedLeadId || !content.trim()) return;

    try {
      setIsSending(true);
      console.log('📤 [MOBILE INBOX] Sending message:', content.substring(0, 50) + '...');
      
      await sendIntelligentMessage(selectedLeadId, content.trim());
      
      // Clear input and reload messages
      setMessageInput('');
      await reloadMessages();
      
      toast({
        title: "Message sent",
        description: "Your message has been sent successfully",
      });
    } catch (error) {
      console.error('❌ [MOBILE INBOX] Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const MessageBubble = ({ message, leadName, vehicleInterest }: {
    message: {
      id: string;
      body: string;
      direction: string;
      sentAt: string;
      aiGenerated: boolean;
      smsStatus?: string;
    };
    leadName: string;
    vehicleInterest: string;
  }) => {
    const isOutgoing = message.direction === 'out';
    const timestamp = new Date(message.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return (
      <div className={`flex ${isOutgoing ? 'justify-end' : 'justify-start'} mb-2`}>
        <div className={`max-w-xs lg:max-w-md relative ${
          isOutgoing
            ? 'bg-blue-600 text-white rounded-l-lg rounded-tr-lg'
            : 'bg-gray-200 text-gray-900 rounded-r-lg rounded-tl-lg'
        } px-4 py-2`}>
          <div className="break-words mb-2">
            {message.body}
          </div>
          <div className={`flex items-center justify-between gap-2 ${
            isOutgoing ? 'text-blue-100' : 'text-gray-500'
          }`}>
            <div className="text-xs">
              {timestamp}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderMessages = () => {
    if (isLoadingMessages) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-sm text-gray-500">Loading messages...</p>
          </div>
        </div>
      );
    }

    if (!displayMessages || displayMessages.length === 0) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No messages yet</p>
            <p className="text-sm text-gray-400">Start a conversation</p>
          </div>
        </div>
      );
    }

    return (
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {displayMessages.map((message) => (
          <MessageBubble
            key={message.id}
            message={{
              id: message.id,
              body: message.body,
              direction: message.direction,
              sentAt: message.sentAt,
              aiGenerated: message.aiGenerated,
              smsStatus: message.smsStatus || 'delivered'
            }}
            leadName={selectedLead?.name || 'Customer'}
            vehicleInterest={selectedLead?.vehicleInterest}
          />
        ))}
        
        {needsResponse && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <span className="text-sm text-yellow-800">
                Customer message awaiting intelligent AI response
              </span>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
    );
  };

  const ConversationListItem = ({ lead, isSelected }: { lead: any; isSelected: boolean }) => {
    return (
      <Button
        variant="ghost"
        className={`flex items-center justify-between w-full rounded-none border-b px-4 py-3 text-left text-sm ${isSelected ? 'bg-gray-100' : 'hover:bg-gray-50'
          }`}
        onClick={() => setSelectedLeadId(lead.id)}
      >
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={`https://avatar.vercel.sh/${lead.name}.png`} />
            <AvatarFallback>{lead.name.substring(0, 2)}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{lead.name}</p>
            <p className="text-xs text-gray-500">{lead.lastMessage}</p>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <p className="text-xs text-gray-400">{lead.lastActivity}</p>
          {lead.unreadCount > 0 && (
            <div className="rounded-full bg-blue-500 text-white text-[0.6rem] px-2 py-0.5">
              {lead.unreadCount}
            </div>
          )}
        </div>
      </Button>
    );
  };

  return (
    <div className="h-full bg-background flex flex-col">
      <div className="bg-white border-b px-4 py-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Smart Inbox</h2>
          <Button variant="outline" size="sm" onClick={onLeadsRefresh}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="lg:grid lg:grid-cols-[300px_1fr] h-full">
        <aside className="border-r overflow-y-auto">
          <ScrollArea className="h-full">
            {leads.map((lead) => (
              <ConversationListItem
                key={lead.id}
                lead={lead}
                isSelected={selectedLeadId === lead.id}
              />
            ))}
          </ScrollArea>
        </aside>

        <div className="flex-1 flex flex-col">
          {selectedLead ? (
            <>
              <div className="bg-white border-b px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedLeadId(null)}
                    className="lg:hidden"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <div>
                    <h3 className="font-medium">{selectedLead.name}</h3>
                    <p className="text-sm text-gray-500">{selectedLead.phone}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StableConnectionStatus 
                    connectionState={{
                      isConnected: isRealtimeConnected,
                      status: isRealtimeConnected ? 'connected' : 'offline',
                      reconnectAttempts: 0,
                      maxReconnectAttempts: 5
                    }}
                    onReconnect={() => forceRefresh()}
                    onRefresh={reloadMessages}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={reloadMessages}
                    disabled={isLoadingMessages}
                  >
                    <RefreshCw className={`h-4 w-4 ${isLoadingMessages ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              </div>

              {renderMessages()}

              <div className="bg-white border-t p-4">
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <Textarea
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      placeholder="Type your message..."
                      className="min-h-[60px] resize-none"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage(messageInput);
                        }
                      }}
                    />
                  </div>
                  <Button
                    onClick={() => handleSendMessage(messageInput)}
                    disabled={!messageInput.trim() || isSending}
                    size="sm"
                  >
                    {isSending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Select a conversation to view messages</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MobileSmartInbox;
