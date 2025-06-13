
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, MessageSquare, Users, Clock } from 'lucide-react';

interface AnalyticsData {
  totalMessagesSent: number;
  totalResponses: number;
  responseRate: number;
  avgResponseTime: number;
  stagePerformance: Array<{
    stage: string;
    sent: number;
    responses: number;
    rate: number;
  }>;
  timeAnalysis: Array<{
    hour: number;
    messages: number;
    responses: number;
  }>;
}

const AnalyticsTab = () => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('7d');

  const fetchAnalytics = async () => {
    try {
      const daysBack = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
      const cutoffDate = new Date(Date.now() - (daysBack * 24 * 60 * 60 * 1000)).toISOString();

      // Get AI messages sent
      const { data: sentMessages, error: sentError } = await supabase
        .from('conversations')
        .select(`
          id,
          sent_at,
          lead_id,
          leads (
            ai_stage
          )
        `)
        .eq('ai_generated', true)
        .eq('direction', 'out')
        .gte('sent_at', cutoffDate);

      if (sentError) throw sentError;

      // Get responses to AI messages
      const responsePromises = (sentMessages || []).map(async (msg) => {
        const { data: responses } = await supabase
          .from('conversations')
          .select('sent_at')
          .eq('lead_id', msg.lead_id)
          .eq('direction', 'in')
          .gt('sent_at', msg.sent_at)
          .order('sent_at', { ascending: true })
          .limit(1);

        return {
          ...msg,
          hasResponse: responses && responses.length > 0,
          responseTime: responses && responses.length > 0 
            ? new Date(responses[0].sent_at).getTime() - new Date(msg.sent_at).getTime()
            : null
        };
      });

      const messagesWithResponses = await Promise.all(responsePromises);
      const responsesReceived = messagesWithResponses.filter(msg => msg.hasResponse);

      // Calculate stage performance
      const stageMap = new Map();
      messagesWithResponses.forEach(msg => {
        const stage = msg.leads?.ai_stage || 'unknown';
        if (!stageMap.has(stage)) {
          stageMap.set(stage, { sent: 0, responses: 0 });
        }
        stageMap.get(stage).sent++;
        if (msg.hasResponse) {
          stageMap.get(stage).responses++;
        }
      });

      const stagePerformance = Array.from(stageMap.entries()).map(([stage, data]) => ({
        stage,
        sent: data.sent,
        responses: data.responses,
        rate: data.sent > 0 ? (data.responses / data.sent) * 100 : 0
      }));

      // Calculate time analysis
      const hourMap = new Map();
      for (let i = 0; i < 24; i++) {
        hourMap.set(i, { messages: 0, responses: 0 });
      }

      messagesWithResponses.forEach(msg => {
        const hour = new Date(msg.sent_at).getHours();
        hourMap.get(hour).messages++;
        if (msg.hasResponse) {
          hourMap.get(hour).responses++;
        }
      });

      const timeAnalysis = Array.from(hourMap.entries()).map(([hour, data]) => ({
        hour,
        messages: data.messages,
        responses: data.responses
      }));

      // Calculate average response time
      const responseTimes = responsesReceived
        .filter(msg => msg.responseTime)
        .map(msg => msg.responseTime!);
      
      const avgResponseTime = responseTimes.length > 0 
        ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
        : 0;

      setAnalytics({
        totalMessagesSent: messagesWithResponses.length,
        totalResponses: responsesReceived.length,
        responseRate: messagesWithResponses.length > 0 
          ? (responsesReceived.length / messagesWithResponses.length) * 100 
          : 0,
        avgResponseTime: avgResponseTime / (1000 * 60 * 60), // Convert to hours
        stagePerformance,
        timeAnalysis
      });

    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatHour = (hour: number) => {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}${period}`;
  };

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]);

  if (loading) {
    return <div className="p-6 text-center">Loading analytics...</div>;
  }

  if (!analytics) {
    return <div className="p-6 text-center">No analytics data available</div>;
  }

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <TrendingUp className="h-5 w-5 text-slate-500" />
          <span className="text-lg font-semibold">AI Performance Analytics</span>
        </div>
        
        <div className="flex space-x-2">
          {['7d', '30d', '90d'].map((range) => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={`px-3 py-1 text-sm rounded ${
                dateRange === range 
                  ? 'bg-blue-100 text-blue-600' 
                  : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <MessageSquare className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{analytics.totalMessagesSent}</p>
                <p className="text-sm text-slate-500">Messages Sent</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{analytics.totalResponses}</p>
                <p className="text-sm text-slate-500">Responses</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-amber-500" />
              <div>
                <p className="text-2xl font-bold">{analytics.responseRate.toFixed(1)}%</p>
                <p className="text-sm text-slate-500">Response Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">{analytics.avgResponseTime.toFixed(1)}h</p>
                <p className="text-sm text-slate-500">Avg Response Time</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stage Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Performance by AI Stage</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analytics.stagePerformance}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="stage" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="sent" fill="#3B82F6" name="Messages Sent" />
                  <Bar dataKey="responses" fill="#10B981" name="Responses" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            <div className="space-y-3">
              {analytics.stagePerformance.map((stage, index) => (
                <div key={stage.stage} className="flex items-center justify-between p-3 bg-slate-50 rounded">
                  <div>
                    <Badge variant="outline">{stage.stage}</Badge>
                    <div className="text-sm text-slate-500 mt-1">
                      {stage.responses}/{stage.sent} responses
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{stage.rate.toFixed(1)}%</div>
                    <div className="text-sm text-slate-500">response rate</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Time Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Messages by Hour of Day</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics.timeAnalysis}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="hour" 
                tickFormatter={formatHour}
              />
              <YAxis />
              <Tooltip 
                labelFormatter={(hour) => `${formatHour(Number(hour))}`}
              />
              <Bar dataKey="messages" fill="#3B82F6" name="Messages Sent" />
              <Bar dataKey="responses" fill="#10B981" name="Responses" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default AnalyticsTab;
