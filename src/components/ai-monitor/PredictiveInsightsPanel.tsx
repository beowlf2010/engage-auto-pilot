
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Brain, TrendingUp, Target, Zap, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useAIPerformanceMetrics } from '@/hooks/useAILearning';
import { aiLearningService } from '@/services/aiLearningService';

interface PredictiveInsight {
  type: 'performance_trend' | 'optimization_opportunity' | 'risk_alert' | 'success_prediction';
  title: string;
  description: string;
  confidence: number;
  impact: 'high' | 'medium' | 'low';
  timeframe: string;
  actionable: boolean;
  data?: any;
}

const PredictiveInsightsPanel = () => {
  const [insights, setInsights] = useState<PredictiveInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [optimizationProgress, setOptimizationProgress] = useState(0);
  const { metrics } = useAIPerformanceMetrics('month');

  useEffect(() => {
    generatePredictiveInsights();
  }, [metrics]);

  const generatePredictiveInsights = async () => {
    setLoading(true);
    try {
      const generatedInsights: PredictiveInsight[] = [];

      if (metrics) {
        // Performance trend analysis
        const recentPerformance = calculatePerformanceTrend(metrics);
        if (recentPerformance.trend !== 'stable') {
          generatedInsights.push({
            type: 'performance_trend',
            title: `${recentPerformance.trend === 'improving' ? 'Improving' : 'Declining'} Performance Trend`,
            description: `AI response rates have ${recentPerformance.trend === 'improving' ? 'increased' : 'decreased'} by ${recentPerformance.change}% over the last 30 days`,
            confidence: recentPerformance.confidence,
            impact: recentPerformance.change > 10 ? 'high' : 'medium',
            timeframe: 'Next 7-14 days',
            actionable: true,
            data: recentPerformance
          });
        }

        // Optimization opportunities
        const optimizationOps = identifyOptimizationOpportunities(metrics);
        generatedInsights.push(...optimizationOps);

        // Risk alerts
        const risks = identifyRisks(metrics);
        generatedInsights.push(...risks);

        // Success predictions
        const predictions = generateSuccessPredictions(metrics);
        generatedInsights.push(...predictions);
      }

      setInsights(generatedInsights);
      calculateOptimizationProgress(generatedInsights);
    } catch (error) {
      console.error('Error generating predictive insights:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculatePerformanceTrend = (data: any) => {
    const feedback = data.feedback || [];
    const recent = feedback.slice(-10);
    const older = feedback.slice(-20, -10);
    
    const recentPositive = recent.filter((f: any) => f.feedback_type === 'positive').length / recent.length;
    const olderPositive = older.length > 0 ? older.filter((f: any) => f.feedback_type === 'positive').length / older.length : recentPositive;
    
    const change = Math.abs((recentPositive - olderPositive) * 100);
    const trend = recentPositive > olderPositive ? 'improving' : recentPositive < olderPositive ? 'declining' : 'stable';
    
    return {
      trend,
      change: Math.round(change),
      confidence: Math.min(95, 60 + (recent.length * 3))
    };
  };

  const identifyOptimizationOpportunities = (data: any): PredictiveInsight[] => {
    const opportunities: PredictiveInsight[] = [];
    
    // Low response rate opportunity
    const feedback = data.feedback || [];
    const responseRate = feedback.length > 0 ? 
      (feedback.filter((f: any) => f.feedback_type === 'positive').length / feedback.length) * 100 : 0;
    
    if (responseRate < 60) {
      opportunities.push({
        type: 'optimization_opportunity',
        title: 'Message Content Optimization',
        description: `Current response rate of ${responseRate.toFixed(1)}% suggests message content could be improved`,
        confidence: 85,
        impact: 'high',
        timeframe: 'Next 5-7 days',
        actionable: true
      });
    }

    // Template diversification
    const outcomes = data.outcomes || [];
    if (outcomes.length > 5) {
      opportunities.push({
        type: 'optimization_opportunity',
        title: 'Template Diversification',
        description: 'Adding more message variants could improve engagement rates',
        confidence: 75,
        impact: 'medium',
        timeframe: 'Next 2-3 weeks',
        actionable: true
      });
    }

    return opportunities;
  };

  const identifyRisks = (data: any): PredictiveInsight[] => {
    const risks: PredictiveInsight[] = [];
    const feedback = data.feedback || [];
    
    // High negative feedback risk
    const negativeRate = feedback.length > 0 ? 
      (feedback.filter((f: any) => f.feedback_type === 'negative').length / feedback.length) * 100 : 0;
    
    if (negativeRate > 30) {
      risks.push({
        type: 'risk_alert',
        title: 'High Negative Feedback Risk',
        description: `${negativeRate.toFixed(1)}% negative feedback rate requires immediate attention`,
        confidence: 90,
        impact: 'high',
        timeframe: 'Immediate action needed',
        actionable: true
      });
    }

    return risks;
  };

  const generateSuccessPredictions = (data: any): PredictiveInsight[] => {
    const predictions: PredictiveInsight[] = [];
    const outcomes = data.outcomes || [];
    
    if (outcomes.length > 3) {
      const successRate = outcomes.filter((o: any) => 
        ['appointment_booked', 'test_drive_scheduled'].includes(o.outcome_type)
      ).length / outcomes.length * 100;
      
      predictions.push({
        type: 'success_prediction',
        title: 'Conversion Rate Forecast',
        description: `Based on current trends, expecting ${(successRate * 1.1).toFixed(1)}% conversion rate next week`,
        confidence: 78,
        impact: 'medium',
        timeframe: 'Next 7 days',
        actionable: false
      });
    }

    return predictions;
  };

  const calculateOptimizationProgress = (insights: PredictiveInsight[]) => {
    const actionableInsights = insights.filter(i => i.actionable);
    const highImpactInsights = insights.filter(i => i.impact === 'high');
    
    // Simulate optimization progress based on insights
    const progress = Math.max(0, Math.min(100, 
      40 + (actionableInsights.length * 15) + (highImpactInsights.length * 10)
    ));
    
    setOptimizationProgress(progress);
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'performance_trend': return <TrendingUp className="w-4 h-4" />;
      case 'optimization_opportunity': return <Target className="w-4 h-4" />;
      case 'risk_alert': return <AlertTriangle className="w-4 h-4" />;
      case 'success_prediction': return <CheckCircle2 className="w-4 h-4" />;
      default: return <Brain className="w-4 h-4" />;
    }
  };

  const getInsightColor = (type: string, impact: string) => {
    if (type === 'risk_alert') return 'text-red-600';
    if (type === 'optimization_opportunity' && impact === 'high') return 'text-orange-600';
    if (type === 'performance_trend') return 'text-blue-600';
    if (type === 'success_prediction') return 'text-green-600';
    return 'text-gray-600';
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 animate-pulse text-blue-600" />
            <span>Generating predictive insights...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Optimization Progress */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Zap className="w-5 h-5 text-blue-600" />
            AI Optimization Progress
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Learning Optimization</span>
              <span className="font-medium">{optimizationProgress}%</span>
            </div>
            <Progress value={optimizationProgress} className="h-3" />
          </div>
          
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">{insights.filter(i => i.actionable).length}</div>
              <div className="text-xs text-muted-foreground">Actionable Insights</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">{insights.filter(i => i.type === 'success_prediction').length}</div>
              <div className="text-xs text-muted-foreground">Success Predictions</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-600">{insights.filter(i => i.type === 'optimization_opportunity').length}</div>
              <div className="text-xs text-muted-foreground">Opportunities</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Predictive Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-blue-600" />
            Predictive Insights
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {insights.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Brain className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No insights available</p>
              <p className="text-sm">AI is still learning...</p>
            </div>
          ) : (
            insights.map((insight, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className={getInsightColor(insight.type, insight.impact)}>
                      {getInsightIcon(insight.type)}
                    </div>
                    <div>
                      <h4 className="font-medium">{insight.title}</h4>
                      <p className="text-sm text-muted-foreground">{insight.description}</p>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant={insight.impact === 'high' ? 'default' : 'secondary'} className="text-xs">
                      {insight.impact.toUpperCase()}
                    </Badge>
                    <div className="text-xs text-muted-foreground">
                      {insight.confidence}% confidence
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {insight.timeframe}
                  </div>
                  
                  {insight.actionable && (
                    <Button size="sm" variant="outline" className="text-xs">
                      Take Action
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PredictiveInsightsPanel;
