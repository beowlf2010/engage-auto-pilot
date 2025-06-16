
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Activity, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import { TriggerStats } from './types';

interface TriggerStatsCardsProps {
  stats: TriggerStats;
}

const TriggerStatsCards = ({ stats }: TriggerStatsCardsProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card>
        <CardContent className="p-4 text-center">
          <Activity className="h-6 w-6 text-blue-500 mx-auto mb-2" />
          <div className="text-2xl font-bold">{stats.total}</div>
          <div className="text-sm text-gray-600">Total Triggers</div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 text-center">
          <Clock className="h-6 w-6 text-yellow-500 mx-auto mb-2" />
          <div className="text-2xl font-bold">{stats.pending}</div>
          <div className="text-sm text-gray-600">Pending</div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 text-center">
          <CheckCircle className="h-6 w-6 text-green-500 mx-auto mb-2" />
          <div className="text-2xl font-bold">{stats.processed}</div>
          <div className="text-sm text-gray-600">Processed</div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 text-center">
          <AlertTriangle className="h-6 w-6 text-red-500 mx-auto mb-2" />
          <div className="text-2xl font-bold">{stats.highUrgency}</div>
          <div className="text-sm text-gray-600">High Urgency</div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TriggerStatsCards;
