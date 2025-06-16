
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Activity } from 'lucide-react';
import { BehavioralTrigger } from './types';
import TriggerItem from './TriggerItem';

interface TriggersListProps {
  triggers: BehavioralTrigger[];
  processing: boolean;
  onProcessTriggers: () => void;
}

const TriggersList = ({ triggers, processing, onProcessTriggers }: TriggersListProps) => {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Behavioral Triggers
          </CardTitle>
          <Button 
            onClick={onProcessTriggers}
            disabled={processing}
            size="sm"
          >
            {processing ? 'Processing...' : 'Process Triggers'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {triggers.map((trigger) => (
            <TriggerItem key={trigger.id} trigger={trigger} />
          ))}

          {triggers.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No behavioral triggers found</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default TriggersList;
