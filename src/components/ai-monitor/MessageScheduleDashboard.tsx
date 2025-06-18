
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, MessageSquare, TrendingUp, Settings, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import MessageScheduleOverview from './MessageScheduleOverview';
import MessageQueueCalendar from './MessageQueueCalendar';
import ScheduleMetricsCards from './ScheduleMetricsCards';
import MessagePerformanceChart from './MessagePerformanceChart';

interface ScheduleMetrics {
  totalScheduled: number;
  messagesToday: number;
  messagesThisWeek: number;
  avgResponseRate: number;
  activeSequences: number;
  pausedSequences: number;
}

const MessageScheduleDashboard = () => {
  const [metrics, setMetrics] = useState<ScheduleMetrics>({
    totalScheduled: 0,
    messagesToday: 0,
    messagesThisWeek: 0,
    avgResponseRate: 0,
    activeSequences: 0,
    pausedSequences: 0
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchScheduleMetrics();
    const interval = setInterval(fetchScheduleMetrics, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchScheduleMetrics = async () => {
    try {
      // Get scheduled messages count
      const { data: scheduledMessages, error: scheduledError } = await supabase
        .from('leads')
        .select('id, next_ai_send_at, ai_sequence_paused')
        .eq('ai_opt_in', true)
        .not('next_ai_send_at', 'is', null);

      if (scheduledError) throw scheduledError;

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());

      const totalScheduled = scheduledMessages?.length || 0;
      const activeSequences = scheduledMessages?.filter(m => !m.ai_sequence_paused).length || 0;
      const pausedSequences = scheduledMessages?.filter(m => m.ai_sequence_paused).length || 0;

      const messagesToday = scheduledMessages?.filter(m => {
        const sendDate = new Date(m.next_ai_send_at);
        return sendDate >= today && sendDate < new Date(today.getTime() + 24 * 60 * 60 * 1000);
      }).length || 0;

      const messagesThisWeek = scheduledMessages?.filter(m => {
        const sendDate = new Date(m.next_ai_send_at);
        return sendDate >= weekStart;
      }).length || 0;

      // Get response rate from recent AI messages
      const { data: analyticsData, error: analyticsError } = await supabase
        .from('ai_message_analytics')
        .select('responded_at')
        .gte('sent_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      if (analyticsError) throw analyticsError;

      const totalSent = analyticsData?.length || 0;
      const totalResponded = analyticsData?.filter(a => a.responded_at).length || 0;
      const avgResponseRate = totalSent > 0 ? (totalResponded / totalSent) * 100 : 0;

      setMetrics({
        totalScheduled,
        messagesToday,
        messagesThisWeek,
        avgResponseRate: Math.round(avgResponseRate),
        activeSequences,
        pausedSequences
      });
    } catch (error) {
      console.error('Error fetching schedule metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Message Schedule Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor and manage AI messaging schedules across all leads
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="flex items-center space-x-1">
            <MessageSquare className="w-3 h-3" />
            <span>{metrics.totalScheduled} Scheduled</span>
          </Badge>
          
          <Badge variant="outline" className="flex items-center space-x-1">
            <Clock className="w-3 h-3" />
            <span>{metrics.messagesToday} Due Today</span>
          </Badge>
          
          <Button variant="outline" size="sm">
            <Settings className="w-4 h-4 mr-1" />
            Settings
          </Button>
        </div>
      </div>

      {/* Metrics Cards */}
      <ScheduleMetricsCards metrics={metrics} loading={loading} />

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center space-x-2">
            <Eye className="w-4 h-4" />
            <span>Overview</span>
          </TabsTrigger>
          <TabsTrigger value="calendar" className="flex items-center space-x-2">
            <Calendar className="w-4 h-4" />
            <span>Calendar</span>
          </TabsTrigger>
          <TabsTrigger value="performance" className="flex items-center space-x-2">
            <TrendingUp className="w-4 h-4" />
            <span>Performance</span>
          </TabsTrigger>
          <TabsTrigger value="queue" className="flex items-center space-x-2">
            <MessageSquare className="w-4 h-4" />
            <span>Queue</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <MessageScheduleOverview />
        </TabsContent>

        <TabsContent value="calendar" className="space-y-4">
          <MessageQueueCalendar />
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <MessagePerformanceChart />
        </TabsContent>

        <TabsContent value="queue" className="space-y-4">
          <div className="text-center py-8">
            <MessageSquare className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">Enhanced Queue View</h3>
            <p className="text-muted-foreground">
              This will show the enhanced AI queue from Phase 1
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MessageScheduleDashboard;
