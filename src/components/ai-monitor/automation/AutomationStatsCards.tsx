
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

interface AutomationStatsCardsProps {
  totalLeadsInQueue: number;
  messagesLastHour: number;
  successRate: number;
  automationEnabled: boolean;
}

const AutomationStatsCards = ({
  totalLeadsInQueue,
  messagesLastHour,
  successRate,
  automationEnabled
}: AutomationStatsCardsProps) => {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{totalLeadsInQueue}</div>
            <div className="text-sm text-muted-foreground">Leads in Queue</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{messagesLastHour}</div>
            <div className="text-sm text-muted-foreground">Messages Last Hour</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{successRate}%</div>
            <div className="text-sm text-muted-foreground">Success Rate (24h)</div>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold ${automationEnabled ? 'text-green-600' : 'text-red-600'}`}>
              {automationEnabled ? 'ACTIVE' : 'PAUSED'}
            </div>
            <div className="text-sm text-muted-foreground">Status</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AutomationStatsCards;
