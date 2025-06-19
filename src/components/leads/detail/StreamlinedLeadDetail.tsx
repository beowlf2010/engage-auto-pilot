
import React, { useEffect, useState } from "react";
import { useConversationData } from "@/hooks/useConversationData";
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { toggleFinnAI } from '@/services/finnAIService';
import LeadDetailHeader from "./streamlined/LeadDetailHeader";
import ChatContainer from "./streamlined/ChatContainer";
import LeadDetailSidebar from "./streamlined/LeadDetailSidebar";
import type { Lead } from "@/types/lead";
import type { LeadDetailData } from "@/services/leadDetailService";

interface StreamlinedLeadDetailProps {
  lead: LeadDetailData;
  transformedLead: Lead;
  messageThreadLead: any;
  phoneNumbers: any[];
  primaryPhone: string;
  showMessageComposer: boolean;
  setShowMessageComposer: (show: boolean) => void;
  onPhoneSelect: (phone: any) => void;
}

const StreamlinedLeadDetail: React.FC<StreamlinedLeadDetailProps> = ({
  lead,
  transformedLead,
  messageThreadLead,
  phoneNumbers,
  primaryPhone,
  showMessageComposer,
  setShowMessageComposer,
  onPhoneSelect
}) => {
  const { messages, messagesLoading, loadMessages, sendMessage } = useConversationData();
  const [aiLoading, setAiLoading] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  // Load messages when component mounts or lead changes
  useEffect(() => {
    if (lead.id) {
      loadMessages(lead.id);
    }
  }, [lead.id, loadMessages]);

  // Watch for newMessage changes and send if it's set
  useEffect(() => {
    if (newMessage.trim() && !isSending) {
      handleSendMessage();
    }
  }, [newMessage]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || isSending) return;
    
    setIsSending(true);
    try {
      console.log('📤 Sending message:', newMessage);
      await sendMessage(lead.id, newMessage);
      setNewMessage("");
      await loadMessages(lead.id);
      
      toast({
        title: "Message Sent",
        description: "Your message has been sent successfully",
      });
    } catch (error) {
      console.error("Failed to send message:", error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleAIOptInChange = async (enabled: boolean): Promise<void> => {
    if (aiLoading) return;

    setAiLoading(true);
    try {
      const result = await toggleFinnAI(lead.id, !enabled);
      
      if (!result.success) {
        toast({
          title: "Error",
          description: result.error || "Failed to update AI settings",
          variant: "destructive"
        });
        return;
      }

      window.location.reload();
      
    } catch (error) {
      console.error("AI toggle error:", error);
      toast({
        title: "Error",
        description: "Failed to update AI settings",
        variant: "destructive"
      });
    } finally {
      setAiLoading(false);
    }
  };

  // Use the messages from the conversation hook if available, otherwise use lead conversations
  const conversationMessages = messages.length > 0 ? messages : lead.conversations;

  return (
    <div className="h-[calc(100vh-8rem)] flex space-x-6">
      {/* Main Chat Area - matches inbox layout */}
      <div className="flex-1 min-w-0 flex flex-col space-y-4">
        <LeadDetailHeader
          lead={lead}
          primaryPhone={primaryPhone}
          unreadCount={transformedLead.unreadCount}
          aiProcessing={false}
        />

        <ChatContainer
          lead={lead}
          primaryPhone={primaryPhone}
          messages={conversationMessages}
          messagesLoading={messagesLoading}
          newMessage={newMessage}
          setNewMessage={setNewMessage}
          onSendMessage={handleSendMessage}
          isSending={isSending}
          unreadCount={transformedLead.unreadCount}
        />
      </div>

      {/* Right Sidebar - matches inbox layout */}
      <LeadDetailSidebar
        lead={lead}
        onAIOptInChange={handleAIOptInChange}
        onMessageSent={() => loadMessages(lead.id)}
      />
    </div>
  );
};

export default StreamlinedLeadDetail;
