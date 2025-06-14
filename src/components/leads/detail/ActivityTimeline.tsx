
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, MessageSquare, Clock } from "lucide-react";
import { LeadDetailData } from '@/services/leadDetailService';

interface ActivityTimelineProps {
  activityTimeline: LeadDetailData['activityTimeline'];
}

const ActivityTimeline = ({ activityTimeline }: ActivityTimelineProps) => {
  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'lead_created':
        return <User className="w-4 h-4" />;
      case 'message_sent':
        return <MessageSquare className="w-4 h-4" />;
      case 'message_received':
        return <MessageSquare className="w-4 h-4 text-green-600" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activityTimeline.map((activity, index) => (
            <div key={activity.id} className="relative flex items-start space-x-3">
              <div className="flex-shrink-0">
                {getActivityIcon(activity.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">
                  {activity.description}
                </p>
                <p className="text-xs text-gray-500">
                  {formatTimestamp(activity.timestamp)}
                </p>
              </div>
              {index < activityTimeline.length - 1 && (
                <div className="absolute left-2 mt-6 h-4 w-px bg-gray-200" />
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default ActivityTimeline;
