import React, { useEffect, useState } from "react";
import { useConversationData } from "@/hooks/useConversationData";
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { toggleFinnAI } from '@/services/finnAIService';
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
  const [aiLoading, setAiLoading] = useState(false);

  // Debug AI data when component mounts
  useEffect(() => {
    console.log('=== LEAD AI DEBUG INFO ===');
    console.log('Lead ID:', lead.id);
    console.log('AI Opt In:', lead.aiOptIn);
    console.log('AI Stage:', lead.aiStage);
    console.log('Next AI Send At:', lead.nextAiSendAt);
    console.log('AI Sequence Paused:', lead.aiSequencePaused);
    console.log('Pending Human Response:', lead.pendingHumanResponse);
    console.log('AI Takeover Enabled:', lead.aiTakeoverEnabled);
    console.log('========================');
  }, [lead]);

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
    if (aiLoading) return; // Prevent double-clicks

    console.log("AI opt-in toggle requested:", enabled);
    setAiLoading(true);
    
    try {
      const result = await toggleFinnAI(lead.id, !enabled); // toggleFinnAI expects current state
      
      if (!result.success) {
        console.error("Failed to toggle AI:", result.error);
        toast({
          title: "Error",
          description: result.error || "Failed to update AI settings",
          variant: "destructive"
        });
        return;
      }

      console.log("AI toggle successful, new state:", result.newState);
      
      // Force a page refresh to ensure all components reflect the new state
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

  const handleAITakeoverChange = async (enabled: boolean, delayMinutes: number): Promise<void> => {
    console.log("AI takeover changed:", enabled, delayMinutes);
    try {
      const { error } = await supabase
        .from('leads')
        .update({ 
          ai_takeover_enabled: enabled,
          ai_takeover_delay_minutes: delayMinutes
        })
        .eq('id', lead.id);

      if (error) {
        console.error("Failed to update AI takeover:", error);
        toast({
          title: "Error",
          description: "Failed to update AI takeover settings",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Success",
        description: `AI takeover ${enabled ? 'enabled' : 'disabled'}`,
        variant: "default"
      });
    } catch (error) {
      console.error("Failed to update AI takeover:", error);
      toast({
        title: "Error",
        description: "Failed to update AI takeover settings",
        variant: "destructive"
      });
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
              messageIntensity={lead.messageIntensity}
              aiSequencePaused={lead.aiSequencePaused || false}
              aiTakeoverEnabled={lead.aiTakeoverEnabled || false}
              aiTakeoverDelayMinutes={lead.aiTakeoverDelayMinutes || 7}
              pendingHumanResponse={lead.pendingHumanResponse || false}
              nextAiSendAt={lead.nextAiSendAt}
              onAIOptInChange={handleAIOptInChange}
              onAITakeoverChange={handleAITakeoverChange}
            />
          </div>

          {/* Main Content - Messages and Tabs */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg border border-gray-200 h-[700px] relative">
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
