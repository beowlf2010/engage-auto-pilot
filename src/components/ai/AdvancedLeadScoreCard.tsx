import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Brain, 
  TrendingUp, 
  AlertTriangle, 
  Target,
  Clock,
  RefreshCw,
  Zap
} from 'lucide-react';
import { useAdvancedAI, type AdvancedLeadScore } from '@/hooks/useAdvancedAI';
import { cn } from '@/lib/utils';

interface AdvancedLeadScoreCardProps {
  leadId: string;
  className?: string;
  autoLoad?: boolean;
}

const AdvancedLeadScoreCard: React.FC<AdvancedLeadScoreCardProps> = ({
  leadId,
  className,
  autoLoad = true
}) => {
  const { analyzeLeadScore, isAnalyzing, error } = useAdvancedAI();
  const [score, setScore] = useState<AdvancedLeadScore | null>(null);
  const [lastAnalyzed, setLastAnalyzed] = useState<Date | null>(null);

  useEffect(() => {
    if (autoLoad && leadId) {
      handleAnalyze();
    }
  }, [leadId, autoLoad]);

  const handleAnalyze = async () => {
    const result = await analyzeLeadScore(leadId);
    if (result) {
      setScore(result);
      setLastAnalyzed(new Date());
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50';
    if (score >= 60) return 'text-yellow-600 bg-yellow-50';
    if (score >= 40) return 'text-orange-600 bg-orange-50';
    return 'text-red-600 bg-red-50';
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical': return 'bg-red-500 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-yellow-500 text-white';
      case 'low': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  if (error) {
    return (
      <Card className={cn("border-red-200", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            AI Analysis Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-600 text-sm mb-3">{error}</p>
          <Button onClick={handleAnalyze} size="sm" variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry Analysis
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-600" />
            Advanced AI Lead Score
            {isAnalyzing && (
              <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
            )}
          </CardTitle>
          <Button
            onClick={handleAnalyze}
            size="sm"
            variant="outline"
            disabled={isAnalyzing}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", isAnalyzing && "animate-spin")} />
            Analyze
          </Button>
        </div>
        {lastAnalyzed && (
          <p className="text-xs text-gray-500">
            Last analyzed: {lastAnalyzed.toLocaleString()}
          </p>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {!score && !isAnalyzing ? (
          <div className="text-center py-4">
            <p className="text-gray-500 text-sm">Click "Analyze" to generate AI lead score</p>
          </div>
        ) : isAnalyzing ? (
          <div className="text-center py-4">
            <p className="text-gray-500 text-sm">Analyzing lead with GPT-4.1...</p>
          </div>
        ) : score ? (
          <>
            {/* Overall Score */}
            <div className="text-center">
              <div className={cn(
                "inline-flex items-center justify-center w-16 h-16 rounded-full text-2xl font-bold",
                getScoreColor(score.overall_score)
              )}>
                {score.overall_score}
              </div>
              <p className="text-sm text-gray-600 mt-2">Overall Score</p>
              <div className="flex items-center justify-center gap-2 mt-1">
                <Badge className={getUrgencyColor(score.urgency_level)}>
                  {score.urgency_level.toUpperCase()}
                </Badge>
                <Badge variant="outline">
                  {score.conversion_timeline.replace('_', ' ')}
                </Badge>
              </div>
            </div>

            {/* Component Scores */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Score Breakdown</h4>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600">Engagement</span>
                  <span className="text-xs font-medium">{score.component_scores.engagement}</span>
                </div>
                <Progress value={score.component_scores.engagement} className="h-2" />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600">Intent Strength</span>
                  <span className="text-xs font-medium">{score.component_scores.intent_strength}</span>
                </div>
                <Progress value={score.component_scores.intent_strength} className="h-2" />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600">Conversion Probability</span>
                  <span className="text-xs font-medium">{score.component_scores.conversion_probability}</span>
                </div>
                <Progress value={score.component_scores.conversion_probability} className="h-2" />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600">Risk Level</span>
                  <span className="text-xs font-medium">{100 - score.component_scores.risk_factors}</span>
                </div>
                <Progress value={100 - score.component_scores.risk_factors} className="h-2" />
              </div>
            </div>

            {/* Key Insights */}
            {score.key_insights.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Key Insights
                </h4>
                <div className="space-y-1">
                  {score.key_insights.slice(0, 3).map((insight, index) => (
                    <div key={index} className="text-xs p-2 bg-blue-50 rounded border-l-2 border-blue-400">
                      {insight}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Risk Factors */}
            {score.risk_factors.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  Risk Factors
                </h4>
                <div className="space-y-1">
                  {score.risk_factors.slice(0, 2).map((risk, index) => (
                    <div key={index} className="text-xs p-2 bg-red-50 rounded border-l-2 border-red-400">
                      {risk}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Opportunities */}
            {score.opportunities.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  Opportunities
                </h4>
                <div className="space-y-1">
                  {score.opportunities.slice(0, 2).map((opportunity, index) => (
                    <div key={index} className="text-xs p-2 bg-green-50 rounded border-l-2 border-green-400">
                      {opportunity}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommended Actions */}
            {score.recommended_actions.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Zap className="h-4 w-4 text-purple-500" />
                  Recommended Actions
                </h4>
                <div className="space-y-2">
                  {score.recommended_actions.slice(0, 2).map((action, index) => (
                    <div key={index} className="flex items-start gap-2 p-2 bg-purple-50 rounded">
                      <Clock className="h-3 w-3 text-purple-500 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge 
                            variant={action.priority === 'critical' ? 'destructive' : 'outline'}
                            className="text-xs"
                          >
                            {action.priority}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {action.timing.replace('_', ' ')}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-700">{action.action}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Confidence Level */}
            <div className="pt-2 border-t">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>AI Confidence</span>
                <span>{score.confidence_level}%</span>
              </div>
              <Progress value={score.confidence_level} className="h-1 mt-1" />
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
};

export default AdvancedLeadScoreCard;