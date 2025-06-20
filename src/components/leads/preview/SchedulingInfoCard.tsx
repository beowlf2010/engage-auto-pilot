
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Clock } from 'lucide-react';

const SchedulingInfoCard: React.FC = () => {
  // Calculate next message time (24 hours from now) using milliseconds to prevent year rollover
  const nextMessageTime = new Date();
  nextMessageTime.setTime(nextMessageTime.getTime() + (24 * 60 * 60 * 1000));

  return (
    <Card className="bg-green-50 border-green-200">
      <CardContent className="p-3">
        <div className="flex items-center gap-2 text-sm">
          <Clock className="w-4 h-4 text-green-600" />
          <div>
            <div className="font-medium text-green-900">
              Next AI message scheduled for:
            </div>
            <div className="text-green-700">
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
