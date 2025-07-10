import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { 
  Brain, MessageSquare, TrendingUp, Target, Users, AlertTriangle,
  Activity, BarChart3, PieChart as PieChartIcon, Calendar, Download 
} from 'lucide-react';

const AIAnalyticsDashboardPage = () => {
  const [timeRange, setTimeRange] = useState('7d');
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch AI performance metrics
  const { data: aiMetrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['ai-metrics', timeRange],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_learning_metrics')
        .select('*')
        .order('metric_date', { ascending: false })
        .limit(30);

      if (error) throw error;
      return data;
    },
  });

  // Fetch generated messages analytics
  const { data: messageAnalytics, isLoading: messagesLoading } = useQuery({
    queryKey: ['ai-message-analytics', timeRange],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_generated_messages')
        .select(`
          *,
          leads!inner(first_name, last_name, vehicle_interest)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Fetch churn predictions
  const { data: churnData, isLoading: churnLoading } = useQuery({
    queryKey: ['churn-predictions', timeRange],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_churn_predictions')
        .select(`
          *,
          leads!inner(first_name, last_name, status)
        `)
        .order('predicted_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Fetch lead scores
  const { data: leadScores, isLoading: scoresLoading } = useQuery({
    queryKey: ['lead-scores', timeRange],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_lead_scores')
        .select(`
          *,
          leads!inner(first_name, last_name, status)
        `)
        .order('last_scored_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const isLoading = metricsLoading || messagesLoading || churnLoading || scoresLoading;

  // Process data for charts
  const processedMetrics = aiMetrics?.map(metric => ({
    date: new Date(metric.metric_date).toLocaleDateString(),
    interactions: metric.total_interactions,
    successful: metric.successful_interactions,
    confidence: metric.average_confidence_score * 100,
    improvements: metric.template_improvements,
  })) || [];

  const messagesByType = messageAnalytics?.reduce((acc, message) => {
    acc[message.message_type] = (acc[message.message_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  const messageTypeData = Object.entries(messagesByType).map(([type, count]) => ({
    type,
    count,
    percentage: ((count / (messageAnalytics?.length || 1)) * 100).toFixed(1),
  }));

  const churnRiskDistribution = churnData?.reduce((acc, prediction) => {
    acc[prediction.risk_level] = (acc[prediction.risk_level] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  const churnRiskData = Object.entries(churnRiskDistribution).map(([level, count]) => ({
    level,
    count,
    color: level === 'critical' ? '#ef4444' : 
           level === 'high' ? '#f97316' : 
           level === 'medium' ? '#eab308' : '#22c55e'
  }));

  const scoreDistribution = leadScores?.reduce((acc, score) => {
    const range = score.score >= 80 ? 'High (80-100)' :
                  score.score >= 60 ? 'Medium (60-79)' :
                  score.score >= 40 ? 'Low (40-59)' : 'Very Low (0-39)';
    acc[range] = (acc[range] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  const scoreData = Object.entries(scoreDistribution).map(([range, count]) => ({
    range,
    count,
  }));

  const totalMessages = messageAnalytics?.length || 0;
  const approvedMessages = messageAnalytics?.filter(m => m.human_approved).length || 0;
  const avgConfidence = messageAnalytics?.reduce((sum, m) => sum + m.ai_confidence, 0) / totalMessages || 0;
  const responseRate = messageAnalytics?.filter(m => m.response_received).length / totalMessages || 0;

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            Comprehensive analytics for AI performance and insights
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Last 24 Hours</SelectItem>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="90d">Last 90 Days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI Messages Generated</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMessages}</div>
            <p className="text-xs text-muted-foreground">
              {approvedMessages} approved ({((approvedMessages / totalMessages) * 100).toFixed(1)}%)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Confidence</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(avgConfidence * 100).toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              AI confidence in generated content
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Response Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(responseRate * 100).toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Customer responses to AI messages
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Churn Predictions</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{churnData?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              Active churn risk assessments
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="messages">Message Analytics</TabsTrigger>
          <TabsTrigger value="churn">Churn Analysis</TabsTrigger>
          <TabsTrigger value="scoring">Lead Scoring</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>AI Interactions Over Time</CardTitle>
                <CardDescription>
                  Total interactions and success rate trends
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={processedMetrics}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="interactions" 
                      stroke="#8884d8" 
                      name="Total Interactions"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="successful" 
                      stroke="#82ca9d" 
                      name="Successful"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Confidence Score Trend</CardTitle>
                <CardDescription>
                  AI confidence levels over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={processedMetrics}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Area 
                      type="monotone" 
                      dataKey="confidence" 
                      stroke="#8884d8" 
                      fill="#8884d8" 
                      fillOpacity={0.3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="messages" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Message Types Distribution</CardTitle>
                <CardDescription>
                  Breakdown of AI-generated message types
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={messageTypeData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ type, percentage }) => `${type}: ${percentage}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {messageTypeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={`hsl(${index * 60}, 70%, 50%)`} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Generated Messages</CardTitle>
                <CardDescription>
                  Latest AI-generated messages and their status
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-[300px] overflow-y-auto">
                  {messageAnalytics?.slice(0, 10).map((message) => (
                    <div key={message.id} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline">{message.message_type}</Badge>
                        <div className="flex items-center gap-2">
                          {message.human_approved && (
                            <Badge variant="default">Approved</Badge>
                          )}
                          {message.response_received && (
                            <Badge variant="secondary">Response</Badge>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {message.generated_content}
                      </p>
                      <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                        <span>Confidence: {(message.ai_confidence * 100).toFixed(1)}%</span>
                        <span>{message.leads?.first_name} {message.leads?.last_name}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="churn" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Churn Risk Distribution</CardTitle>
                <CardDescription>
                  Current churn risk levels across all leads
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={churnRiskData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="level" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>High-Risk Leads</CardTitle>
                <CardDescription>
                  Leads with critical or high churn risk
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-[300px] overflow-y-auto">
                  {churnData?.filter(c => ['critical', 'high'].includes(c.risk_level))
                    .slice(0, 10).map((prediction) => (
                    <div key={prediction.id} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">
                          {prediction.leads?.first_name} {prediction.leads?.last_name}
                        </span>
                        <Badge variant={prediction.risk_level === 'critical' ? 'destructive' : 'secondary'}>
                          {prediction.risk_level}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>Probability: {(prediction.churn_probability * 100).toFixed(1)}%</span>
                        <span>Confidence: {(prediction.prediction_confidence * 100).toFixed(1)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="scoring" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Lead Score Distribution</CardTitle>
                <CardDescription>
                  Distribution of AI-calculated lead scores
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={scoreData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="range" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Scored Leads</CardTitle>
                <CardDescription>
                  Highest scoring leads by AI assessment
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-[300px] overflow-y-auto">
                  {leadScores?.sort((a, b) => b.score - a.score)
                    .slice(0, 10).map((score) => (
                    <div key={score.id} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">
                          {score.leads?.first_name} {score.leads?.last_name}
                        </span>
                        <Badge variant={score.score >= 80 ? 'default' : 
                                      score.score >= 60 ? 'secondary' : 'outline'}>
                          Score: {score.score}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>Engagement: {score.engagement_level}</span>
                        <span>Conversion: {(score.conversion_probability * 100).toFixed(1)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>AI Performance Metrics</CardTitle>
              <CardDescription>
                Detailed performance analytics and trends
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={processedMetrics}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="confidence" 
                    stroke="#8884d8" 
                    name="Confidence %"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="improvements" 
                    stroke="#82ca9d" 
                    name="Template Improvements"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AIAnalyticsDashboardPage;