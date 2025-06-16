
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, Clock, MessageSquare, Star, Target } from 'lucide-react';
import { ConversationQualityScore } from '@/services/qualityScoringService';
import { formatDistanceToNow } from 'date-fns';

interface QualityScoreCardProps {
  qualityScore: ConversationQualityScore;
  showDetails?: boolean;
}

const QualityScoreCard = ({ qualityScore, showDetails = true }: QualityScoreCardProps) => {
  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-600';
    if (score >= 6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBadgeColor = (score: number) => {
    if (score >= 8) return 'bg-green-100 text-green-800 border-green-200';
    if (score >= 6) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

  const scoreMetrics = [
    { label: 'Response Time', value: qualityScore.responseTimeScore, icon: Clock },
    { label: 'Sentiment Progression', value: qualityScore.sentimentProgressionScore, icon: TrendingUp },
    { label: 'Professionalism', value: qualityScore.professionalismScore, icon: Star },
    { label: 'Engagement', value: qualityScore.engagementScore, icon: MessageSquare },
    { label: 'Close Attempts', value: qualityScore.closeAttemptScore, icon: Target }
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Star className="h-4 w-4" />
            Quality Score
          </CardTitle>
          <Badge variant="outline" className={getScoreBadgeColor(qualityScore.overallScore)}>
            {qualityScore.overallScore.toFixed(1)}/10
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Overall Score</span>
            <span className={`text-lg font-bold ${getScoreColor(qualityScore.overallScore)}`}>
              {qualityScore.overallScore.toFixed(1)}
            </span>
          </div>
          <Progress value={qualityScore.overallScore * 10} className="h-2" />
        </div>

        {showDetails && (
          <>
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Score Breakdown</h4>
              {scoreMetrics.map((metric) => {
                const IconComponent = metric.icon;
                return (
                  <div key={metric.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <IconComponent className="h-3 w-3 text-gray-500" />
                      <span className="text-xs text-gray-600">{metric.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={metric.value * 10} className="h-1 w-16" />
                      <span className={`text-xs font-medium ${getScoreColor(metric.value)}`}>
                        {metric.value.toFixed(1)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {qualityScore.qualityFactors.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Quality Factors</h4>
                <div className="flex flex-wrap gap-1">
                  {qualityScore.qualityFactors.map((factor, index) => (
                    <Badge key={index} variant="outline" className="text-xs bg-green-50 text-green-700">
                      {factor}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {qualityScore.improvementAreas.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Improvement Areas</h4>
                <div className="flex flex-wrap gap-1">
                  {qualityScore.improvementAreas.map((area, index) => (
                    <Badge key={index} variant="outline" className="text-xs bg-orange-50 text-orange-700">
                      {area}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        <div className="text-xs text-gray-500 pt-2 border-t">
          Analyzed {formatDistanceToNow(new Date(qualityScore.createdAt), { addSuffix: true })}
        </div>
      </CardContent>
    </Card>
  );
};

export default QualityScoreCard;
