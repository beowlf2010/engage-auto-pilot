
import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bot, Play, Pause, AlertCircle, CheckCircle, Clock, Flame } from 'lucide-react';
import { getAIAutomationStatus, triggerAIAutomation } from '@/services/aiAutomationService';
import { toast } from '@/hooks/use-toast';

const AIAutomationMonitor: React.FC = () => {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [triggering, setTriggering] = useState(false);

  const loadStatus = async () => {
    try {
      setLoading(true);
      const statusData = await getAIAutomationStatus();
      setStatus(statusData);
    } catch (error) {
      console.error('Error loading AI automation status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerAutomation = async () => {
    try {
      setTriggering(true);
      const result = await triggerAIAutomation();
      
      toast({
        title: "Unified AI Automation Triggered",
        description: `Processed ${result.processed} leads. ${result.successful} successful, ${result.failed} failed.`,
      });
      
      // Reload status after triggering
      setTimeout(loadStatus, 1000);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to trigger unified AI automation",
        variant: "destructive",
      });
    } finally {
      setTriggering(false);
    }
  };

  useEffect(() => {
    loadStatus();
    // Refresh status every 30 seconds
    const interval = setInterval(loadStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !status) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-center">
            <div className="text-sm text-gray-500">Loading unified AI status...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Bot className="w-5 h-5 text-blue-600" />
          Unified AI Automation Status
          <Badge variant="outline" className="ml-2 text-xs">
            <Flame className="w-3 h-3 mr-1" />
            Aggressive + Gentle
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-orange-500" />
            <div>
              <div className="text-sm text-gray-600">Messages Due</div>
              <div className="font-semibold">{status?.pendingMessages || 0}</div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <div>
              <div className="text-sm text-gray-600">Sent Today</div>
              <div className="font-semibold">{status?.messagesSentToday || 0}</div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-blue-500" />
            <div>
              <div className="text-sm text-gray-600">AI Enabled Leads</div>
              <div className="font-semibold">{status?.totalAILeads || 0}</div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-purple-500" />
            <div>
              <div className="text-sm text-gray-600">Unified System</div>
              <div className="font-semibold text-green-600">Active</div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant={status?.pendingMessages > 0 ? "destructive" : "outline"}>
              {status?.pendingMessages > 0 ? "Messages Due" : "Up to Date"}
            </Badge>
            <span className="text-sm text-gray-500">
              Last updated: {new Date().toLocaleTimeString()}
            </span>
          </div>
          
          <Button 
            onClick={handleTriggerAutomation}
            disabled={triggering}
            size="sm"
            className="flex items-center gap-2"
          >
            <Play className="w-4 h-4" />
            {triggering ? 'Processing...' : 'Process Now'}
          </Button>
        </div>

        {status?.pendingMessages > 0 && (
          <div className="mt-4 p-3 bg-orange-50 rounded-lg border border-orange-200">
            <div className="text-sm text-orange-800">
              <strong>{status.pendingMessages}</strong> lead{status.pendingMessages !== 1 ? 's' : ''} 
              {status.pendingMessages === 1 ? ' has' : ' have'} messages ready to send.
              The unified system processes aggressive (2-4hr) and gentle (24hr) messaging automatically every 15 minutes.
            </div>
          </div>
        )}

        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="text-sm text-blue-800">
            <strong>Unified System Active:</strong> All AI messaging is now handled by a single system that supports both aggressive (new leads, 2-4 hour intervals) and gentle messaging (engaged leads, 24+ hour intervals). Auto-pauses when customers reply.
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AIAutomationMonitor;
