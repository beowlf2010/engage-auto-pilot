
import React, { useEffect } from "react";
import { useConversationData } from "@/hooks/useConversationData";
import LeadDetailPageHeader from "./LeadDetailPageHeader";
import LeadDetailGrid from "./LeadDetailGrid";
import type { Lead } from "@/types/lead";
import type { LeadDetailData } from "@/services/leadDetailService";

interface LeadDetailLayoutProps {
  lead: LeadDetailData;
  transformedLead: Lead;
  messageThreadLead: any;
  phoneNumbers: any[];
  primaryPhone: string;
  showMessageComposer: boolean;
  setShowMessageComposer: (show: boolean) => void;
  onPhoneSelect: (phone: any) => void;
}

const LeadDetailLayout: React.FC<LeadDetailLayoutProps> = ({
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

  // Load messages when component mounts or lead changes
  useEffect(() => {
    if (lead.id) {
      loadMessages(lead.id);
    }
  }, [lead.id, loadMessages]);

  const handleSendMessage = async (message: string): Promise<void> => {
    try {
      console.log("Sending message:", message);
      await sendMessage(lead.id, message);
      
      // Reload messages to show the new message
      await loadMessages(lead.id);
    } catch (error) {
      console.error("Failed to send message:", error);
      throw error; // Let the EnhancedMessageThread handle the error display
    }
  };

  const handleAIOptInChange = async (enabled: boolean): Promise<void> => {
    console.log("AI opt-in changed:", enabled);
    // TODO: Implementation would update the lead's AI opt-in status
    // This should be implemented to update the actual lead data
  };

  // Use the messages from the conversation hook if available, otherwise use lead conversations
  const conversationMessages = messages.length > 0 ? messages : lead.conversations;

  return (
    <div className="min-h-screen bg-gray-50">
      <LeadDetailPageHeader 
        lead={transformedLead}
        onSendMessage={() => setShowMessageComposer(true)}
        onAIOptInChange={handleAIOptInChange}
      />
      
      <LeadDetailGrid
        lead={lead}
        phoneNumbers={phoneNumbers}
        primaryPhone={primaryPhone}
        messages={conversationMessages}
        messagesLoading={messagesLoading}
        onPhoneSelect={onPhoneSelect}
        onSendMessage={handleSendMessage}
      />
    </div>
  );
};

export default LeadDetailLayout;
