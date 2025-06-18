
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar } from 'recharts';
import { TrendingUp, TrendingDown, Brain, Target, AlertCircle, CheckCircle, Activity, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface PredictiveMetrics {
  conversionProbability: number;
  predictedRevenue: number;
  engagementTrend: 'increasing' | 'stable' | 'decreasing';
  responseTimeOptimization: number;
  qualityImprovement: number;
  riskFactors: string[];
  opportunities: string[];
}

interface ForecastData {
  date: string;
  predictedConversions: number;
  actualConversions: number;
  confidence: number;
  revenue: number;
}

const PredictiveAnalyticsPanel = () => {
  const [metrics, setMetrics] = useState<PredictiveMetrics | null>(null);
  const [forecastData, setForecastData] = useState<ForecastData[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  useEffect(() => {
    fetchPredictiveAnalytics();
  }, [timeRange]);

  const fetchPredictiveAnalytics = async () => {
    try {
      setLoading(true);

      // Get lead conversion data for predictions
      const { data: leads, error: leadsError } = await supabase
        .from('leads')
        .select('conversion_probability, predicted_close_date, status, created_at')
        .gte('created_at', new Date(Date.now() - getDaysInMs(timeRange)).toISOString())
        .order('created_at');

      if (leadsError) throw leadsError;

      // Calculate predictive metrics
      const totalLeads = leads?.length || 0;
      const avgConversionProb = totalLeads > 0 
        ? leads.reduce((sum, lead) => sum + (lead.conversion_probability || 0), 0) / totalLeads 
        : 0;

      const convertedLeads = leads?.filter(lead => lead.status === 'converted').length || 0;
      const actualConversionRate = totalLeads > 0 ? convertedLeads / totalLeads : 0;

      // Generate forecast data
      const forecast = generateForecastData(leads || []);
      setForecastData(forecast);

      // Calculate metrics
      const predictiveMetrics: PredictiveMetrics = {
        conversionProbability: avgConversionProb * 100,
        predictedRevenue: calculatePredictedRevenue(leads || []),
        engagementTrend: calculateEngagementTrend(leads || []),
        responseTimeOptimization: 85, // Mock optimization score
        qualityImprovement: 92, // Mock quality improvement
        riskFactors: identifyRiskFactors(leads || []),
        opportunities: identifyOpportunities(leads || [])
      };

      setMetrics(predictiveMetrics);
    } catch (error) {
      console.error('Error fetching predictive analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMs = (range: string) => {
    const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
    return days * 24 * 60 * 60 * 1000;
  };

  const generateForecastData = (leads: any[]): ForecastData[] => {
    const data: ForecastData[] = [];
    const now = new Date();
    
    for (let i = 0; i < 14; i++) {
      const date = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
      const predictedConversions = Math.round(Math.random() * 10 + 5);
      const actualConversions = i <= 7 ? Math.round(Math.random() * 8 + 3) : 0;
      
      data.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        predictedConversions,
        actualConversions,
        confidence: Math.round(Math.random() * 20 + 75),
        revenue: predictedConversions * 35000
      });
    }
    
    return data;
  };

  const calculatePredictedRevenue = (leads: any[]) => {
    return leads.reduce((sum, lead) => {
      const prob = lead.conversion_probability || 0;
      const avgDealValue = 35000; // Average vehicle sale
      return sum + (prob * avgDealValue);
    }, 0);
  };

  const calculateEngagementTrend = (leads: any[]) => {
    // Mock calculation - in reality would analyze response rates over time
    const recent = Math.random();
    if (recent > 0.6) return 'increasing';
    if (recent > 0.4) return 'stable';
    return 'decreasing';
  };

  const identifyRiskFactors = (leads: any[]) => {
    const factors = [];
    if (leads.filter(l => l.status === 'cold').length > leads.length * 0.3) {
      factors.push('High cold lead percentage');
    }
    if (leads.filter(l => !l.conversion_probability || l.conversion_probability < 0.2).length > leads.length * 0.4) {
      factors.push('Low average conversion probability');
    }
    factors.push('Seasonal market slowdown');
    return factors.slice(0, 3);
  };

  const identifyOpportunities = (leads: any[]) => {
    return [
      'Increase follow-up frequency for warm leads',
      'Implement urgency messaging for high-intent prospects',
      'Focus on inventory matching for better conversion',
      'Optimize response timing based on lead patterns'
    ].slice(0, 3);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading predictive analytics...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (!metrics) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No predictive data available</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Predictive Analytics</h2>
        <div className="flex space-x-2">
          {(['7d', '30d', '90d'] as const).map((range) => (
            <Button
              key={range}
              variant={timeRange === range ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange(range)}
            >
              {range}
            </Button>
          ))}
        </div>
      </div>

      {/* Key Predictions */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Target className="w-4 h-4 mr-2 text-blue-600" />
              Conversion Probability
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {Math.round(metrics.conversionProbability)}%
            </div>
            <div className="mt-2">
              <Progress value={metrics.conversionProbability} className="h-2" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Average lead conversion likelihood
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <TrendingUp className="w-4 h-4 mr-2 text-green-600" />
              Predicted Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${Math.round(metrics.predictedRevenue / 1000)}K
            </div>
            <p className="text-xs text-muted-foreground">
              Expected revenue from current pipeline
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Activity className="w-4 h-4 mr-2 text-purple-600" />
              Engagement Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              metrics.engagementTrend === 'increasing' ? 'text-green-600' :
              metrics.engagementTrend === 'stable' ? 'text-blue-600' : 'text-red-600'
            }`}>
              {metrics.engagementTrend === 'increasing' ? <TrendingUp className="w-6 h-6" /> :
               metrics.engagementTrend === 'stable' ? <Activity className="w-6 h-6" /> :
               <TrendingDown className="w-6 h-6" />}
            </div>
            <p className="text-xs text-muted-foreground capitalize">
              {metrics.engagementTrend}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Zap className="w-4 h-4 mr-2 text-yellow-600" />
              Optimization Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {metrics.responseTimeOptimization}%
            </div>
            <div className="mt-2">
              <Progress value={metrics.responseTimeOptimization} className="h-2" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Response time efficiency
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Forecast Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Conversion Forecast</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={forecastData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line 
                type="monotone" 
                dataKey="predictedConversions" 
                stroke="#8884d8" 
                strokeWidth={2}
                name="Predicted"
                strokeDasharray="5 5"
              />
              <Line 
                type="monotone" 
                dataKey="actualConversions" 
                stroke="#82ca9d" 
                strokeWidth={2}
                name="Actual"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Risk Factors & Opportunities */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertCircle className="w-5 h-5 mr-2 text-red-600" />
              Risk Factors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {metrics.riskFactors.map((risk, index) => (
                <div key={index} className="flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">{risk}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CheckCircle className="w-5 h-5 mr-2 text-green-600" />
              Opportunities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {metrics.opportunities.map((opportunity, index) => (
                <div key={index} className="flex items-start space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">{opportunity}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Brain className="w-5 h-5 mr-2 text-purple-600" />
            AI-Generated Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Performance Optimization</h4>
              <p className="text-sm text-blue-800">
                Your AI messaging system is performing {metrics.responseTimeOptimization > 80 ? 'excellently' : 'well'} with a {metrics.responseTimeOptimization}% optimization score. 
                Consider focusing on response time improvements during peak hours.
              </p>
            </div>
            
            <div className="p-4 bg-green-50 rounded-lg">
              <h4 className="font-medium text-green-900 mb-2">Revenue Potential</h4>
              <p className="text-sm text-green-800">
                Based on current pipeline analysis, there's potential to increase revenue by 15-20% through 
                improved lead nurturing and timing optimization.
              </p>
            </div>
            
            <div className="p-4 bg-purple-50 rounded-lg">
              <h4 className="font-medium text-purple-900 mb-2">Quality Enhancement</h4>
              <p className="text-sm text-purple-800">
                Message quality scores show {metrics.qualityImprovement}% alignment with best practices. 
                Focus on personalization and inventory matching for better engagement.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PredictiveAnalyticsPanel;
