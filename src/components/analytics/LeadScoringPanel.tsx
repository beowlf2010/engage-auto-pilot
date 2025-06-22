
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Target, 
  Activity,
  RefreshCw,
  ThermometerSun,
  Clock
} from 'lucide-react';
import type { LeadScore, ChurnPrediction } from '@/services/leadScoringService';

interface LeadScoringPanelProps {
  leadScore: LeadScore | null;
  churnPrediction: ChurnPrediction | null;
  isLoading: boolean;
  onRefresh: () => void;
  className?: string;
}

const LeadScoringPanel: React.FC<LeadScoringPanelProps> = ({
  leadScore,
  churnPrediction,
  isLoading,
  onRefresh,
  className = ''
}) => {
  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-600 bg-green-50';
    if (score >= 40) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getChurnColor = (probability: number) => {
    if (probability >= 70) return 'text-red-600 bg-red-50';
    if (probability >= 40) return 'text-yellow-600 bg-yellow-50';
    return 'text-green-600 bg-green-50';
  };

  const getRiskLevelIcon = (level: string) => {
    switch (level) {
      case 'high': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'medium': return <Clock className="h-4 w-4 text-yellow-600" />;
      default: return <Target className="h-4 w-4 text-green-600" />;
    }
  };

  if (!leadScore && !isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Lead Scoring
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-sm text-gray-500 mb-2">No scoring data available</p>
            <Button variant="outline" size="sm" onClick={onRefresh}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Calculate Score
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Overall Lead Score */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ThermometerSun className="h-4 w-4" />
              Lead Temperature
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onRefresh}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {leadScore && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className={`text-3xl font-bold flex items-center gap-2 px-3 py-1 rounded ${getScoreColor(leadScore.overallScore)}`}>
                  {leadScore.overallScore}
                </span>
                <div className="flex items-center gap-2">
                  {getRiskLevelIcon(leadScore.riskLevel)}
                  <Badge variant="outline" className={getScoreColor(leadScore.overallScore)}>
                    {leadScore.riskLevel.toUpperCase()} RISK
                  </Badge>
                </div>
              </div>
              <Progress value={leadScore.overallScore} className="h-2" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Score Breakdown */}
      {leadScore && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Score Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span>Engagement</span>
                <div className="flex items-center gap-2">
                  <Progress value={leadScore.engagementScore} className="h-1 w-16" />
                  <span className="w-8 text-right">{leadScore.engagementScore}</span>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Response Rate</span>
                <div className="flex items-center gap-2">
                  <Progress value={leadScore.responseScore} className="h-1 w-16" />
                  <span className="w-8 text-right">{leadScore.responseScore}</span>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Sentiment</span>
                <div className="flex items-center gap-2">
                  <Progress value={leadScore.sentimentScore} className="h-1 w-16" />
                  <span className="w-8 text-right">{leadScore.sentimentScore}</span>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Urgency</span>
                <div className="flex items-center gap-2">
                  <Progress value={leadScore.urgencyScore} className="h-1 w-16" />
                  <span className="w-8 text-right">{leadScore.urgencyScore}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Churn Risk */}
      {churnPrediction && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingDown className="h-4 w-4" />
              Churn Risk Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Churn Probability</span>
                <span className={`px-2 py-1 rounded text-sm font-bold ${getChurnColor(churnPrediction.churnProbability)}`}>
                  {churnPrediction.churnProbability}%
                </span>
              </div>
              <Progress value={churnPrediction.churnProbability} className="h-2" />
              
              <div className="text-xs text-gray-600">
                <p>Last activity: {churnPrediction.daysSinceLastResponse} days ago</p>
              </div>

              {churnPrediction.riskFactors.length > 0 && (
                <div className="space-y-1">
                  <span className="text-xs font-medium text-gray-700">Risk Factors:</span>
                  {churnPrediction.riskFactors.map((factor, index) => (
                    <div key={index} className="flex items-start gap-2 text-xs">
                      <div className="w-1 h-1 bg-red-500 rounded-full mt-1.5 flex-shrink-0" />
                      <span className="text-gray-600">{factor}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {leadScore?.recommendations.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {leadScore.recommendations.map((recommendation, index) => (
                <div key={index} className="flex items-start gap-2 text-sm">
                  <div className="w-1 h-1 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                  <span>{recommendation}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Intervention Suggestions */}
      {churnPrediction?.interventionSuggestions.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Suggested Interventions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {churnPrediction.interventionSuggestions.map((suggestion, index) => (
                <div key={index} className="flex items-start gap-2 text-sm">
                  <div className="w-1 h-1 bg-orange-500 rounded-full mt-2 flex-shrink-0" />
                  <span>{suggestion}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default LeadScoringPanel;
