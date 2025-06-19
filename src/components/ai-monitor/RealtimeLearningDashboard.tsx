
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Brain, Zap, TrendingUp, Activity, AlertCircle, CheckCircle } from 'lucide-react';
import { realtimeLearningService } from '@/services/realtimeLearningService';
import { useRealtimeLearning } from '@/hooks/useRealtimeLearning';

const RealtimeLearningDashboard = () => {
  const [insights, setInsights] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [realtimeEvents, setRealtimeEvents] = useState<any[]>([]);
  const { processOptimizationQueue } = useRealtimeLearning();

  useEffect(() => {
    loadRealtimeInsights();
    const interval = setInterval(loadRealtimeInsights, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadRealtimeInsights = async () => {
    try {
      const data = await realtimeLearningService.getOptimizationInsights('hour');
      setInsights(data);
      
      // Simulate real-time events for demo
      const events = [
        {
          id: 1,
          type: 'optimization_applied',
          message: 'Message timing optimized for Lead #1234',
          timestamp: new Date(Date.now() - 5 * 60 * 1000),
          impact: 'positive'
        },
        {
          id: 2,
          type: 'pattern_detected',
          message: 'High success pattern detected in morning messages',
          timestamp: new Date(Date.now() - 15 * 60 * 1000),
          impact: 'neutral'
        },
        {
          id: 3,
          type: 'performance_alert',
          message: 'Low effectiveness detected for template #567',
          timestamp: new Date(Date.now() - 25 * 60 * 1000),
          impact: 'negative'
        }
      ];
      
      setRealtimeEvents(events);
    } catch (error) {
      console.error('Error loading realtime insights:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'optimization_applied': return <Zap className="w-4 h-4 text-green-600" />;
      case 'pattern_detected': return <Brain className="w-4 h-4 text-blue-600" />;
      case 'performance_alert': return <AlertCircle className="w-4 h-4 text-red-600" />;
      default: return <Activity className="w-4 h-4 text-gray-600" />;
    }
  };

  const getEventColor = (impact: string) => {
    switch (impact) {
      case 'positive': return 'bg-green-50 border-green-200';
      case 'negative': return 'bg-red-50 border-red-200';
      default: return 'bg-blue-50 border-blue-200';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 animate-pulse text-blue-600" />
            <span>Loading real-time learning data...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Real-time Status */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-600" />
            Real-time Learning Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {insights?.totalOptimizations || 0}
              </div>
              <div className="text-xs text-muted-foreground">Active Optimizations</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {insights?.recentFeedback?.length || 0}
              </div>
              <div className="text-xs text-muted-foreground">Recent Feedback</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {insights?.recentOutcomes?.length || 0}
              </div>
              <div className="text-xs text-muted-foreground">Learning Outcomes</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {insights?.activeOptimizations?.length || 0}
              </div>
              <div className="text-xs text-muted-foreground">In Progress</div>
            </div>
          </div>

          <div className="pt-4 border-t">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Learning Velocity</span>
              <Badge variant="outline">
                <TrendingUp className="w-3 h-3 mr-1" />
                High
              </Badge>
            </div>
            <Progress value={85} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Real-time Events */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-blue-600" />
            Live Learning Events
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {realtimeEvents.map((event) => (
              <div 
                key={event.id} 
                className={`border rounded-lg p-3 ${getEventColor(event.impact)}`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {getEventIcon(event.type)}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{event.message}</p>
                    <p className="text-xs text-muted-foreground">
                      {event.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {event.impact}
                  </Badge>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={processOptimizationQueue}
              className="w-full"
            >
              <Zap className="w-3 h-3 mr-1" />
              Process Optimization Queue
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Learning Performance Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Learning Performance (Last Hour)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={generateHourlyData()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Line 
                type="monotone" 
                dataKey="effectiveness" 
                stroke="#3B82F6" 
                strokeWidth={2} 
                name="Effectiveness Score"
              />
              <Line 
                type="monotone" 
                dataKey="optimizations" 
                stroke="#10B981" 
                strokeWidth={2} 
                name="Optimizations Applied"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

// Generate sample hourly data for the chart
const generateHourlyData = () => {
  const data = [];
  for (let i = 11; i >= 0; i--) {
    const time = new Date(Date.now() - i * 5 * 60 * 1000);
    data.push({
      time: time.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
      effectiveness: 60 + Math.random() * 30,
      optimizations: Math.floor(Math.random() * 5)
    });
  }
  return data;
};

export default RealtimeLearningDashboard;
