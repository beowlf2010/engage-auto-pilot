import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Phone, 
  PhoneCall, 
  Clock, 
  Users, 
  TrendingUp, 
  Pause, 
  Play,
  AlertCircle,
  CheckCircle
} from "lucide-react";
import { autoDialingService } from "@/services/autoDialingService";
import { toast } from "@/hooks/use-toast";

interface CallQueueItem {
  queue_id: string;
  lead_id: string;
  phone_number: string;
  priority: number;
  attempt_count: number;
  lead_name: string;
  lead_temperature: string;
}

interface QueueStatus {
  queued: number;
  calling: number;
  completed: number;
  failed: number;
}

const AutoDialQueue: React.FC = () => {
  const [queueItems, setQueueItems] = useState<CallQueueItem[]>([]);
  const [queueStatus, setQueueStatus] = useState<QueueStatus>({
    queued: 0,
    calling: 0,
    completed: 0,
    failed: 0
  });
  const [isAutoDialing, setIsAutoDialing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadQueueData();
    const interval = setInterval(loadQueueData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadQueueData = async () => {
    try {
      const [nextCalls, status] = await Promise.all([
        autoDialingService.getNextCallsToMake(20),
        autoDialingService.getCallQueueStatus()
      ]);
      
      setQueueItems(nextCalls);
      setQueueStatus(status);
    } catch (error) {
      console.error('Failed to load queue data:', error);
      toast({
        title: "Error",
        description: "Failed to load call queue data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const makeCall = async (item: CallQueueItem) => {
    try {
      setLoading(true);
      await autoDialingService.makeCall(
        item.queue_id,
        item.lead_id,
        item.phone_number
      );
      
      toast({
        title: "Call Initiated",
        description: `Calling ${item.lead_name} at ${item.phone_number}`,
      });
      
      // Refresh the queue
      await loadQueueData();
    } catch (error) {
      toast({
        title: "Call Failed",
        description: "Failed to initiate the call",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const startAutoDialing = async () => {
    setIsAutoDialing(true);
    toast({
      title: "Auto-Dialing Started",
      description: "System will automatically call queued leads",
    });
    
    // Start auto-dialing process
    processAutoDialQueue();
  };

  const stopAutoDialing = () => {
    setIsAutoDialing(false);
    toast({
      title: "Auto-Dialing Stopped",
      description: "Manual control resumed",
    });
  };

  const processAutoDialQueue = async () => {
    if (!isAutoDialing) return;
    
    try {
      const nextCalls = await autoDialingService.getNextCallsToMake(1);
      
      if (nextCalls.length > 0) {
        const nextCall = nextCalls[0];
        await makeCall(nextCall);
        
        // Wait 2 minutes between auto-calls
        setTimeout(() => {
          if (isAutoDialing) {
            processAutoDialQueue();
          }
        }, 120000);
      } else {
        // No calls available, check again in 5 minutes
        setTimeout(() => {
          if (isAutoDialing) {
            processAutoDialQueue();
          }
        }, 300000);
      }
    } catch (error) {
      console.error('Auto-dial error:', error);
      // Retry in 5 minutes on error
      setTimeout(() => {
        if (isAutoDialing) {
          processAutoDialQueue();
        }
      }, 300000);
    }
  };

  const getPriorityColor = (priority: number) => {
    if (priority <= 2) return 'bg-red-500';
    if (priority <= 4) return 'bg-orange-500';
    if (priority <= 6) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getPriorityLabel = (priority: number) => {
    if (priority <= 2) return 'Urgent';
    if (priority <= 4) return 'High';
    if (priority <= 6) return 'Medium';
    return 'Low';
  };

  const getTemperatureColor = (temperature: string) => {
    switch (temperature) {
      case 'hot': return 'bg-red-100 text-red-800';
      case 'warm': return 'bg-orange-100 text-orange-800';
      case 'cool': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const totalItems = queueStatus.queued + queueStatus.calling + queueStatus.completed + queueStatus.failed;
  const completionRate = totalItems > 0 ? ((queueStatus.completed / totalItems) * 100) : 0;

  if (loading && queueItems.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-48">
          <div className="text-center">
            <Phone className="w-8 h-8 animate-pulse mx-auto mb-2 text-muted-foreground" />
            <p className="text-muted-foreground">Loading call queue...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Queue Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-blue-500" />
              <div>
                <p className="text-sm font-medium">Queued</p>
                <p className="text-2xl font-bold">{queueStatus.queued}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <PhoneCall className="w-4 h-4 text-orange-500" />
              <div>
                <p className="text-sm font-medium">Calling</p>
                <p className="text-2xl font-bold">{queueStatus.calling}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <div>
                <p className="text-sm font-medium">Completed</p>
                <p className="text-2xl font-bold">{queueStatus.completed}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-red-500" />
              <div>
                <p className="text-sm font-medium">Failed</p>
                <p className="text-2xl font-bold">{queueStatus.failed}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Auto-Dialing Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center space-x-2">
              <Phone className="w-5 h-5" />
              <span>Auto-Dialing System</span>
            </span>
            <div className="flex items-center space-x-2">
              {isAutoDialing ? (
                <Button onClick={stopAutoDialing} variant="outline" size="sm">
                  <Pause className="w-4 h-4 mr-1" />
                  Stop Auto-Dial
                </Button>
              ) : (
                <Button onClick={startAutoDialing} size="sm">
                  <Play className="w-4 h-4 mr-1" />
                  Start Auto-Dial
                </Button>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Queue Progress</span>
                <span>{Math.round(completionRate)}% Complete</span>
              </div>
              <Progress value={completionRate} className="w-full" />
            </div>
            
            {isAutoDialing && (
              <div className="flex items-center space-x-2 text-sm text-green-600">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span>Auto-dialing active - calls will be made automatically</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Queue Items */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="w-5 h-5" />
            <span>Next Calls ({queueItems.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {queueItems.length === 0 ? (
            <div className="text-center py-8">
              <Phone className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No calls in queue</p>
            </div>
          ) : (
            <div className="space-y-3">
              {queueItems.map((item) => (
                <div
                  key={item.queue_id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                >
                  <div className="flex items-center space-x-4">
                    <div className={`w-2 h-8 rounded ${getPriorityColor(item.priority)}`} />
                    <div>
                      <p className="font-medium">{item.lead_name}</p>
                      <p className="text-sm text-muted-foreground">{item.phone_number}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {getPriorityLabel(item.priority)}
                        </Badge>
                        <Badge className={`text-xs ${getTemperatureColor(item.lead_temperature)}`}>
                          {item.lead_temperature}
                        </Badge>
                        {item.attempt_count > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            Attempt {item.attempt_count + 1}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <Button
                    onClick={() => makeCall(item)}
                    disabled={loading || isAutoDialing}
                    size="sm"
                  >
                    <Phone className="w-4 h-4 mr-1" />
                    Call Now
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AutoDialQueue;