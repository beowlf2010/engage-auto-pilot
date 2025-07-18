
import React, { useEffect, useState } from "react";
import { useConversationData } from "@/hooks/useConversationData";
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { toggleFinnAI } from '@/services/finnAIService';
import { sendMessage as fixedSendMessage } from '@/services/fixedMessagesService';
import { useAuth } from '@/components/auth/AuthProvider';
import LeadDetailHeader from "./streamlined/LeadDetailHeader";
import ChatContainer from "./streamlined/ChatContainer";
import LeadDetailSidebar from "./streamlined/LeadDetailSidebar";
import EnhancedUnifiedAIPanel from "./streamlined/EnhancedUnifiedAIPanel";
import SmartFollowUpPanel from "@/components/ai/SmartFollowUpPanel";
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
  onStatusChanged?: () => void;
}

const StreamlinedLeadDetail: React.FC<StreamlinedLeadDetailProps> = ({
  lead,
  transformedLead,
  messageThreadLead,
  phoneNumbers,
  primaryPhone,
  showMessageComposer,
  setShowMessageComposer,
  onPhoneSelect,
  onStatusChanged
}) => {
  const { messages, messagesLoading, loadMessages } = useConversationData();
  const { profile } = useAuth();
  const [aiLoading, setAiLoading] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  // Load messages when component mounts or lead changes
  useEffect(() => {
    if (lead.id) {
      loadMessages(lead.id);
    }
  }, [lead.id, loadMessages]);

  // Simplified send message - let fixedMessagesService handle phone number lookup
  const sendMessage = async (leadId: string, messageBody: string): Promise<void> => {
    console.log('📤 [STREAMLINED LEAD DETAIL] === STARTING MESSAGE SEND ===');
    console.log('📤 [STREAMLINED LEAD DETAIL] Lead ID:', leadId);
    console.log('📤 [STREAMLINED LEAD DETAIL] Message body:', messageBody.substring(0, 50) + '...');
    console.log('📤 [STREAMLINED LEAD DETAIL] Profile:', profile ? { id: profile.id, firstName: profile.first_name } : 'No profile');

    if (!profile || !messageBody.trim()) {
      const error = new Error('Missing profile or message body');
      console.error('❌ [STREAMLINED LEAD DETAIL] Error:', error.message);
      throw error;
    }

    console.log('📤 [STREAMLINED LEAD DETAIL] Calling fixedSendMessage...');
    
    // Let fixedMessagesService handle all the phone number lookup and validation
    // This service already works correctly in the Smart Inbox
    await fixedSendMessage(leadId, messageBody.trim(), profile, false);
    
    console.log('✅ [STREAMLINED LEAD DETAIL] Message sent successfully via fixed service');
  };

  // Wrapper function to match the expected signature (message: string) => Promise<void>
  const handleSendMessageWrapper = async (message: string): Promise<void> => {
    await sendMessage(lead.id, message);
  };

  const handleSendMessage = async () => {
    console.log('📤 [STREAMLINED LEAD DETAIL] === handleSendMessage called ===');
    console.log('📤 [STREAMLINED LEAD DETAIL] New message:', newMessage);
    console.log('📤 [STREAMLINED LEAD DETAIL] isSending:', isSending);
    console.log('📤 [STREAMLINED LEAD DETAIL] Lead ID:', lead.id);
    
    if (!newMessage.trim()) {
      console.log('❌ [STREAMLINED LEAD DETAIL] Empty message, aborting');
      return;
    }
    
    if (isSending) {
      console.log('❌ [STREAMLINED LEAD DETAIL] Already sending, aborting');
      return;
    }
    
    setIsSending(true);
    console.log('📤 [STREAMLINED LEAD DETAIL] Set isSending to true');
    
    try {
      console.log('📤 [STREAMLINED LEAD DETAIL] About to call sendMessage...');
      await sendMessage(lead.id, newMessage);
      
      console.log('✅ [STREAMLINED LEAD DETAIL] Message sent successfully, clearing input');
      setNewMessage("");
      
      console.log('🔄 [STREAMLINED LEAD DETAIL] Reloading messages...');
      await loadMessages(lead.id);
      
      toast({
        title: "Message Sent",
        description: "Your message has been sent successfully",
      });
      
      console.log('✅ [STREAMLINED LEAD DETAIL] === MESSAGE SEND COMPLETE ===');
    } catch (error) {
      console.error("❌ [STREAMLINED LEAD DETAIL] === MESSAGE SEND FAILED ===");
      console.error("❌ [STREAMLINED LEAD DETAIL] Error details:", error);
      
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send message",
        variant: "destructive"
      });
    } finally {
      console.log('📤 [STREAMLINED LEAD DETAIL] Setting isSending to false');
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

  const isLeadClosed = lead.status === 'closed' || lead.status === 'lost';

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
          isSending={isSending || isLeadClosed}
          unreadCount={transformedLead.unreadCount}
        />
        
        {/* Enhanced AI Intelligence Panel */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <EnhancedUnifiedAIPanel
            leadId={lead.id}
            leadName={`${lead.firstName} ${lead.lastName}`}
            messages={conversationMessages}
            vehicleInterest={lead.vehicleInterest}
            onSendMessage={handleSendMessageWrapper}
          />
        </div>

        {/* Smart Follow-up Recommendations Panel */}
        <div className="bg-white rounded-lg border border-gray-200">
          <SmartFollowUpPanel
            leadId={lead.id}
            leadName={`${lead.firstName} ${lead.lastName}`}
            vehicleInterest={lead.vehicleInterest}
            conversationHistory={conversationMessages.map(m => m.body)}
            lastInteractionDate={new Date(conversationMessages[conversationMessages.length - 1]?.sentAt || Date.now())}
            leadTemperature={50} // Calculate dynamically from conversation data
            journeyStage={'initial_contact'} // Will be calculated dynamically
            engagementPattern={
              conversationMessages.length > 5 ? 'responsive' :
              conversationMessages.length > 2 ? 'slow' : 'inactive'
            }
          />
        </div>
        
        {isLeadClosed && (
          <div className="bg-gray-100 border rounded-lg p-4 text-center">
            <p className="text-gray-600">
              This lead has been marked as <strong>{lead.status === 'closed' ? 'SOLD' : 'LOST'}</strong>. 
              Messaging has been disabled.
            </p>
          </div>
        )}
      </div>

      {/* Right Sidebar - Enhanced with Process Selection and Status Actions */}
      <LeadDetailSidebar
        lead={lead}
        onAIOptInChange={handleAIOptInChange}
        onMessageSent={() => loadMessages(lead.id)}
        onStatusChanged={onStatusChanged}
      />
    </div>
  );
};

export default StreamlinedLeadDetail;
