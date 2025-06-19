
import React from "react";
import EnhancedAIStatusDisplay from "../../EnhancedAIStatusDisplay";

interface AIStatusBadgeProps {
  aiOptIn: boolean;
  pendingHumanResponse: boolean;
  aiSequencePaused: boolean;
  messageIntensity?: string;
  aiMessagesSent?: number;
  incomingCount?: number;
  outgoingCount?: number;
}

const AIStatusBadge: React.FC<AIStatusBadgeProps> = ({
  aiOptIn,
  pendingHumanResponse,
  aiSequencePaused,
  messageIntensity = 'gentle',
  aiMessagesSent,
  incomingCount,
  outgoingCount
}) => {
  return (
    <EnhancedAIStatusDisplay
      aiOptIn={aiOptIn}
      messageIntensity={messageIntensity}
      aiMessagesSent={aiMessagesSent}
      aiSequencePaused={aiSequencePaused || pendingHumanResponse}
      pendingHumanResponse={pendingHumanResponse}
      incomingCount={incomingCount}
      outgoingCount={outgoingCount}
      size="sm"
      showDetailed={true}
    />
  );
};

export default AIStatusBadge;
