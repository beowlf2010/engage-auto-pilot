
import React from "react";
import CompactAIControls from "../CompactAIControls";
import UnifiedAIPanel from "./UnifiedAIPanel";
import CompactCustomerCard from "./CompactCustomerCard";
import CompactMetricsCard from "./CompactMetricsCard";
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
    <div className="w-96 flex-shrink-0 space-y-3 max-h-screen overflow-y-auto">
      {/* Unified AI Assistant Panel - Always visible and compact */}
      <UnifiedAIPanel
        lead={lead}
        onMessageSent={onMessageSent}
      />
      
      {/* Compact Customer Details */}
      <CompactCustomerCard lead={lead} />
      
      {/* Compact Conversation Metrics */}
      <CompactMetricsCard lead={lead} />

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
