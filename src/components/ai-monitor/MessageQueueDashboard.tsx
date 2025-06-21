
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  MessageSquare,
  Calendar,
  TrendingUp,
  RefreshCw
} from 'lucide-react';

interface QueuedMessage {
  id: string;
  lead_id: string;
  message_content: string;
  message_stage: string;
  urgency_level: string;
  scheduled_send_at: string;
  auto_approved: boolean;
  created_at: string;
  lead?: {
    first_name: string;
    last_name: string;
    vehicle_interest: string;
  };
}

interface QueueStats {
  totalQueued: number;
  highUrgency: number;
  scheduledToday: number;
  autoApproved: number;
  averageWaitTime: number;
}

const MessageQueueDashboard = () => {
  const [queuedMessages, setQueuedMessages] = useState<QueuedMessage[]>([]);
  const [stats, setStats] = useState<QueueStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();

  const loadQueueData = async () => {
    try {
      setLoading(true);

      // Get queued messages with lead details
      const { data: messages, error: messagesError } = await supabase
        .from('ai_message_approval_queue')
        .select(`
          *,
          leads!inner(first_name, last_name, vehicle_interest)
        `)
        .eq('approved', true)
        .is('sent_at', null)
        .order('scheduled_send_at', { ascending: true });

      if (messagesError) {
        console.error('Error loading queued messages:', messagesError);
        return;
      }

      setQueuedMessages(messages || []);

      // Calculate stats
      const now = new Date();
      const today = new Date();
      today.setHours(23, 59, 59, 999);

      const totalQueued = messages?.length || 0;
      const highUrgency = messages?.filter(m => m.urgency_level === 'high').length || 0;
      const scheduledToday = messages?.filter(m => 
        new Date(m.scheduled_send_at) <= today
      ).length || 0;
      const autoApproved = messages?.filter(m => m.auto_approved).length || 0;

      // Calculate average wait time
      const waitTimes = messages?.map(m => {
        const scheduledTime = new Date(m.scheduled_send_at).getTime();
        const createdTime = new Date(m.created_at).getTime();
        return (scheduledTime - createdTime) / (1000 * 60 * 60); // Hours
      }) || [];
      
      const averageWaitTime = waitTimes.length > 0 
        ? waitTimes.reduce((sum, time) => sum + time, 0) / waitTimes.length 
        : 0;

      setStats({
        totalQueued,
        highUrgency,
        scheduledToday,
        autoApproved,
        averageWaitTime
      });

    } catch (error) {
      console.error('Error loading queue data:', error);
      toast({
        title: "Error",
        description: "Failed to load message queue data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const processReadyMessages = async () => {
    try {
      setProcessing(true);
      
      // Get messages ready to send (scheduled time has passed)
      const now = new Date().toISOString();
      const { data: readyMessages } = await supabase
        .from('ai_message_approval_queue')
        .select('*')
        .eq('approved', true)
        .is('sent_at', null)
        .lte('scheduled_send_at', now)
        .limit(10); // Process in batches

      if (!readyMessages || readyMessages.length === 0) {
        toast({
          title: "Queue Status",
          description: "No messages ready to send at this time",
        });
        return;
      }

      // Process each message
      let processedCount = 0;
      for (const message of readyMessages) {
        try {
          // Mark as sent (in a real implementation, this would actually send the SMS)
          await supabase
            .from('ai_message_approval_queue')
            .update({ 
              sent_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', message.id);

          processedCount++;
        } catch (error) {
          console.error(`Error processing message ${message.id}:`, error);
        }
      }

      toast({
        title: "Messages Processed",
        description: `Successfully processed ${processedCount} of ${readyMessages.length} ready messages`,
      });

      // Reload data
      loadQueueData();

    } catch (error) {
      console.error('Error processing ready messages:', error);
      toast({
        title: "Error",
        description: "Failed to process ready messages",
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high': return 'destructive';
      case 'normal': return 'default';
      case 'low': return 'secondary';
      default: return 'default';
    }
  };

  const getTimeUntilSend = (scheduledSendAt: string) => {
    const now = new Date();
    const scheduled = new Date(scheduledSendAt);
    const diff = scheduled.getTime() - now.getTime();
    
    if (diff <= 0) return 'Ready to send';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  useEffect(() => {
    loadQueueData();
    
    // Auto-refresh every minute
    const interval = setInterval(loadQueueData, 60000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-500">Loading message queue...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Queue Statistics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <MessageSquare className="h-4 w-4 text-blue-600" />
                <div>
                  <p className="text-2xl font-bold">{stats.totalQueued}</p>
                  <p className="text-xs text-gray-500">Total Queued</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <div>
                  <p className="text-2xl font-bold">{stats.highUrgency}</p>
                  <p className="text-xs text-gray-500">High Urgency</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-green-600" />
                <div>
                  <p className="text-2xl font-bold">{stats.scheduledToday}</p>
                  <p className="text-xs text-gray-500">Today</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-purple-600" />
                <div>
                  <p className="text-2xl font-bold">{stats.autoApproved}</p>
                  <p className="text-xs text-gray-500">Auto-Approved</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-orange-600" />
                <div>
                  <p className="text-2xl font-bold">{Math.round(stats.averageWaitTime)}h</p>
                  <p className="text-xs text-gray-500">Avg Wait Time</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Queue Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5" />
              <span>Message Schedule Queue</span>
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Button 
                onClick={processReadyMessages}
                disabled={processing}
                variant="default"
                size="sm"
              >
                {processing ? 'Processing...' : 'Process Ready Messages'}
              </Button>
              <Button onClick={loadQueueData} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {queuedMessages.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No messages in queue</p>
            </div>
          ) : (
            <div className="space-y-4">
              {queuedMessages.slice(0, 20).map((message) => (
                <div key={message.id} className="flex items-start justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="font-medium">
                        {message.lead?.first_name} {message.lead?.last_name}
                      </span>
                      <Badge variant={getUrgencyColor(message.urgency_level)}>
                        {message.urgency_level}
                      </Badge>
                      <Badge variant="outline">
                        {message.message_stage}
                      </Badge>
                      {message.auto_approved && (
                        <Badge variant="secondary">
                          Auto-Approved
                        </Badge>
                      )}
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-2">
                      {message.lead?.vehicle_interest}
                    </p>
                    
                    <p className="text-sm bg-white p-2 rounded border">
                      {message.message_content.substring(0, 200)}
                      {message.message_content.length > 200 && '...'}
                    </p>
                  </div>

                  <div className="ml-4 text-right">
                    <div className="flex items-center space-x-2 text-sm text-gray-500 mb-1">
                      <Clock className="h-4 w-4" />
                      <span>{getTimeUntilSend(message.scheduled_send_at)}</span>
                    </div>
                    <p className="text-xs text-gray-400">
                      {new Date(message.scheduled_send_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
              
              {queuedMessages.length > 20 && (
                <div className="text-center py-4 text-gray-500">
                  <p>Showing first 20 of {queuedMessages.length} queued messages</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MessageQueueDashboard;
