
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Bot, MessageCircle, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';

interface EnhancedAIStatusDisplayProps {
  aiOptIn: boolean;
  aiStage?: string;
  aiMessagesSent?: number;
  aiSequencePaused?: boolean;
  incomingCount?: number;
  outgoingCount?: number;
  size?: 'sm' | 'default';
  showDetailed?: boolean;
}

const EnhancedAIStatusDisplay: React.FC<EnhancedAIStatusDisplayProps> = ({
  aiOptIn,
  aiStage,
  aiMessagesSent = 0,
  aiSequencePaused,
  incomingCount = 0,
  outgoingCount = 0,
  size = 'default',
  showDetailed = false
}) => {
  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';
  
  // Calculate unreplied messages (outgoing messages sent without incoming responses)
  const unrepliedCount = Math.max(0, outgoingCount - incomingCount);
  
  // Get message count color based on unreplied messages
  const getMessageCountColor = () => {
    if (unrepliedCount === 0) return 'bg-gray-100 text-gray-700 border-gray-200';
    if (unrepliedCount <= 3) return 'bg-green-100 text-green-700 border-green-200';
    if (unrepliedCount <= 6) return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    return 'bg-red-100 text-red-700 border-red-200';
  };

  // Format AI stage for display
  const formatStage = (stage?: string) => {
    if (!stage) return 'Ready';
    return stage.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (!aiOptIn) {
    return (
      <div className="flex items-center gap-1">
        <Badge variant="outline" className="bg-gray-50 text-gray-500 border-gray-200">
          <Bot className={`${iconSize} mr-1`} />
          Manual
        </Badge>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {/* AI Enabled Status */}
      <Badge 
        variant="default" 
        className={`${aiSequencePaused ? 'bg-yellow-100 text-yellow-700 border-yellow-200' : 'bg-green-100 text-green-700 border-green-200'}`}
      >
        {aiSequencePaused ? (
          <Clock className={`${iconSize} mr-1`} />
        ) : (
          <CheckCircle2 className={`${iconSize} mr-1`} />
        )}
        AI {aiSequencePaused ? 'Paused' : 'Enabled'} ✓
      </Badge>

      {/* AI Stage (if detailed view) */}
      {showDetailed && aiStage && (
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
          {formatStage(aiStage)}
        </Badge>
      )}

      {/* Message Counter */}
      {aiMessagesSent > 0 && (
        <Badge variant="outline" className={getMessageCountColor()}>
          <MessageCircle className={`${iconSize} mr-1`} />
          {unrepliedCount > 0 ? (
            <span>{unrepliedCount} unreplied</span>
          ) : (
            <span>{aiMessagesSent} sent</span>
          )}
        </Badge>
      )}

      {/* High unreplied count warning */}
      {unrepliedCount >= 7 && (
        <Badge variant="outline" className="bg-red-100 text-red-700 border-red-200">
          <AlertTriangle className={`${iconSize} mr-1`} />
          High Count
        </Badge>
      )}
    </div>
  );
};

export default EnhancedAIStatusDisplay;
