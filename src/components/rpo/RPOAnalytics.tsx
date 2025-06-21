
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Database, Target, Brain } from 'lucide-react';

interface AnalyticsData {
  totalRPOCodes: number;
  categoryCounts: { [key: string]: number };
  confidenceDistribution: { [key: string]: number };
  recentMappings: number;
  coverageMetrics: {
    inventoryWithRPO: number;
    totalInventory: number;
    coveragePercentage: number;
  };
}

const RPOAnalytics = () => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      // Get RPO intelligence data
      const { data: rpoData, error: rpoError } = await supabase
        .from('rpo_code_intelligence')
        .select('*');

      if (rpoError) throw rpoError;

      // Get inventory data for coverage analysis
      const { data: inventoryData, error: invError } = await supabase
        .from('inventory')
        .select('rpo_codes');

      if (invError) throw invError;

      // Process analytics
      const categoryCounts: { [key: string]: number } = {};
      const confidenceDistribution: { [key: string]: number } = {
        'High (80-100%)': 0,
        'Medium (60-79%)': 0,
        'Low (0-59%)': 0
      };

      rpoData?.forEach(rpo => {
        // Category counts
        const category = rpo.category || 'unknown';
        categoryCounts[category] = (categoryCounts[category] || 0) + 1;

        // Confidence distribution
        const score = rpo.confidence_score || 0;
        if (score >= 0.8) {
          confidenceDistribution['High (80-100%)']++;
        } else if (score >= 0.6) {
          confidenceDistribution['Medium (60-79%)']++;
        } else {
          confidenceDistribution['Low (0-59%)']++;
        }
      });

      // Calculate coverage metrics
      const inventoryWithRPO = inventoryData?.filter(item => 
        item.rpo_codes && item.rpo_codes.length > 0
      ).length || 0;
      const totalInventory = inventoryData?.length || 0;
      const coveragePercentage = totalInventory > 0 ? (inventoryWithRPO / totalInventory) * 100 : 0;

      // Count recent mappings (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const recentMappings = rpoData?.filter(rpo => 
        new Date(rpo.created_at) > sevenDaysAgo
      ).length || 0;

      setAnalytics({
        totalRPOCodes: rpoData?.length || 0,
        categoryCounts,
        confidenceDistribution,
        recentMappings,
        coverageMetrics: {
          inventoryWithRPO,
          totalInventory,
          coveragePercentage
        }
      });

    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading analytics...</div>
        </CardContent>
      </Card>
    );
  }

  if (!analytics) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">No analytics data available.</div>
        </CardContent>
      </Card>
    );
  }

  const categoryChartData = Object.entries(analytics.categoryCounts).map(([category, count]) => ({
    category: category.charAt(0).toUpperCase() + category.slice(1),
    count
  }));

  const confidenceChartData = Object.entries(analytics.confidenceDistribution).map(([range, count]) => ({
    range,
    count
  }));

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Database className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total RPO Codes</p>
                <p className="text-2xl font-bold">{analytics.totalRPOCodes}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Recent Mappings</p>
                <p className="text-2xl font-bold">{analytics.recentMappings}</p>
                <p className="text-xs text-gray-500">Last 7 days</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Target className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Inventory Coverage</p>
                <p className="text-2xl font-bold">{analytics.coverageMetrics.coveragePercentage.toFixed(1)}%</p>
                <p className="text-xs text-gray-500">
                  {analytics.coverageMetrics.inventoryWithRPO} of {analytics.coverageMetrics.totalInventory} vehicles
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Brain className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">High Confidence</p>
                <p className="text-2xl font-bold">{analytics.confidenceDistribution['High (80-100%)']}</p>
                <p className="text-xs text-gray-500">80%+ accuracy</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>RPO Codes by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={categoryChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Confidence Score Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={confidenceChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ range, count }) => `${range}: ${count}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {confidenceChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Category Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Category Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(analytics.categoryCounts).map(([category, count]) => (
              <div key={category} className="text-center p-4 border rounded-lg">
                <Badge variant="secondary" className="mb-2">
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </Badge>
                <p className="text-2xl font-bold">{count}</p>
                <p className="text-sm text-gray-500">
                  {((count / analytics.totalRPOCodes) * 100).toFixed(1)}%
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RPOAnalytics;
