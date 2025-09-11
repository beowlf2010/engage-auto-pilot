
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Clock } from 'lucide-react';

const SchedulingInfoCard: React.FC = () => {
  // Calculate next message time (24 hours from now) using milliseconds to prevent year rollover
  const nextMessageTime = new Date();
  nextMessageTime.setTime(nextMessageTime.getTime() + (24 * 60 * 60 * 1000));

  return (
    <Card className="bg-primary/5 border-primary/20">
      <CardContent className="p-3">
        <div className="flex items-center gap-2 text-sm">
          <Clock className="w-4 h-4 text-primary" />
          <div>
            <div className="font-medium text-foreground">
              Next AI message scheduled for:
            </div>
            <div className="text-muted-foreground">
              {nextMessageTime.toLocaleDateString()} at{' '}
              {nextMessageTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SchedulingInfoCard;
