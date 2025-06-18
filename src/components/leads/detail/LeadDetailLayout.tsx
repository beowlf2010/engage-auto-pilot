
import React, { useEffect } from "react";
import { useConversationData } from "@/hooks/useConversationData";
import { supabase } from '@/integrations/supabase/client';
import StreamlinedLeadHeader from "./StreamlinedLeadHeader";
import ConsolidatedInfoCard from "./ConsolidatedInfoCard";
import CompactAIControls from "./CompactAIControls";
import LeadDetailTabsSection from "./LeadDetailTabsSection";
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
    try {
      await supabase
        .from('leads')
        .update({ ai_opt_in: enabled })
        .eq('id', lead.id);
    } catch (error) {
      console.error("Failed to update AI opt-in:", error);
      throw error;
    }
  };

  const handleAITakeoverChange = async (enabled: boolean, delayMinutes: number): Promise<void> => {
    console.log("AI takeover changed:", enabled, delayMinutes);
    try {
      await supabase
        .from('leads')
        .update({ 
          ai_takeover_enabled: enabled,
          ai_takeover_delay_minutes: delayMinutes
        })
        .eq('id', lead.id);
    } catch (error) {
      console.error("Failed to update AI takeover:", error);
      throw error;
    }
  };

  // Use the messages from the conversation hook if available, otherwise use lead conversations
  const conversationMessages = messages.length > 0 ? messages : lead.conversations;

  return (
    <div className="min-h-screen bg-gray-50">
      <StreamlinedLeadHeader 
        lead={transformedLead}
        onSendMessage={() => setShowMessageComposer(true)}
      />
      
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Sidebar - Lead Info */}
          <div className="lg:col-span-1 space-y-6">
            <ConsolidatedInfoCard lead={lead} />
            <CompactAIControls
              leadId={lead.id}
              aiOptIn={lead.aiOptIn || false}
              aiStage={lead.aiStage}
              aiSequencePaused={lead.aiSequencePaused}
              aiTakeoverEnabled={(lead as any).aiTakeoverEnabled}
              aiTakeoverDelayMinutes={(lead as any).aiTakeoverDelayMinutes}
              pendingHumanResponse={(lead as any).pendingHumanResponse}
              onAIOptInChange={handleAIOptInChange}
              onAITakeoverChange={handleAITakeoverChange}
            />
          </div>

          {/* Main Content - Messages and Tabs */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg border border-gray-200 h-[700px]">
              <LeadDetailTabsSection
                lead={lead}
                messages={conversationMessages}
                messagesLoading={messagesLoading}
                onSendMessage={handleSendMessage}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeadDetailLayout;
