
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Bot, MessageCircle, CheckCircle2, Clock, AlertTriangle, Zap, Heart, Users } from 'lucide-react';

interface EnhancedAIStatusDisplayProps {
  aiOptIn: boolean;
  messageIntensity?: string;
  aiMessagesSent?: number;
  aiSequencePaused?: boolean;
  pendingHumanResponse?: boolean;
  incomingCount?: number;
  outgoingCount?: number;
  unrepliedCount?: number; // Use the accurate unreplied count
  size?: 'sm' | 'default';
  showDetailed?: boolean;
}

const EnhancedAIStatusDisplay: React.FC<EnhancedAIStatusDisplayProps> = ({
  aiOptIn,
  messageIntensity = 'gentle',
  aiMessagesSent = 0,
  aiSequencePaused,
  pendingHumanResponse,
  incomingCount = 0,
  outgoingCount = 0,
  unrepliedCount = 0, // Use the accurate count from the hook
  size = 'default',
  showDetailed = false
}) => {
  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';
  
  // Use the accurate unreplied count passed in
  const actualUnrepliedCount = unrepliedCount;
  
  // Only show unreplied count if there are actually unreplied messages
  const hasUnrepliedMessages = actualUnrepliedCount > 0;
  
  // Adjust threshold for more reasonable warning levels
  const highCountThreshold = 5;
  const isHighCount = actualUnrepliedCount >= highCountThreshold;

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
      {/* Main AI Status Badge */}
      <Badge 
        variant="default" 
        className={
          pendingHumanResponse ? 'bg-blue-100 text-blue-700 border-blue-200' :
          aiSequencePaused ? 'bg-yellow-100 text-yellow-700 border-yellow-200' : 
          messageIntensity === 'aggressive' ? 'bg-red-100 text-red-700 border-red-200' :
          'bg-green-100 text-green-700 border-green-200'
        }
      >
        {pendingHumanResponse ? (
          <Users className={`${iconSize} mr-1`} />
        ) : aiSequencePaused ? (
          <Clock className={`${iconSize} mr-1`} />
        ) : messageIntensity === 'aggressive' ? (
          <Zap className={`${iconSize} mr-1`} />
        ) : (
          <Heart className={`${iconSize} mr-1`} />
        )}
        
        {pendingHumanResponse ? 'Human Needed' :
         aiSequencePaused ? 'AI Paused' :
         messageIntensity === 'aggressive' ? 'Aggressive' : 
         messageIntensity === 'gentle' ? 'Gentle' : 'AI Active'}
      </Badge>

      {/* Unreplied Messages Badge - only show if there are unreplied messages */}
      {hasUnrepliedMessages && (
        <Badge 
          variant="outline" 
          className={
            isHighCount ? 'bg-red-100 text-red-700 border-red-200' :
            actualUnrepliedCount > 2 ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
            'bg-orange-100 text-orange-700 border-orange-200'
          }
        >
          <MessageCircle className={`${iconSize} mr-1`} />
          {actualUnrepliedCount} unreplied
        </Badge>
      )}

      {/* High Count Warning - only show for very high counts */}
      {isHighCount && (
        <Badge variant="outline" className="bg-red-100 text-red-700 border-red-200">
          <AlertTriangle className={`${iconSize} mr-1`} />
          High Count
        </Badge>
      )}

      {/* Auto-switch indicator - only for uncontacted leads with gentle setting */}
      {aiMessagesSent === 0 && messageIntensity === 'gentle' && !pendingHumanResponse && !aiSequencePaused && (
        <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-200">
          <Zap className={`${iconSize} mr-1`} />
          Will Auto-Switch
        </Badge>
      )}
    </div>
  );
};

export default EnhancedAIStatusDisplay;
