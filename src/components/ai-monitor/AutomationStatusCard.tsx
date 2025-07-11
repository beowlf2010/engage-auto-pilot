import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Bot, Clock, Play, BarChart3, CheckCircle, AlertCircle, Zap } from 'lucide-react';
import { useAIAutomationStatus } from '@/hooks/useAIAutomationStatus';
import { toast } from '@/hooks/use-toast';
import { formatDistanceToNow, format } from 'date-fns';

const AutomationStatusCard = () => {
  const { 
    isRunning, 
    lastRunAt, 
    countdown, 
    statistics, 
    triggerTestRun 
  } = useAIAutomationStatus();

  const handleTestRun = async () => {
    try {
      const result = await triggerTestRun();
      toast({
        title: "Test Run Completed",
        description: `Processed ${result.processed || 0} leads`,
      });
    } catch (error) {
      toast({
        title: "Test Run Failed",
        description: "Failed to trigger automation test",
        variant: "destructive"
      });
    }
  };

  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Bot className={`w-5 h-5 ${isRunning ? 'text-green-500 animate-pulse' : 'text-blue-500'}`} />
          AI Automation Status
          {isRunning && (
            <Badge variant="secondary" className="ml-auto animate-pulse">
              <Zap className="w-3 h-3 mr-1" />
              Running
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Status Overview */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <Clock className="w-6 h-6 mx-auto mb-2 text-blue-500" />
            <div className="text-sm text-muted-foreground">Next Run In</div>
            <div className="text-lg font-mono font-bold text-blue-600">
              {countdown}
            </div>
          </div>
          
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <BarChart3 className="w-6 h-6 mx-auto mb-2 text-green-500" />
            <div className="text-sm text-muted-foreground">Today's Messages</div>
            <div className="text-lg font-bold text-green-600">
              {statistics.messagesSuccessful}
            </div>
          </div>
        </div>

        <Separator />

        {/* Last Run Info */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Last Run:</span>
            <span className="font-medium">
              {lastRunAt ? formatDistanceToNow(lastRunAt, { addSuffix: true }) : 'Never'}
            </span>
          </div>
          
          {lastRunAt && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Exact Time:</span>
              <span className="font-mono text-xs">
                {format(lastRunAt, 'MMM dd, HH:mm:ss')}
              </span>
            </div>
          )}
        </div>

        <Separator />

        {/* Today's Statistics */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <div className="text-xs text-muted-foreground">Processed</div>
            <div className="text-lg font-bold">{statistics.messagesProcessed}</div>
          </div>
          <div>
            <div className="flex items-center justify-center gap-1 text-xs text-green-600">
              <CheckCircle className="w-3 h-3" />
              Success
            </div>
            <div className="text-lg font-bold text-green-600">{statistics.messagesSuccessful}</div>
          </div>
          <div>
            <div className="flex items-center justify-center gap-1 text-xs text-red-600">
              <AlertCircle className="w-3 h-3" />
              Failed
            </div>
            <div className="text-lg font-bold text-red-600">{statistics.messagesFailed}</div>
          </div>
        </div>

        <Separator />

        {/* Actions */}
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleTestRun}
            disabled={isRunning}
            className="flex-1"
          >
            <Play className="w-3 h-3 mr-1" />
            Test Run
          </Button>
        </div>

        {/* Automation Schedule Info */}
        <div className="text-xs text-muted-foreground text-center p-2 bg-blue-50 rounded">
          🤖 Automation runs every 15 minutes automatically
        </div>
      </CardContent>
    </Card>
  );
};

export default AutomationStatusCard;