
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, MessageSquare, Users, Calendar, Play, Pause } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface QueuedMessage {
  id: string;
  firstName: string;
  lastName: string;
  vehicleInterest: string;
  nextSendAt: string;
  aiStage: string;
  messagesSent: number;
  isPaused: boolean;
}

const MessageQueueDashboard = () => {
  const [queuedMessages, setQueuedMessages] = useState<QueuedMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalQueued: 0,
    dueNow: 0,
    dueToday: 0,
    paused: 0
  });

  useEffect(() => {
    fetchQueuedMessages();
    const interval = setInterval(fetchQueuedMessages, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  const fetchQueuedMessages = async () => {
    try {
      const { data: messages, error } = await supabase
        .from('leads')
        .select('id, first_name, last_name, vehicle_interest, next_ai_send_at, ai_stage, ai_messages_sent, ai_sequence_paused')
        .eq('ai_opt_in', true)
        .not('next_ai_send_at', 'is', null)
        .order('next_ai_send_at', { ascending: true })
        .limit(50);

      if (error) throw error;

      const now = new Date();
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      const formattedMessages: QueuedMessage[] = (messages || []).map(msg => ({
        id: msg.id,
        firstName: msg.first_name,
        lastName: msg.last_name,
        vehicleInterest: msg.vehicle_interest,
        nextSendAt: msg.next_ai_send_at,
        aiStage: msg.ai_stage || 'initial',
        messagesSent: msg.ai_messages_sent || 0,
        isPaused: msg.ai_sequence_paused || false
      }));

      setQueuedMessages(formattedMessages);

      // Calculate stats
      const dueNow = formattedMessages.filter(msg => 
        new Date(msg.nextSendAt) <= now && !msg.isPaused
      ).length;

      const dueToday = formattedMessages.filter(msg => 
        new Date(msg.nextSendAt) <= todayEnd && !msg.isPaused
      ).length;

      const paused = formattedMessages.filter(msg => msg.isPaused).length;

      setStats({
        totalQueued: formattedMessages.length,
        dueNow,
        dueToday,
        paused
      });

    } catch (error) {
      console.error('Error fetching queued messages:', error);
      toast({
        title: "Error",
        description: "Failed to fetch queued messages",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleMessagePause = async (leadId: string, isPaused: boolean) => {
    try {
      const { error } = await supabase
        .from('leads')
        .update({
          ai_sequence_paused: !isPaused,
          ai_pause_reason: !isPaused ? 'Manual pause' : null
        })
        .eq('id', leadId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `AI sequence ${!isPaused ? 'paused' : 'resumed'}`,
      });

      fetchQueuedMessages();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update AI sequence",
        variant: "destructive"
      });
    }
  };

  const formatTimeUntilSend = (nextSendAt: string) => {
    const now = new Date();
    const sendTime = new Date(nextSendAt);
    const diffMs = sendTime.getTime() - now.getTime();
    
    if (diffMs <= 0) return 'Due now';
    
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffHours > 24) {
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d ${diffHours % 24}h`;
    } else if (diffHours > 0) {
      return `${diffHours}h ${diffMinutes}m`;
    } else {
      return `${diffMinutes}m`;
    }
  };

  const getUrgencyColor = (nextSendAt: string, isPaused: boolean) => {
    if (isPaused) return 'secondary';
    
    const now = new Date();
    const sendTime = new Date(nextSendAt);
    const diffMs = sendTime.getTime() - now.getTime();
    
    if (diffMs <= 0) return 'destructive'; // Overdue
    if (diffMs <= 60 * 60 * 1000) return 'destructive'; // Due within 1 hour
    if (diffMs <= 4 * 60 * 60 * 1000) return 'default'; // Due within 4 hours
    return 'outline'; // Due later
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <MessageSquare className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Queued</p>
                <p className="text-2xl font-bold">{stats.totalQueued}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-red-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Due Now</p>
                <p className="text-2xl font-bold text-red-600">{stats.dueNow}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-orange-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Due Today</p>
                <p className="text-2xl font-bold text-orange-600">{stats.dueToday}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Pause className="w-5 h-5 text-gray-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Paused</p>
                <p className="text-2xl font-bold text-gray-600">{stats.paused}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Message Queue */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MessageSquare className="w-5 h-5" />
            <span>AI Message Queue</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {queuedMessages.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium">No messages queued</p>
              <p className="text-muted-foreground">AI messages will appear here when scheduled</p>
            </div>
          ) : (
            <div className="space-y-4">
              {queuedMessages.map((message) => (
                <div key={message.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <div>
                        <p className="font-medium">
                          {message.firstName} {message.lastName}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {message.vehicleInterest}
                        </p>
                      </div>
                      
                      <Badge variant="outline" className="text-xs">
                        {message.aiStage}
                      </Badge>
                      
                      <Badge variant="secondary" className="text-xs">
                        {message.messagesSent} sent
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {new Date(message.nextSendAt).toLocaleDateString()} at{' '}
                        {new Date(message.nextSendAt).toLocaleTimeString()}
                      </p>
                      <Badge 
                        variant={getUrgencyColor(message.nextSendAt, message.isPaused)}
                        className="text-xs"
                      >
                        {message.isPaused ? 'Paused' : formatTimeUntilSend(message.nextSendAt)}
                      </Badge>
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleMessagePause(message.id, message.isPaused)}
                    >
                      {message.isPaused ? (
                        <Play className="w-4 h-4" />
                      ) : (
                        <Pause className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MessageQueueDashboard;
