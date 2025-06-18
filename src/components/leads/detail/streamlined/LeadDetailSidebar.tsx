
import React from "react";
import CompactAIControls from "../CompactAIControls";
import CustomerDetailsCard from "../enhanced/CustomerDetailsCard";
import ConversationMetricsCard from "../enhanced/ConversationMetricsCard";
import UnifiedAIPanel from "./UnifiedAIPanel";
import type { LeadDetailData } from "@/services/leadDetailService";

interface LeadDetailSidebarProps {
  lead: LeadDetailData;
  onAIOptInChange: (enabled: boolean) => Promise<void>;
  onAITakeoverChange: (enabled: boolean, delayMinutes: number) => Promise<void>;
  onMessageSent?: () => void;
}

const LeadDetailSidebar: React.FC<LeadDetailSidebarProps> = ({
  lead,
  onAIOptInChange,
  onAITakeoverChange,
  onMessageSent
}) => {
  return (
    <div className="w-80 flex-shrink-0 space-y-4 max-h-screen overflow-y-auto">
      {/* Unified AI Assistant Panel - combines AI Message Preview, Finn AI, Inventory Status, and Vehicle Interest */}
      <UnifiedAIPanel
        lead={lead}
        onMessageSent={onMessageSent}
      />
      
      {/* Enhanced Customer Details */}
      <CustomerDetailsCard lead={lead} />
      
      {/* Conversation Metrics */}
      <ConversationMetricsCard lead={lead} />

      {/* AI Controls */}
      <CompactAIControls
        leadId={lead.id}
        aiOptIn={lead.aiOptIn || false}
        aiStage={lead.aiStage}
        aiSequencePaused={lead.aiSequencePaused || false}
        aiTakeoverEnabled={lead.aiTakeoverEnabled || false}
        aiTakeoverDelayMinutes={lead.aiTakeoverDelayMinutes || 30}
        pendingHumanResponse={lead.pendingHumanResponse || false}
        nextAiSendAt={lead.nextAiSendAt}
        onAIOptInChange={onAIOptInChange}
        onAITakeoverChange={onAITakeoverChange}
        leadName={`${lead.firstName} ${lead.lastName}`}
        vehicleInterest={lead.vehicleInterest}
        onMessageSent={onMessageSent}
      />
    </div>
  );
};

export default LeadDetailSidebar;
