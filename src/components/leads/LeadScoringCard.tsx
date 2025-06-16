
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Loader2, TrendingUp, AlertTriangle, Target, MessageSquare, Clock, Heart, Zap } from 'lucide-react';
import { LeadScore, calculateLeadScore } from '@/services/leadScoringService';

interface LeadScoringCardProps {
  leadId: string;
}

const LeadScoringCard = ({ leadId }: LeadScoringCardProps) => {
  const [score, setScore] = useState<LeadScore | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadLeadScore = async () => {
      try {
        setLoading(true);
        const leadScore = await calculateLeadScore(leadId);
        setScore(leadScore);
      } catch (error) {
        console.error('Error loading lead score:', error);
      } finally {
        setLoading(false);
      }
    };

    if (leadId) {
      loadLeadScore();
    }
  }, [leadId]);

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBackground = (score: number) => {
    if (score >= 70) return 'bg-green-100';
    if (score >= 40) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  const getRiskBadgeColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'default';
      case 'medium': return 'secondary';
      case 'high': return 'destructive';
      default: return 'outline';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (!score) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <p className="text-sm text-gray-500">Unable to calculate lead score</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Lead Score Analysis
          </div>
          <Badge variant={getRiskBadgeColor(score.riskLevel)}>
            {score.riskLevel.toUpperCase()} RISK
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Overall Score */}
        <div className="text-center mb-6">
          <div className={`text-6xl font-bold ${getScoreColor(score.overallScore)} mb-2`}>
            {score.overallScore}
          </div>
          <div className="text-sm text-gray-600">Overall Lead Score</div>
          <Progress 
            value={score.overallScore} 
            className="mt-2" 
          />
        </div>

        {/* Score Breakdown */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-blue-500" />
                <span className="text-sm">Engagement</span>
              </div>
              <span className={`font-semibold ${getScoreColor(score.engagementScore)}`}>
                {score.engagementScore}
              </span>
            </div>
            <Progress value={score.engagementScore} className="h-2" />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-green-500" />
                <span className="text-sm">Response</span>
              </div>
              <span className={`font-semibold ${getScoreColor(score.responseScore)}`}>
                {score.responseScore}
              </span>
            </div>
            <Progress value={score.responseScore} className="h-2" />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Heart className="h-4 w-4 text-red-500" />
                <span className="text-sm">Sentiment</span>
              </div>
              <span className={`font-semibold ${getScoreColor(score.sentimentScore)}`}>
                {score.sentimentScore}
              </span>
            </div>
            <Progress value={score.sentimentScore} className="h-2" />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-purple-500" />
                <span className="text-sm">Urgency</span>
              </div>
              <span className={`font-semibold ${getScoreColor(score.urgencyScore)}`}>
                {score.urgencyScore}
              </span>
            </div>
            <Progress value={score.urgencyScore} className="h-2" />
          </div>
        </div>

        {/* Score Details */}
        <div className="grid grid-cols-2 gap-4 mb-6 text-xs">
          <div className="space-y-1">
            <div className="flex justify-between">
              <span>Message Frequency:</span>
              <span>{score.scoreBreakdown.messageFrequency}</span>
            </div>
            <div className="flex justify-between">
              <span>Response Time:</span>
              <span>{score.scoreBreakdown.responseTime}</span>
            </div>
            <div className="flex justify-between">
              <span>Conversation Depth:</span>
              <span>{score.scoreBreakdown.conversationDepth}</span>
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span>Positive Keywords:</span>
              <span>{score.scoreBreakdown.positiveKeywords}</span>
            </div>
            <div className="flex justify-between">
              <span>Urgency Indicators:</span>
              <span>{score.scoreBreakdown.urgencyIndicators}</span>
            </div>
          </div>
        </div>

        {/* Recommendations */}
        {score.recommendations.length > 0 && (
          <div className="border-t pt-4">
            <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Recommendations
            </h4>
            <ul className="space-y-1">
              {score.recommendations.map((rec, index) => (
                <li key={index} className="text-sm text-gray-600 flex items-start gap-2">
                  <span className="text-blue-500 text-xs">•</span>
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LeadScoringCard;
