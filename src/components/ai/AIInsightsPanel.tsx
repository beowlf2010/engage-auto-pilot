
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  Brain, 
  Target, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  ArrowUp,
  ArrowDown,
  Minus
} from 'lucide-react';
import type { ConversationAnalysis } from '@/services/aiResponseIntelligence';

interface AIInsightsPanelProps {
  analysis: ConversationAnalysis;
  className?: string;
}

const AIInsightsPanel: React.FC<AIInsightsPanelProps> = ({ analysis, className = '' }) => {
  const getTemperatureColor = (temp: number) => {
    if (temp >= 80) return 'text-red-600 bg-red-50';
    if (temp >= 60) return 'text-orange-600 bg-orange-50';
    if (temp >= 40) return 'text-yellow-600 bg-yellow-50';
    return 'text-blue-600 bg-blue-50';
  };

  const getTemperatureIcon = (temp: number) => {
    if (temp >= 70) return <ArrowUp className="h-4 w-4" />;
    if (temp >= 40) return <Minus className="h-4 w-4" />;
    return <ArrowDown className="h-4 w-4" />;
  };

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'closing': return 'bg-green-100 text-green-800';
      case 'presentation': return 'bg-blue-100 text-blue-800';
      case 'objection_handling': return 'bg-orange-100 text-orange-800';
      case 'follow_up': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical': return 'text-red-600';
      case 'high': return 'text-orange-600';
      case 'medium': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'negative': return <ArrowDown className="h-4 w-4 text-red-600" />;
      default: return <Minus className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Lead Temperature */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Brain className="h-4 w-4" />
            Lead Temperature
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-2xl font-bold flex items-center gap-1 ${getTemperatureColor(analysis.leadTemperature)}`}>
              {getTemperatureIcon(analysis.leadTemperature)}
              {analysis.leadTemperature}°
            </span>
            <Badge variant="outline" className={getTemperatureColor(analysis.leadTemperature)}>
              {analysis.leadTemperature >= 80 ? 'Hot' : 
               analysis.leadTemperature >= 60 ? 'Warm' : 
               analysis.leadTemperature >= 40 ? 'Cool' : 'Cold'}
            </Badge>
          </div>
          <Progress value={analysis.leadTemperature} className="h-2" />
        </CardContent>
      </Card>

      {/* Conversation Stage */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Target className="h-4 w-4" />
            Conversation Stage
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Badge className={getStageColor(analysis.conversationStage)}>
            {analysis.conversationStage.replace('_', ' ').toUpperCase()}
          </Badge>
        </CardContent>
      </Card>

      {/* Sentiment & Urgency */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium">Sentiment</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {getSentimentIcon(analysis.sentimentTrend)}
              <span className="text-sm capitalize">{analysis.sentimentTrend}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium">Urgency</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className={`h-4 w-4 ${getUrgencyColor(analysis.urgencyLevel)}`} />
              <span className={`text-sm capitalize ${getUrgencyColor(analysis.urgencyLevel)}`}>
                {analysis.urgencyLevel}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Buying Signals */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Buying Signals ({analysis.buyingSignals.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {analysis.buyingSignals.slice(0, 3).map((signal, index) => (
              <div key={index} className="flex items-center justify-between text-xs">
                <span className="capitalize">{signal.type}</span>
                <div className="flex items-center gap-2">
                  <Progress value={signal.strength * 100} className="h-1 w-12" />
                  <span className="text-gray-500">{Math.round(signal.strength * 100)}%</span>
                </div>
              </div>
            ))}
            {analysis.buyingSignals.length === 0 && (
              <p className="text-xs text-gray-500">No strong buying signals detected yet</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Next Best Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Recommended Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {analysis.nextBestActions.map((action, index) => (
              <div key={index} className="flex items-start gap-2 text-xs">
                <div className="w-1 h-1 bg-blue-500 rounded-full mt-1.5 flex-shrink-0" />
                <span>{action}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AIInsightsPanel;
