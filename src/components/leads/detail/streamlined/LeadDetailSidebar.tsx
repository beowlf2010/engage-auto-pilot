
import React from "react";
import ConsolidatedInfoCard from "../ConsolidatedInfoCard";
import CompactAIControls from "../CompactAIControls";
import type { LeadDetailData } from "@/services/leadDetailService";

interface LeadDetailSidebarProps {
  lead: LeadDetailData;
  onAIOptInChange: (enabled: boolean) => Promise<void>;
  onAITakeoverChange: (enabled: boolean, delayMinutes: number) => Promise<void>;
}

const LeadDetailSidebar: React.FC<LeadDetailSidebarProps> = ({
  lead,
  onAIOptInChange,
  onAITakeoverChange
}) => {
  return (
    <div className="w-80 flex-shrink-0 space-y-4">
      <ConsolidatedInfoCard lead={lead} />
      <CompactAIControls
        leadId={lead.id}
        aiOptIn={lead.aiOptIn || false}
        aiStage={lead.aiStage}
        aiSequencePaused={lead.aiSequencePaused || false}
        aiTakeoverEnabled={lead.aiTakeoverEnabled || false}
        aiTakeoverDelayMinutes={lead.aiTakeoverDelayMinutes || 7}
        pendingHumanResponse={lead.pendingHumanResponse || false}
        nextAiSendAt={lead.nextAiSendAt}
        onAIOptInChange={onAIOptInChange}
        onAITakeoverChange={onAITakeoverChange}
      />
    </div>
  );
};

export default LeadDetailSidebar;
