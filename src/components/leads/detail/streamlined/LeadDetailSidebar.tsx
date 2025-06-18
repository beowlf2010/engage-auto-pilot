
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Bot } from "lucide-react";
import CompactAIControls from "../CompactAIControls";
import CustomerDetailsCard from "../enhanced/CustomerDetailsCard";
import VehicleInterestCard from "../enhanced/VehicleInterestCard";
import ConversationMetricsCard from "../enhanced/ConversationMetricsCard";
import InventoryValidationPanel from "../enhanced/InventoryValidationPanel";
import EnhancedAIMessagePreview from "../enhanced/EnhancedAIMessagePreview";
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
  const [showAIPreview, setShowAIPreview] = useState(false);

  return (
    <div className="w-80 flex-shrink-0 space-y-4 max-h-screen overflow-y-auto">
      {/* Enhanced Customer Details */}
      <CustomerDetailsCard lead={lead} />
      
      {/* Vehicle Interest */}
      <VehicleInterestCard lead={lead} />
      
      {/* Conversation Metrics */}
      <ConversationMetricsCard lead={lead} />
      
      {/* Inventory Validation */}
      <InventoryValidationPanel lead={lead} />

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

      {/* Enhanced AI Message Preview */}
      {!showAIPreview && (
        <Button 
          onClick={() => setShowAIPreview(true)}
          className="w-full"
          variant="outline"
        >
          <Bot className="w-4 h-4 mr-2" />
          Preview AI Message
        </Button>
      )}
      
      {showAIPreview && (
        <EnhancedAIMessagePreview
          leadId={lead.id}
          leadName={`${lead.firstName} ${lead.lastName}`}
          vehicleInterest={lead.vehicleInterest}
          onMessageSent={() => {
            setShowAIPreview(false);
            onMessageSent?.();
          }}
          onClose={() => setShowAIPreview(false)}
        />
      )}
    </div>
  );
};

export default LeadDetailSidebar;
