import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, RefreshCw, Send } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useCentralizedRealtime } from '@/hooks/useCentralizedRealtime';
import type { ConversationListItem, ConversationMessage } from '@/types/conversation';
import { formatDistanceToNow } from 'date-fns';

interface MobileSmartInboxProps {
  onLeadsRefresh: () => void;
  preselectedLeadId?: string | null;
}

const MobileSmartInbox = ({ onLeadsRefresh, preselectedLeadId }: MobileSmartInboxProps) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [selectedLead, setSelectedLead] = useState<string | null>(preselectedLeadId || null);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Query for conversations list
  const { 
    data: conversations = [], 
    isLoading: conversationsLoading, 
    error: conversationsError,
    refetch: refetchConversations 
  } = useQuery({
    queryKey: ['mobile-conversations', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          id,
          lead_id,
          body,
          direction,
          sent_at,
          read_at,
          leads!inner(
            id,
            first_name,
            last_name,
            phone_numbers(number)
          )
        `)
        .order('sent_at', { ascending: false });

      if (error) throw error;
      return data as ConversationListItem[];
    },
    enabled: !!profile?.id
  });

  // Centralized realtime subscriptions
  useCentralizedRealtime({
    onConversationUpdate: () => refetchConversations(),
    onMessageUpdate: () => refetchConversations()
  });

  // Query for messages of selected lead
  const { 
    data: messages = [], 
    isLoading: messagesLoading,
    refetch: refetchMessages 
  } = useQuery({
    queryKey: ['mobile-messages', selectedLead],
    queryFn: async () => {
      if (!selectedLead) return [];
      
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('lead_id', selectedLead)
        .order('sent_at', { ascending: true });

      if (error) throw error;
      return data as ConversationMessage[];
    },
    enabled: !!selectedLead
  });

  // Set preselected lead if provided
  useEffect(() => {
    if (preselectedLeadId && preselectedLeadId !== selectedLead) {
      setSelectedLead(preselectedLeadId);
    }
  }, [preselectedLeadId, selectedLead]);

  const markAsRead = async (leadId: string) => {
    try {
      await supabase
        .from('conversations')
        .update({ read_at: new Date().toISOString() })
        .eq('lead_id', leadId)
        .eq('direction', 'in')
        .is('read_at', null);
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const sendMessage = async () => {
    if (!selectedLead || !newMessage.trim() || isSending) return;

    setIsSending(true);
    try {
      const { error } = await supabase
        .from('conversations')
        .insert({
          lead_id: selectedLead,
          profile_id: profile?.id,
          body: newMessage.trim(),
          direction: 'out',
          sent_at: new Date().toISOString(),
          ai_generated: false
        });

      if (error) throw error;

      setNewMessage('');
      await refetchMessages();
      await refetchConversations();
      
      toast({
        title: "Message sent",
        description: "Your message has been sent successfully."
      });
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
    }
  };

  const getConversationsByLead = () => {
    const leadGroups = new Map<string, ConversationListItem>();
    
    conversations.forEach(conv => {
      const leadId = conv.lead_id;
      const existing = leadGroups.get(leadId);
      
      if (!existing || new Date(conv.sent_at) > new Date(existing.sent_at)) {
        leadGroups.set(leadId, conv);
      }
    });
    
    return Array.from(leadGroups.values()).sort((a, b) => 
      new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime()
    );
  };

  const selectedConversation = conversations.find(c => c.lead_id === selectedLead);

  if (conversationsLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-sm text-gray-600">Loading conversations...</p>
        </div>
      </div>
    );
  }

  if (conversationsError) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="h-6 w-6 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Conversations</h3>
          <p className="text-sm text-gray-600 mb-4">{conversationsError.message}</p>
          <Button onClick={() => refetchConversations()} variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  const conversationsByLead = getConversationsByLead();

  if (!selectedLead) {
    return (
      <div className="h-full flex flex-col bg-background">
        <div className="p-4 border-b bg-white">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Smart Inbox</h2>
            <Button
              onClick={() => refetchConversations()}
              variant="ghost"
              size="sm"
              disabled={conversationsLoading}
            >
              <RefreshCw className={`h-4 w-4 ${conversationsLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-3">
            {conversationsByLead.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No conversations yet</h3>
                <p className="text-gray-600">New conversations will appear here.</p>
              </div>
            ) : (
              conversationsByLead.map((conv) => {
                const lead = conv.leads;
                const unreadCount = conversations.filter(c => 
                  c.lead_id === conv.lead_id && 
                  c.direction === 'in' && 
                  !c.read_at
                ).length;

                return (
                  <Card 
                    key={conv.lead_id} 
                    className="cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => {
                      setSelectedLead(conv.lead_id);
                      markAsRead(conv.lead_id);
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-gray-900 truncate">
                            {lead.first_name} {lead.last_name}
                          </h4>
                          <p className="text-sm text-gray-600 truncate">
                            {lead.phone_numbers?.[0]?.number}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 ml-2">
                          {unreadCount > 0 && (
                            <Badge variant="destructive" className="text-xs">
                              {unreadCount}
                            </Badge>
                          )}
                          <span className="text-xs text-gray-500 whitespace-nowrap">
                            {formatDistanceToNow(new Date(conv.sent_at), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-700 line-clamp-2">
                        {conv.direction === 'out' ? '→ ' : ''}{conv.body}
                      </p>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </ScrollArea>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="p-4 border-b bg-white">
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setSelectedLead(null)}
            variant="ghost"
            size="sm"
          >
            ← Back
          </Button>
          {selectedConversation && (
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 truncate">
                {selectedConversation.leads.first_name} {selectedConversation.leads.last_name}
              </h3>
              <p className="text-sm text-gray-600 truncate">
                {selectedConversation.leads.phone_numbers?.[0]?.number}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messagesLoading ? (
            <div className="text-center py-8">
              <div className="w-6 h-6 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-sm text-gray-600">Loading messages...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600">No messages yet</p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.direction === 'out' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] p-3 rounded-lg ${
                    message.direction === 'out'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <p className="text-sm">{message.body}</p>
                  <p
                    className={`text-xs mt-1 ${
                      message.direction === 'out' ? 'text-blue-100' : 'text-gray-500'
                    }`}
                  >
                    {formatDistanceToNow(new Date(message.sent_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Message Input */}
      <div className="p-4 border-t bg-white">
        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            disabled={isSending}
          />
          <Button
            onClick={sendMessage}
            disabled={!newMessage.trim() || isSending}
            size="sm"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MobileSmartInbox;
