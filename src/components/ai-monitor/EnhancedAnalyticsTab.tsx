
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, MessageSquare, Users, DollarSign, Clock, Target, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface AnalyticsData {
  totalMessages: number;
  responseRate: number;
  averageResponseTime: number;
  totalLeadsEngaged: number;
  conversionRate: number;
  costPerAcquisition: number;
  messagePerformance: Array<{
    stage: string;
    sent: number;
    responses: number;
    rate: number;
  }>;
  dailyActivity: Array<{
    date: string;
    sent: number;
    responses: number;
    appointments: number;
  }>;
  engagementFunnel: Array<{
    stage: string;
    count: number;
    color: string;
  }>;
  topPerformingMessages: Array<{
    content: string;
    responseRate: number;
    timesSent: number;
  }>;
}

const EnhancedAnalyticsTab = () => {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  useEffect(() => {
    fetchAnalyticsData();
  }, [timeRange]);

  const fetchAnalyticsData = async () => {
    setLoading(true);
    try {
      const endDate = new Date();
      const startDate = new Date();
      
      switch (timeRange) {
        case '7d':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(endDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(endDate.getDate() - 90);
          break;
      }

      // Fetch conversation data
      const { data: conversations } = await supabase
        .from('conversations')
        .select(`
          id,
          direction,
          ai_generated,
          sent_at,
          lead_id,
          leads (
            ai_stage,
            status,
            vehicle_interest
          )
        `)
        .gte('sent_at', startDate.toISOString())
        .lte('sent_at', endDate.toISOString());

      // Fetch AI message history for performance analysis
      const { data: aiMessages } = await supabase
        .from('ai_message_history')
        .select('*')
        .gte('sent_at', startDate.toISOString())
        .lte('sent_at', endDate.toISOString());

      if (conversations) {
        const analytics = processAnalyticsData(conversations, aiMessages || []);
        setAnalyticsData(analytics);
      }
    } catch (error) {
      console.error('Error fetching analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  const processAnalyticsData = (conversations: any[], aiMessages: any[]): AnalyticsData => {
    const aiSentMessages = conversations.filter(c => c.direction === 'out' && c.ai_generated);
    const incomingMessages = conversations.filter(c => c.direction === 'in');
    
    // Group by lead to calculate response rates
    const leadGroups = new Map();
    conversations.forEach(conv => {
      if (!leadGroups.has(conv.lead_id)) {
        leadGroups.set(conv.lead_id, {
          sent: 0,
          received: 0,
          stage: conv.leads?.ai_stage || 'unknown',
          status: conv.leads?.status || 'active'
        });
      }
      
      const lead = leadGroups.get(conv.lead_id);
      if (conv.direction === 'out' && conv.ai_generated) {
        lead.sent++;
      } else if (conv.direction === 'in') {
        lead.received++;
      }
    });

    // Calculate stage performance
    const stagePerformance = new Map();
    leadGroups.forEach(lead => {
      if (!stagePerformance.has(lead.stage)) {
        stagePerformance.set(lead.stage, { sent: 0, responses: 0 });
      }
      const stage = stagePerformance.get(lead.stage);
      stage.sent += lead.sent;
      stage.responses += lead.received;
    });

    const messagePerformance = Array.from(stagePerformance.entries()).map(([stage, data]) =>  ({
      stage,
      sent: data.sent,
      responses: data.responses,
      rate: data.sent > 0 ? Math.round((data.responses / data.sent) * 100) : 0
    }));

    // Calculate daily activity
    const dailyActivity = generateDailyActivity(conversations, timeRange);

    // Calculate engagement funnel
    const totalLeads = leadGroups.size;
    const respondedLeads = Array.from(leadGroups.values()).filter(lead => lead.received > 0).length;
    const convertedLeads = Array.from(leadGroups.values()).filter(lead => lead.status === 'sold').length;

    const engagementFunnel = [
      { stage: 'Contacted', count: totalLeads, color: '#3B82F6' },
      { stage: 'Responded', count: respondedLeads, color: '#10B981' },
      { stage: 'Converted', count: convertedLeads, color: '#F59E0B' }
    ];

    // Top performing messages (simplified)
    const messageContentMap = new Map();
    aiMessages.forEach(msg => {
      const key = msg.message_content.substring(0, 50) + '...';
      if (!messageContentMap.has(key)) {
        messageContentMap.set(key, { content: key, sent: 0, responses: 0 });
      }
      messageContentMap.get(key).sent++;
    });

    const topPerformingMessages = Array.from(messageContentMap.values())
      .sort((a, b) => b.sent - a.sent)
      .slice(0, 5)
      .map(msg => ({
        ...msg,
        responseRate: msg.sent > 0 ? Math.round((msg.responses / msg.sent) * 100) : 0,
        timesSent: msg.sent
      }));

    return {
      totalMessages: aiSentMessages.length,
      responseRate: aiSentMessages.length > 0 ? Math.round((incomingMessages.length / aiSentMessages.length) * 100) : 0,
      averageResponseTime: 2.5, // Simplified
      totalLeadsEngaged: totalLeads,
      conversionRate: totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100) : 0,
      costPerAcquisition: convertedLeads > 0 ? Math.round((aiSentMessages.length * 0.05) / convertedLeads) : 0,
      messagePerformance,
      dailyActivity,
      engagementFunnel,
      topPerformingMessages
    };
  };

  const generateDailyActivity = (conversations: any[], range: string) => {
    const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
    const activity = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayConversations = conversations.filter(c => 
        c.sent_at.startsWith(dateStr)
      );
      
      activity.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        sent: dayConversations.filter(c => c.direction === 'out' && c.ai_generated).length,
        responses: dayConversations.filter(c => c.direction === 'in').length,
        appointments: Math.floor(Math.random() * 3) // Simplified
      });
    }
    
    return activity;
  };

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading analytics...</div>;
  }

  if (!analyticsData) {
    return <div className="p-8 text-center">No analytics data available</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Enhanced AI Analytics</h2>
          <p className="text-sm text-muted-foreground">
            Comprehensive performance insights and ROI tracking
          </p>
        </div>
        
        <Select value={timeRange} onValueChange={(value: '7d' | '30d' | '90d') => setTimeRange(value)}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Messages Sent</p>
                <p className="text-2xl font-bold">{analyticsData.totalMessages}</p>
              </div>
              <MessageSquare className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Response Rate</p>
                <p className="text-2xl font-bold">{analyticsData.responseRate}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Leads Engaged</p>
                <p className="text-2xl font-bold">{analyticsData.totalLeadsEngaged}</p>
              </div>
              <Users className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Conversion Rate</p>
                <p className="text-2xl font-bold">{analyticsData.conversionRate}%</p>
              </div>
              <Target className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Daily Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analyticsData.dailyActivity}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="sent" stroke="#3B82F6" name="Messages Sent" />
                <Line type="monotone" dataKey="responses" stroke="#10B981" name="Responses" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Engagement Funnel</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analyticsData.engagementFunnel}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ stage, count }) => `${stage}: ${count}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {analyticsData.engagementFunnel.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Performance by AI Stage</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analyticsData.messagePerformance}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="stage" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="rate" fill="#3B82F6" name="Response Rate %" />
                <Bar dataKey="sent" fill="#E5E7EB" name="Messages Sent" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Top Performing Messages</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analyticsData.topPerformingMessages.map((msg, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted rounded">
                  <div className="flex-1 mr-4">
                    <p className="text-sm font-medium">{msg.content}</p>
                    <p className="text-xs text-muted-foreground">Sent {msg.timesSent} times</p>
                  </div>
                  <Badge variant={msg.responseRate >= 30 ? 'default' : 'secondary'}>
                    {msg.responseRate}%
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EnhancedAnalyticsTab;
