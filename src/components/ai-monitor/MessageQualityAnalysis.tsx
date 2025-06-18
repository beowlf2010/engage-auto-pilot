
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { TrendingUp, MessageSquare, CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface QualityAnalysisData {
  date: string;
  avgQualityScore: number;
  messagesAnalyzed: number;
  autoApprovalRate: number;
  complianceScore: number;
}

interface QualityFactor {
  factor: string;
  score: number;
  weight: number;
  improvement: string;
}

const MessageQualityAnalysis = () => {
  const [analysisData, setAnalysisData] = useState<QualityAnalysisData[]>([]);
  const [qualityFactors, setQualityFactors] = useState<QualityFactor[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    fetchAnalysisData();
  }, []);

  const fetchAnalysisData = async () => {
    try {
      // Get quality scores for the last 14 days
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 14);

      const { data: qualityScores, error } = await supabase
        .from('conversation_quality_scores')
        .select('overall_score, response_time_score, sentiment_progression_score, professionalism_score, engagement_score, created_at')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at');

      if (error) throw error;

      // Group by date and calculate averages
      const dataByDate = new Map<string, { scores: number[]; count: number }>();
      
      // Initialize all dates in range
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateKey = d.toISOString().split('T')[0];
        dataByDate.set(dateKey, { scores: [], count: 0 });
      }

      // Process quality scores
      qualityScores?.forEach(score => {
        const dateKey = score.created_at.split('T')[0];
        const dayData = dataByDate.get(dateKey);
        if (dayData) {
          dayData.scores.push(score.overall_score);
          dayData.count++;
        }
      });

      // Convert to chart data
      const chartData: QualityAnalysisData[] = Array.from(dataByDate.entries()).map(([date, data]) => {
        const avgScore = data.scores.length > 0 
          ? data.scores.reduce((sum, score) => sum + score, 0) / data.scores.length 
          : 0;
        
        return {
          date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          avgQualityScore: Math.round(avgScore * 10) / 10,
          messagesAnalyzed: data.count,
          autoApprovalRate: avgScore >= 7.0 ? 85 : 65,
          complianceScore: 95 // Mock compliance score
        };
      });

      setAnalysisData(chartData);

      // Calculate quality factors
      if (qualityScores && qualityScores.length > 0) {
        const avgResponseTime = qualityScores.reduce((sum, s) => sum + s.response_time_score, 0) / qualityScores.length;
        const avgSentiment = qualityScores.reduce((sum, s) => sum + s.sentiment_progression_score, 0) / qualityScores.length;
        const avgProfessionalism = qualityScores.reduce((sum, s) => sum + s.professionalism_score, 0) / qualityScores.length;
        const avgEngagement = qualityScores.reduce((sum, s) => sum + s.engagement_score, 0) / qualityScores.length;

        setQualityFactors([
          {
            factor: 'Response Time',
            score: Math.round(avgResponseTime * 10) / 10,
            weight: 25,
            improvement: avgResponseTime < 7 ? 'Reduce response time to improve customer experience' : 'Excellent response times'
          },
          {
            factor: 'Sentiment Progression',
            score: Math.round(avgSentiment * 10) / 10,
            weight: 30,
            improvement: avgSentiment < 7 ? 'Focus on positive conversation progression' : 'Great sentiment management'
          },
          {
            factor: 'Professionalism',
            score: Math.round(avgProfessionalism * 10) / 10,
            weight: 25,
            improvement: avgProfessionalism < 7 ? 'Enhance professional tone and language' : 'Maintaining professional standards'
          },
          {
            factor: 'Engagement',
            score: Math.round(avgEngagement * 10) / 10,
            weight: 20,
            improvement: avgEngagement < 7 ? 'Improve engagement through personalization' : 'High engagement levels'
          }
        ]);
      }
    } catch (error) {
      console.error('Error fetching analysis data:', error);
    } finally {
      setLoading(false);
    }
  };

  const runQualityAnalysis = async () => {
    setAnalyzing(true);
    
    try {
      // Simulate running a comprehensive quality analysis
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Refresh the data
      await fetchAnalysisData();
    } catch (error) {
      console.error('Error running quality analysis:', error);
    } finally {
      setAnalyzing(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 8.0) return 'text-green-600';
    if (score >= 7.0) return 'text-blue-600';
    if (score >= 6.0) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading quality analysis...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  const overallQualityScore = analysisData.length > 0 
    ? analysisData.reduce((sum, day) => sum + day.avgQualityScore, 0) / analysisData.length 
    : 0;

  return (
    <div className="space-y-6">
      {/* Analysis Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Quality Analysis Report</h2>
          <p className="text-muted-foreground">Comprehensive analysis of AI message quality over the last 14 days</p>
        </div>
        
        <Button 
          onClick={runQualityAnalysis}
          disabled={analyzing}
          className="flex items-center space-x-2"
        >
          <RefreshCw className={`w-4 h-4 ${analyzing ? 'animate-spin' : ''}`} />
          <span>{analyzing ? 'Analyzing...' : 'Run Analysis'}</span>
        </Button>
      </div>

      {/* Overall Score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Overall Quality Score</span>
            <Badge variant={overallQualityScore >= 7.0 ? 'default' : 'secondary'}>
              {overallQualityScore >= 8.0 ? 'Excellent' : 
               overallQualityScore >= 7.0 ? 'Good' : 
               overallQualityScore >= 6.0 ? 'Fair' : 'Needs Improvement'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <div className={`text-4xl font-bold ${getScoreColor(overallQualityScore)}`}>
              {Math.round(overallQualityScore * 10) / 10}/10
            </div>
            <div className="flex-1">
              <Progress value={overallQualityScore * 10} className="h-3" />
              <p className="text-sm text-muted-foreground mt-2">
                Based on {analysisData.reduce((sum, day) => sum + day.messagesAnalyzed, 0)} messages analyzed
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quality Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Quality Trend (14 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={analysisData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis domain={[0, 10]} />
              <Tooltip 
                formatter={(value, name) => [
                  typeof value === 'number' ? value.toFixed(1) : value,
                  name === 'avgQualityScore' ? 'Quality Score' : name
                ]}
              />
              <Line 
                type="monotone" 
                dataKey="avgQualityScore" 
                stroke="#8884d8" 
                strokeWidth={2}
                dot={{ r: 4 }}
                name="Quality Score"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Quality Factors */}
      <Card>
        <CardHeader>
          <CardTitle>Quality Factors Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {qualityFactors.map((factor, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">{factor.factor}</span>
                    <Badge variant="outline" className="text-xs">
                      {factor.weight}% weight
                    </Badge>
                  </div>
                  <span className={`font-bold ${getScoreColor(factor.score)}`}>
                    {factor.score}/10
                  </span>
                </div>
                
                <Progress value={factor.score * 10} className="h-2" />
                
                <p className="text-sm text-muted-foreground">
                  {factor.improvement}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Analysis Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CheckCircle className="w-5 h-5 mr-2 text-green-600" />
              Strengths
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {qualityFactors
                .filter(f => f.score >= 7.0)
                .map((factor, index) => (
                  <li key={index} className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <span>{factor.factor} performing well ({factor.score}/10)</span>
                  </li>
                ))}
              {qualityFactors.filter(f => f.score >= 7.0).length === 0 && (
                <li className="text-muted-foreground">No factors currently meeting excellence threshold</li>
              )}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2 text-yellow-600" />
              Improvement Areas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {qualityFactors
                .filter(f => f.score < 7.0)
                .map((factor, index) => (
                  <li key={index} className="flex items-start space-x-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-medium">{factor.factor} ({factor.score}/10)</div>
                      <div className="text-muted-foreground">{factor.improvement}</div>
                    </div>
                  </li>
                ))}
              {qualityFactors.filter(f => f.score < 7.0).length === 0 && (
                <li className="text-green-600">All factors meeting quality standards!</li>
              )}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MessageQualityAnalysis;
