
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock } from 'lucide-react';

interface AutomationRun {
  id: string;
  started_at: string;
  completed_at: string | null;
  processed_leads: number;
  successful_sends: number;
  failed_sends: number;
  status: string;
  source: string;
}

interface RecentRunsListProps {
  runs: AutomationRun[];
}

const RecentRunsList = ({ runs }: RecentRunsListProps) => {
  const formatTimeAgo = (timestamp: string) => {
    const diff = Date.now() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) return `${hours}h ${minutes % 60}m ago`;
    return `${minutes}m ago`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default">Completed</Badge>;
      case 'running':
        return <Badge variant="secondary">Running</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Recent Automation Runs
        </CardTitle>
      </CardHeader>
      <CardContent>
        {runs.length === 0 ? (
          <div className="text-center text-muted-foreground py-4">
            No automation runs found. The system will start running automatically every 15 minutes.
          </div>
        ) : (
          <div className="space-y-3">
            {runs.map((run) => (
              <div key={run.id} className="flex items-center justify-between p-3 border rounded">
                <div className="flex items-center gap-3">
                  {getStatusBadge(run.status)}
                  <div>
                    <div className="font-medium">
                      {run.source === 'cron_job' ? 'Automatic Run' : 'Manual Run'}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {formatTimeAgo(run.started_at)}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm">
                    {run.processed_leads} leads processed
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {run.successful_sends} sent, {run.failed_sends} failed
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RecentRunsList;
