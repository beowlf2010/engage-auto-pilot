
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Bot, Clock, Pause, Play } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface AISequenceStatusProps {
  aiOptIn: boolean;
  aiStage?: string;
  nextAiSendAt?: string;
  aiSequencePaused?: boolean;
  aiPauseReason?: string;
  aiMessagesSent?: number;
}

const AISequenceStatus: React.FC<AISequenceStatusProps> = ({
  aiOptIn,
  aiStage,
  nextAiSendAt,
  aiSequencePaused,
  aiPauseReason,
  aiMessagesSent = 0
}) => {
  if (!aiOptIn) {
    return (
      <div className="flex flex-col gap-1">
        <Badge variant="outline" className="text-xs text-gray-500">
          AI Disabled
        </Badge>
        <div className="text-xs text-gray-400">Manual only</div>
      </div>
    );
  }

  const getStageDisplay = (stage?: string) => {
    switch (stage) {
      case 'initial': return 'Initial Contact';
      case 'initial_follow_up': return 'Follow-up';
      case 'engagement': return 'Engaging';
      case 'gentle_nurture': return 'Nurturing';
      case 'nurture': return 'Nurturing';
      case 'closing': return 'Closing';
      case 'long_term_follow_up': return 'Long-term';
      default: return 'Active';
    }
  };

  const getStageColor = (stage?: string) => {
    switch (stage) {
      case 'initial': return 'bg-blue-100 text-blue-800';
      case 'initial_follow_up': return 'bg-purple-100 text-purple-800';
      case 'engagement': return 'bg-green-100 text-green-800';
      case 'gentle_nurture':
      case 'nurture': return 'bg-yellow-100 text-yellow-800';
      case 'closing': return 'bg-orange-100 text-orange-800';
      case 'long_term_follow_up': return 'bg-gray-100 text-gray-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  const nextSendDisplay = nextAiSendAt ? 
    formatDistanceToNow(new Date(nextAiSendAt), { addSuffix: true }) : 
    'Not scheduled';

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1">
        <Bot className="h-3 w-3 text-blue-600" />
        <Badge className={`text-xs ${getStageColor(aiStage)} border-0`}>
          {getStageDisplay(aiStage)}
        </Badge>
      </div>
      
      {aiSequencePaused ? (
        <div className="flex items-center gap-1">
          <Pause className="h-3 w-3 text-orange-500" />
          <span className="text-xs text-orange-600">Paused</span>
        </div>
      ) : (
        <div className="flex items-center gap-1">
          <Play className="h-3 w-3 text-green-500" />
          <span className="text-xs text-green-600">Active</span>
        </div>
      )}
      
      <div className="flex items-center gap-1 text-xs text-gray-500">
        <Clock className="h-3 w-3" />
        <span>{aiMessagesSent} sent</span>
      </div>
      
      <div className="text-xs text-gray-400" title={nextSendDisplay}>
        Next: {nextSendDisplay.replace(' ago', '').replace('in ', '')}
      </div>
      
      {aiPauseReason && (
        <div className="text-xs text-orange-500" title={aiPauseReason}>
          {aiPauseReason.substring(0, 20)}...
        </div>
      )}
    </div>
  );
};

export default AISequenceStatus;
