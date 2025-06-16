
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle } from 'lucide-react';
import { BehavioralTrigger } from './types';
import { getTriggerIcon, getUrgencyColor, formatTriggerData } from './triggerUtils';

interface TriggerItemProps {
  trigger: BehavioralTrigger;
}

const TriggerItem = ({ trigger }: TriggerItemProps) => {
  return (
    <div className="flex items-center justify-between p-3 border rounded-lg">
      <div className="flex items-center gap-3">
        {getTriggerIcon(trigger.trigger_type)}
        <div>
          <div className="font-medium">
            {trigger.leads?.first_name} {trigger.leads?.last_name}
          </div>
          <div className="text-sm text-gray-600">
            {formatTriggerData(trigger.trigger_type, trigger.trigger_data)}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="text-right">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium">Score: {trigger.trigger_score}</span>
            <Progress value={trigger.trigger_score} className="w-20 h-2" />
          </div>
          <Badge variant={getUrgencyColor(trigger.urgency_level)}>
            {trigger.urgency_level}
          </Badge>
        </div>
        
        <div className="text-xs text-gray-500">
          {new Date(trigger.created_at).toLocaleDateString()}
        </div>

        {trigger.processed && (
          <CheckCircle className="h-4 w-4 text-green-500" />
        )}
      </div>
    </div>
  );
};

export default TriggerItem;
