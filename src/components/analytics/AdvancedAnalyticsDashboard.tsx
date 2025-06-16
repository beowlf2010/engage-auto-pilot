
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Loader2, BarChart3, Users, AlertTriangle, TrendingUp, Target } from 'lucide-react';
import { getAdvancedAnalyticsDashboard } from '@/services/leadScoringService';
import SalesPerformanceDashboard from './SalesPerformanceDashboard';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

const AdvancedAnalyticsDashboard = () => {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const data = await getAdvancedAnalyticsDashboard();
      setDashboardData(data);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#22c55e', '#f59e0b', '#ef4444'];

  const leadScoreChartData = dashboardData ? [
    { name: 'High (70+)', value: dashboardData.leadScoreDistribution.high, color: '#22c55e' },
    { name: 'Medium (40-69)', value: dashboardData.leadScoreDistribution.medium, color: '#f59e0b' },
    { name: 'Low (<40)', value: dashboardData.leadScoreDistribution.low, color: '#ef4444' },
  ] : [];

  const churnRiskChartData = dashboardData ? [
    { name: 'Low Risk', value: dashboardData.churnRiskDistribution.low, color: '#22c55e' },
    { name: 'Medium Risk', value: dashboardData.churnRiskDistribution.medium, color: '#f59e0b' },
    { name: 'High Risk', value: dashboardData.churnRiskDistribution.high, color: '#ef4444' },
  ] : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Advanced Analytics & Insights</h1>
        <Badge variant="outline">
          AI-Powered Analytics
        </Badge>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="lead-scoring">Lead Scoring</TabsTrigger>
          <TabsTrigger value="sales-performance">Sales Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {loading ? (
            <Card>
              <CardContent className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin" />
              </CardContent>
            </Card>
          ) : dashboardData ? (
            <>
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-6 text-center">
                    <Target className="h-8 w-8 text-blue-500 mx-auto mb-3" />
                    <div className="text-3xl font-bold text-blue-600">{dashboardData.averageLeadScore}</div>
                    <div className="text-sm text-gray-600">Average Lead Score</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6 text-center">
                    <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-3" />
                    <div className="text-3xl font-bold text-red-600">{dashboardData.highRiskLeads}</div>
                    <div className="text-sm text-gray-600">High Risk Leads</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6 text-center">
                    <Users className="h-8 w-8 text-green-500 mx-auto mb-3" />
                    <div className="text-3xl font-bold text-green-600">{dashboardData.totalAnalyzedLeads}</div>
                    <div className="text-sm text-gray-600">Leads Analyzed</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6 text-center">
                    <TrendingUp className="h-8 w-8 text-purple-500 mx-auto mb-3" />
                    <div className="text-3xl font-bold text-purple-600">
                      {dashboardData.totalAnalyzedLeads > 0 
                        ? Math.round((dashboardData.highRiskLeads / dashboardData.totalAnalyzedLeads) * 100)
                        : 0}%
                    </div>
                    <div className="text-sm text-gray-600">Churn Risk Rate</div>
                  </CardContent>
                </Card>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Lead Score Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={leadScoreChartData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, value }) => `${name}: ${value}`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {leadScoreChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Churn Risk Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={churnRiskChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="value" fill="#8884d8">
                          {churnRiskChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Insights */}
              <Card>
                <CardHeader>
                  <CardTitle>Key Insights</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <h4 className="font-semibold text-blue-900 mb-2">Lead Quality</h4>
                      <p className="text-sm text-blue-700">
                        {dashboardData.leadScoreDistribution.high > dashboardData.leadScoreDistribution.low
                          ? "Most leads are high quality with good engagement patterns"
                          : "Focus on improving lead qualification and engagement strategies"
                        }
                      </p>
                    </div>
                    <div className="p-4 bg-red-50 rounded-lg">
                      <h4 className="font-semibold text-red-900 mb-2">Churn Risk</h4>
                      <p className="text-sm text-red-700">
                        {dashboardData.churnRiskDistribution.high > 2
                          ? "High number of at-risk leads - implement intervention strategies"
                          : "Churn risk is manageable with current engagement levels"
                        }
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-32">
                <p className="text-gray-500">No analytics data available</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="lead-scoring">
          <Card>
            <CardHeader>
              <CardTitle>Lead Scoring Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                AI-powered lead scoring analyzes engagement patterns, response timing, sentiment, and urgency 
                to provide comprehensive lead quality assessments.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold mb-2">Engagement Score</h4>
                  <p className="text-sm text-gray-600">
                    Measures message frequency and conversation depth
                  </p>
                </div>
                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold mb-2">Response Score</h4>
                  <p className="text-sm text-gray-600">
                    Analyzes response timing and responsiveness patterns
                  </p>
                </div>
                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold mb-2">Sentiment Score</h4>
                  <p className="text-sm text-gray-600">
                    Evaluates positive/negative language in conversations
                  </p>
                </div>
                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold mb-2">Urgency Score</h4>
                  <p className="text-sm text-gray-600">
                    Identifies urgency indicators and buying signals
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sales-performance">
          <SalesPerformanceDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdvancedAnalyticsDashboard;
