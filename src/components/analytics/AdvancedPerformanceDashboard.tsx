
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, TrendingDown, Target, Zap, Brain, AlertCircle, CheckCircle, Clock, Users, MessageSquare, DollarSign } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { realtimeLearningEngine } from '@/services/realtimeLearningEngine';

interface PerformanceMetrics {
  totalMessages: number;
  responseRate: number;
  conversionRate: number;
  averageResponseTime: number;
  totalRevenue: number;
  costPerLead: number;
  roi: number;
  activeLeads: number;
}

interface OptimizationInsight {
  type: string;
  confidence: number;
  impact: string;
  recommendation: string;
  expectedImprovement: number;
}

const AdvancedPerformanceDashboard = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [insights, setInsights] = useState<OptimizationInsight[]>([]);
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d' | '90d'>('7d');
  const [loading, setLoading] = useState(true);
  const [performanceData, setPerformanceData] = useState<any[]>([]);
  const [conversionFunnel, setConversionFunnel] = useState<any[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, [timeRange]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadPerformanceMetrics(),
        loadOptimizationInsights(),
        loadPerformanceChart(),
        loadConversionFunnel()
      ]);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPerformanceMetrics = async () => {
    const endDate = new Date();
    const startDate = new Date();
    
    switch (timeRange) {
      case '24h':
        startDate.setHours(endDate.getHours() - 24);
        break;
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

    // Get message analytics
    const { data: messages } = await supabase
      .from('ai_message_analytics')
      .select('*')
      .gte('sent_at', startDate.toISOString())
      .lte('sent_at', endDate.toISOString());

    // Get conversion data
    const { data: outcomes } = await supabase
      .from('ai_learning_outcomes')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    // Get active leads
    const { data: leads } = await supabase
      .from('leads')
      .select('id, ai_opt_in')
      .eq('ai_opt_in', true);

    const totalMessages = messages?.length || 0;
    const responsesReceived = messages?.filter(m => m.responded_at).length || 0;
    const conversions = outcomes?.filter(o => o.outcome_type === 'sale').length || 0;
    const appointments = outcomes?.filter(o => o.outcome_type === 'appointment_booked').length || 0;
    
    const avgResponseTime = messages?.length > 0 
      ? messages.reduce((sum, m) => sum + (m.response_time_hours || 24), 0) / messages.length 
      : 0;

    const totalRevenue = outcomes?.reduce((sum, o) => sum + (o.outcome_value || 0), 0) || 0;
    const estimatedCostPerMessage = 0.05; // $0.05 per message
    const totalCost = totalMessages * estimatedCostPerMessage;

    setMetrics({
      totalMessages,
      responseRate: totalMessages > 0 ? Math.round((responsesReceived / totalMessages) * 100) : 0,
      conversionRate: totalMessages > 0 ? Math.round(((conversions + appointments) / totalMessages) * 100) : 0,
      averageResponseTime: Math.round(avgResponseTime * 10) / 10,
      totalRevenue,
      costPerLead: leads?.length > 0 ? Math.round(totalCost / leads.length * 100) / 100 : 0,
      roi: totalCost > 0 ? Math.round(((totalRevenue - totalCost) / totalCost) * 100) : 0,
      activeLeads: leads?.length || 0
    });
  };

  const loadOptimizationInsights = async () => {
    const insights = await realtimeLearningEngine.getOptimizationInsights(5);
    setInsights(insights);
  };

  const loadPerformanceChart = async () => {
    const days = timeRange === '24h' ? 1 : timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    const data = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      // Get daily metrics
      const { data: dailyMessages } = await supabase
        .from('ai_message_analytics')
        .select('*')
        .gte('sent_at', `${dateStr}T00:00:00`)
        .lt('sent_at', `${dateStr}T23:59:59`);

      const { data: dailyOutcomes } = await supabase
        .from('ai_learning_outcomes')
        .select('*')
        .gte('created_at', `${dateStr}T00:00:00`)
        .lt('created_at', `${dateStr}T23:59:59`);

      const sent = dailyMessages?.length || 0;
      const responses = dailyMessages?.filter(m => m.responded_at).length || 0;
      const conversions = dailyOutcomes?.length || 0;

      data.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        sent,
        responses,
        conversions,
        responseRate: sent > 0 ? Math.round((responses / sent) * 100) : 0
      });
    }
    
    setPerformanceData(data);
  };

  const loadConversionFunnel = async () => {
    const { data: leads } = await supabase
      .from('leads')
      .select('id, ai_opt_in')
      .eq('ai_opt_in', true);

    const { data: messaged } = await supabase
      .from('ai_message_analytics')
      .select('lead_id')
      .gte('sent_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    const { data: responded } = await supabase
      .from('ai_message_analytics')
      .select('lead_id')
      .not('responded_at', 'is', null)
      .gte('sent_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    const { data: appointments } = await supabase
      .from('ai_learning_outcomes')
      .select('lead_id')
      .eq('outcome_type', 'appointment_booked')
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    const { data: sales } = await supabase
      .from('ai_learning_outcomes')
      .select('lead_id')
      .eq('outcome_type', 'sale')
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    const totalLeads = leads?.length || 0;
    const uniqueMessaged = new Set(messaged?.map(m => m.lead_id)).size;
    const uniqueResponded = new Set(responded?.map(m => m.lead_id)).size;
    const uniqueAppts = new Set(appointments?.map(m => m.lead_id)).size;
    const uniqueSales = new Set(sales?.map(m => m.lead_id)).size;

    setConversionFunnel([
      { stage: 'Total Leads', count: totalLeads, color: '#3B82F6' },
      { stage: 'Messaged', count: uniqueMessaged, color: '#10B981' },
      { stage: 'Responded', count: uniqueResponded, color: '#F59E0B' },
      { stage: 'Appointments', count: uniqueAppts, color: '#8B5CF6' },
      { stage: 'Sales', count: uniqueSales, color: '#EF4444' }
    ]);
  };

  const getMetricIcon = (metric: string) => {
    switch (metric) {
      case 'messages': return <MessageSquare className="h-5 w-5" />;
      case 'response': return <TrendingUp className="h-5 w-5" />;
      case 'conversion': return <Target className="h-5 w-5" />;
      case 'time': return <Clock className="h-5 w-5" />;
      case 'revenue': return <DollarSign className="h-5 w-5" />;
      case 'cost': return <TrendingDown className="h-5 w-5" />;
      case 'roi': return <Zap className="h-5 w-5" />;
      case 'leads': return <Users className="h-5 w-5" />;
      default: return <BarChart className="h-5 w-5" />;
    }
  };

  const getInsightIcon = (impact: string) => {
    switch (impact) {
      case 'high': return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'medium': return <Brain className="h-4 w-4 text-orange-500" />;
      case 'low': return <CheckCircle className="h-4 w-4 text-green-500" />;
      default: return <Brain className="h-4 w-4 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading advanced analytics...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Advanced Performance Analytics</h2>
          <p className="text-muted-foreground">Real-time insights and AI-powered optimization recommendations</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <Select value={timeRange} onValueChange={(value: '24h' | '7d' | '30d' | '90d') => setTimeRange(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Last 24h</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={loadDashboardData} variant="outline" size="sm">
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Performance Metrics */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Messages Sent</p>
                  <p className="text-2xl font-bold">{metrics.totalMessages.toLocaleString()}</p>
                </div>
                {getMetricIcon('messages')}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Response Rate</p>
                  <p className="text-2xl font-bold">{metrics.responseRate}%</p>
                </div>
                {getMetricIcon('response')}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Conversion Rate</p>
                  <p className="text-2xl font-bold">{metrics.conversionRate}%</p>
                </div>
                {getMetricIcon('conversion')}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">ROI</p>
                  <p className="text-2xl font-bold">{metrics.roi}%</p>
                </div>
                {getMetricIcon('roi')}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="performance" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="performance">Performance Trends</TabsTrigger>
          <TabsTrigger value="funnel">Conversion Funnel</TabsTrigger>
          <TabsTrigger value="insights">AI Insights</TabsTrigger>
          <TabsTrigger value="optimization">Optimization</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Performance Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="sent" stroke="#3B82F6" name="Messages Sent" />
                  <Line type="monotone" dataKey="responses" stroke="#10B981" name="Responses" />
                  <Line type="monotone" dataKey="conversions" stroke="#F59E0B" name="Conversions" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="funnel" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Conversion Funnel Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={conversionFunnel} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="stage" type="category" />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3B82F6">
                    {conversionFunnel.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>AI-Generated Insights</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {insights.length > 0 ? insights.map((insight, index) => (
                  <div key={index} className="flex items-start space-x-3 p-4 border rounded-lg">
                    {getInsightIcon(insight.impact)}
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <Badge variant={insight.impact === 'high' ? 'destructive' : insight.impact === 'medium' ? 'default' : 'secondary'}>
                          {insight.impact.toUpperCase()} IMPACT
                        </Badge>
                        <Badge variant="outline">
                          {Math.round(insight.confidence * 100)}% CONFIDENCE
                        </Badge>
                      </div>
                      <p className="font-medium">{insight.recommendation}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Expected improvement: +{insight.expectedImprovement}%
                      </p>
                    </div>
                  </div>
                )) : (
                  <p className="text-center text-muted-foreground py-8">
                    No insights available yet. The AI is still learning from your data.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="optimization" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Optimization Opportunities</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Brain className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Advanced Optimization Coming Soon</h3>
                <p className="text-muted-foreground">
                  Automated A/B testing, predictive analytics, and real-time optimization features are being developed.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdvancedPerformanceDashboard;
