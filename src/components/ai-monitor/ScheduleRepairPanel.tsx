
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, RefreshCw, CheckCircle, Clock, Zap } from 'lucide-react';
import { repairOverdueSchedules, type ScheduleRepairResult } from '@/services/aiScheduleRepairService';
import { toast } from '@/hooks/use-toast';

const ScheduleRepairPanel = () => {
  const [isRepairing, setIsRepairing] = useState(false);
  const [lastRepairResult, setLastRepairResult] = useState<ScheduleRepairResult | null>(null);

  const handleRepairSchedules = async () => {
    setIsRepairing(true);
    
    try {
      const result = await repairOverdueSchedules();
      setLastRepairResult(result);
      
      if (result.rescheduled > 0) {
        toast({
          title: "Schedules Repaired",
          description: `Successfully rescheduled ${result.rescheduled} overdue AI messages`,
        });
      } else {
        toast({
          title: "No Issues Found",
          description: "All AI message schedules are up to date",
        });
      }
      
      if (result.errors.length > 0) {
        console.warn('Schedule repair errors:', result.errors);
      }
    } catch (error) {
      console.error('Schedule repair failed:', error);
      toast({
        title: "Repair Failed",
        description: "Failed to repair AI message schedules",
        variant: "destructive"
      });
    } finally {
      setIsRepairing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <RefreshCw className="w-5 h-5" />
          <span>AI Schedule Repair</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          Fix overdue AI message schedules and optimize timing for better engagement.
        </div>

        {lastRepairResult && (
          <div className="p-4 bg-gray-50 rounded-lg space-y-3">
            <div className="text-sm font-medium">Last Repair Results:</div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {lastRepairResult.summary.totalOverdue}
                </div>
                <div className="text-xs text-muted-foreground">Overdue Found</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {lastRepairResult.rescheduled}
                </div>
                <div className="text-xs text-muted-foreground">Rescheduled</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {lastRepairResult.summary.totalActive}
                </div>
                <div className="text-xs text-muted-foreground">Active Schedules</div>
              </div>
            </div>

            {lastRepairResult.errors.length > 0 && (
              <div className="mt-3">
                <Badge variant="destructive" className="mb-2">
                  {lastRepairResult.errors.length} Errors
                </Badge>
                <div className="text-xs text-red-600 max-h-20 overflow-y-auto">
                  {lastRepairResult.errors.slice(0, 3).map((error, idx) => (
                    <div key={idx}>• {error}</div>
                  ))}
                  {lastRepairResult.errors.length > 3 && (
                    <div>... and {lastRepairResult.errors.length - 3} more</div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center space-x-2 text-sm">
            <Clock className="w-4 h-4 text-blue-500" />
            <span>Smart spacing between messages</span>
          </div>
          <div className="flex items-center space-x-2 text-sm">
            <Zap className="w-4 h-4 text-green-500" />
            <span>Business hours optimization</span>
          </div>
          <div className="flex items-center space-x-2 text-sm">
            <CheckCircle className="w-4 h-4 text-purple-500" />
            <span>Prevents message flooding</span>
          </div>
        </div>

        <Button 
          onClick={handleRepairSchedules}
          disabled={isRepairing}
          className="w-full"
        >
          {isRepairing ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Repairing Schedules...
            </>
          ) : (
            <>
              <AlertTriangle className="w-4 h-4 mr-2" />
              Repair Overdue Schedules
            </>
          )}
        </Button>

        <div className="text-xs text-muted-foreground">
          This will reschedule overdue AI messages with intelligent timing to avoid overwhelming leads 
          while maintaining engagement momentum.
        </div>
      </CardContent>
    </Card>
  );
};

export default ScheduleRepairPanel;
