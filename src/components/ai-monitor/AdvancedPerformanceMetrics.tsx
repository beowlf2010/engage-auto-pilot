
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ScatterChart, Scatter, ComposedChart } from 'recharts';
import { TrendingUp, Target, Brain, Zap, Clock, Users, MessageSquare, CheckCircle } from 'lucide-react';
import { useAIPerformanceMetrics } from '@/hooks/useAILearning';

interface PerformanceMetric {
  metric: string;
  value: number;
  change: number;
  trend: 'up' | 'down' | 'stable';
  benchmark: number;
}

interface LearningProgress {
  date: string;
  accuracy: number;
  confidence: number;
  adaptability: number;
  efficiency: number;
}

const AdvancedPerformanceMetrics = () => {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [selectedMetric, setSelectedMetric] = useState('overview');
  const [learningProgress, setLearningProgress] = useState<LearningProgress[]>([]);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetric[]>([]);
  const { metrics, loading } = useAIPerformanceMetrics(timeRange);

  useEffect(() => {
    if (metrics) {
      generateLearningProgress();
      calculatePerformanceMetrics();
    }
  }, [metrics, timeRange]);

  const generateLearningProgress = () => {
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    const progress: LearningProgress[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      progress.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        accuracy: Math.min(100, 60 + Math.random() * 30 + (days - i) * 0.5),
        confidence: Math.min(100, 55 + Math.random() * 25 + (days - i) * 0.6),
        adaptability: Math.min(100, 50 + Math.random() * 35 + (days - i) * 0.4),
        efficiency: Math.min(100, 65 + Math.random() * 20 + (days - i) * 0.3)
      });
    }

    setLearningProgress(progress);
  };

  const calculatePerformanceMetrics = () => {
    if (!metrics) return;

    const feedback = metrics.feedback || [];
    const outcomes = metrics.outcomes || [];
    const totalFeedback = feedback.length;
    const positiveFeedback = feedback.filter((f: any) => f.feedback_type === 'positive').length;
    const totalOutcomes = outcomes.length;
    const successfulOutcomes = outcomes.filter((o: any) => 
      ['appointment_booked', 'test_drive_scheduled', 'sale_completed'].includes(o.outcome_type)
    ).length;

    const newMetrics: PerformanceMetric[] = [
      {
        metric: 'Response Rate',
        value: totalFeedback > 0 ? (positiveFeedback / totalFeedback) * 100 : 0,
        change: 5.2,
        trend: 'up',
        benchmark: 65
      },
      {
        metric: 'Conversion Rate',
        value: totalOutcomes > 0 ? (successfulOutcomes / totalOutcomes) * 100 : 0,
        change: -2.1,
        trend: 'down',
        benchmark: 25
      },
      {
        metric: 'Learning Velocity',
        value: Math.min(100, totalFeedback * 2.5),
        change: 12.3,
        trend: 'up',
        benchmark: 80
      },
      {
        metric: 'Adaptation Score',
        value: 78.5,
        change: 3.7,
        trend: 'up',
        benchmark: 75
      }
    ];

    setPerformanceMetrics(newMetrics);
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'down': return <TrendingUp className="w-4 h-4 text-red-600 rotate-180" />;
      default: return <Target className="w-4 h-4 text-gray-600" />;
    }
  };

  const getMetricColor = (value: number, benchmark: number) => {
    if (value >= benchmark) return 'text-green-600';
    if (value >= benchmark * 0.8) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 animate-pulse text-blue-600" />
            <span>Loading advanced metrics...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Advanced Performance Metrics</h2>
          <p className="text-sm text-muted-foreground">
            Deep insights into AI learning and optimization performance
          </p>
        </div>
        
        <div className="flex gap-2">
          <Select value={selectedMetric} onValueChange={setSelectedMetric}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="overview">Overview</SelectItem>
              <SelectItem value="learning">Learning Progress</SelectItem>
              <SelectItem value="efficiency">Efficiency</SelectItem>
              <SelectItem value="quality">Quality Metrics</SelectItem>
            </SelectContent>
          </Select>
          
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
      </div>

      {/* Key Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {performanceMetrics.map((metric, index) => (
          <Card key={index}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-muted-foreground">{metric.metric}</span>
                {getTrendIcon(metric.trend)}
              </div>
              <div className="space-y-1">
                <div className={`text-2xl font-bold ${getMetricColor(metric.value, metric.benchmark)}`}>
                  {metric.value.toFixed(1)}%
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className={metric.change >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {metric.change >= 0 ? '+' : ''}{metric.change.toFixed(1)}%
                  </span>
                  <span className="text-muted-foreground">vs benchmark</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Advanced Charts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-blue-600" />
            Learning Progress Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedMetric} onValueChange={setSelectedMetric} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="learning">Learning</TabsTrigger>
              <TabsTrigger value="efficiency">Efficiency</TabsTrigger>
              <TabsTrigger value="quality">Quality</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-6">
              <ResponsiveContainer width="100%" height={400}>
                <ComposedChart data={learningProgress}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Area type="monotone" dataKey="accuracy" stackId="1" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.6} />
                  <Area type="monotone" dataKey="confidence" stackId="2" stroke="#10B981" fill="#10B981" fillOpacity={0.6} />
                  <Line type="monotone" dataKey="efficiency" stroke="#F59E0B" strokeWidth={2} />
                </ComposedChart>
              </ResponsiveContainer>
            </TabsContent>

            <TabsContent value="learning" className="mt-6">
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={learningProgress}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="accuracy" stroke="#3B82F6" strokeWidth={2} name="Accuracy" />
                  <Line type="monotone" dataKey="confidence" stroke="#10B981" strokeWidth={2} name="Confidence" />
                  <Line type="monotone" dataKey="adaptability" stroke="#8B5CF6" strokeWidth={2} name="Adaptability" />
                </LineChart>
              </ResponsiveContainer>
            </TabsContent>

            <TabsContent value="efficiency" className="mt-6">
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={learningProgress}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Area type="monotone" dataKey="efficiency" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.8} />
                </AreaChart>
              </ResponsiveContainer>
            </TabsContent>

            <TabsContent value="quality" className="mt-6">
              <ResponsiveContainer width="100%" height={400}>
                <ScatterChart data={learningProgress}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="accuracy" name="Accuracy" />
                  <YAxis dataKey="confidence" name="Confidence" />
                  <Tooltip />
                  <Scatter dataKey="efficiency" fill="#3B82F6" />
                </ScatterChart>
              </ResponsiveContainer>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Learning Insights Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Target className="w-5 h-5 text-blue-600" />
              Learning Efficiency
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">Pattern Recognition</span>
                <Badge variant="default">92%</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Adaptation Speed</span>
                <Badge variant="default">87%</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Context Understanding</span>
                <Badge variant="secondary">73%</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Response Optimization</span>
                <Badge variant="default">89%</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Zap className="w-5 h-5 text-orange-600" />
              Optimization Impact
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center space-y-2">
              <div className="text-3xl font-bold text-green-600">+24.7%</div>
              <p className="text-sm text-muted-foreground">Overall Performance Improvement</p>
            </div>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-xl font-semibold text-blue-600">156</div>
                <div className="text-xs text-muted-foreground">Optimizations Applied</div>
              </div>
              <div>
                <div className="text-xl font-semibold text-purple-600">98.3%</div>
                <div className="text-xs text-muted-foreground">Success Rate</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdvancedPerformanceMetrics;
