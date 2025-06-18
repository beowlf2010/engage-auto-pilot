
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Clock, User, MessageSquare, Eye, Pause, Play } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ScheduledMessage {
  id: string;
  firstName: string;
  lastName: string;
  vehicleInterest: string;
  nextSendAt: string;
  aiStage: string;
  messagesSent: number;
  isPaused: boolean;
  timeUntilDue: string;
  priority: 'high' | 'medium' | 'low';
}

const MessageScheduleOverview = () => {
  const [upcomingMessages, setUpcomingMessages] = useState<ScheduledMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUpcomingMessages();
    const interval = setInterval(fetchUpcomingMessages, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  const fetchUpcomingMessages = async () => {
    try {
      const { data: leads, error } = await supabase
        .from('leads')
        .select('id, first_name, last_name, vehicle_interest, next_ai_send_at, ai_stage, ai_messages_sent, ai_sequence_paused')
        .eq('ai_opt_in', true)
        .not('next_ai_send_at', 'is', null)
        .order('next_ai_send_at', { ascending: true })
        .limit(20);

      if (error) throw error;

      const processedMessages: ScheduledMessage[] = leads?.map(lead => {
        const now = new Date();
        const sendTime = new Date(lead.next_ai_send_at);
        const diffMs = sendTime.getTime() - now.getTime();
        
        let timeUntilDue = '';
        let priority: 'high' | 'medium' | 'low' = 'medium';
        
        if (diffMs < 0) {
          timeUntilDue = 'Overdue';
          priority = 'high';
        } else if (diffMs < 60 * 60 * 1000) { // Less than 1 hour
          const minutes = Math.floor(diffMs / (1000 * 60));
          timeUntilDue = `${minutes}m`;
          priority = 'high';
        } else if (diffMs < 24 * 60 * 60 * 1000) { // Less than 24 hours
          const hours = Math.floor(diffMs / (1000 * 60 * 60));
          timeUntilDue = `${hours}h`;
          priority = diffMs < 6 * 60 * 60 * 1000 ? 'high' : 'medium'; // High if < 6 hours
        } else {
          const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
          timeUntilDue = `${days}d`;
          priority = 'low';
        }

        return {
          id: lead.id,
          firstName: lead.first_name,
          lastName: lead.last_name,
          vehicleInterest: lead.vehicle_interest,
          nextSendAt: lead.next_ai_send_at,
          aiStage: lead.ai_stage || 'initial',
          messagesSent: lead.ai_messages_sent || 0,
          isPaused: lead.ai_sequence_paused || false,
          timeUntilDue,
          priority
        };
      }) || [];

      setUpcomingMessages(processedMessages);
    } catch (error) {
      console.error('Error fetching upcoming messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getTimeBadgeVariant = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Loading upcoming messages...</CardTitle>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const overdueCount = upcomingMessages.filter(m => m.priority === 'high' && m.timeUntilDue === 'Overdue').length;
  const dueSoonCount = upcomingMessages.filter(m => m.priority === 'high' && m.timeUntilDue !== 'Overdue').length;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className={overdueCount > 0 ? 'border-red-200 bg-red-50' : ''}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Clock className="w-4 h-4 mr-2 text-red-600" />
              Overdue Messages
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{overdueCount}</div>
            <p className="text-xs text-muted-foreground">Need immediate attention</p>
          </CardContent>
        </Card>

        <Card className={dueSoonCount > 0 ? 'border-orange-200 bg-orange-50' : ''}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Clock className="w-4 h-4 mr-2 text-orange-600" />
              Due Soon
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{dueSoonCount}</div>
            <p className="text-xs text-muted-foreground">Within next 6 hours</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <MessageSquare className="w-4 h-4 mr-2 text-blue-600" />
              Total Scheduled
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{upcomingMessages.length}</div>
            <p className="text-xs text-muted-foreground">Next 20 messages</p>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Messages List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Upcoming Messages</span>
            <Badge variant="outline">{upcomingMessages.length} scheduled</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {upcomingMessages.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No Messages Scheduled</h3>
              <p className="text-muted-foreground">All AI sequences are up to date</p>
            </div>
          ) : (
            upcomingMessages.map((message) => (
              <div key={message.id} className={`p-4 rounded-lg border ${getPriorityColor(message.priority)}`}>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="flex items-center space-x-1">
                        <User className="w-4 h-4" />
                        <span className="font-medium">
                          {message.firstName} {message.lastName}
                        </span>
                      </div>
                      
                      <Badge variant="outline" className="text-xs">
                        {message.aiStage}
                      </Badge>
                      
                      <Badge variant={getTimeBadgeVariant(message.priority)} className="text-xs">
                        {message.timeUntilDue}
                      </Badge>
                      
                      {message.isPaused && (
                        <Badge variant="secondary" className="text-xs flex items-center space-x-1">
                          <Pause className="w-3 h-3" />
                          <span>Paused</span>
                        </Badge>
                      )}
                    </div>
                    
                    <div className="text-sm text-muted-foreground space-y-1">
                      <div>Interest: {message.vehicleInterest}</div>
                      <div>Messages sent: {message.messagesSent}</div>
                      <div>Next send: {new Date(message.nextSendAt).toLocaleString()}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    <Button variant="outline" size="sm">
                      <Eye className="w-4 h-4" />
                    </Button>
                    
                    <Button variant="outline" size="sm">
                      {message.isPaused ? (
                        <Play className="w-4 h-4" />
                      ) : (
                        <Pause className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
                
                {/* Progress bar for message sequence */}
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>Sequence Progress</span>
                    <span>{message.messagesSent}/10 messages</span>
                  </div>
                  <Progress value={(message.messagesSent / 10) * 100} className="h-2" />
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MessageScheduleOverview;
