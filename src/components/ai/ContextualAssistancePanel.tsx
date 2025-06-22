
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Brain, 
  Clock, 
  TrendingUp, 
  AlertTriangle, 
  Calendar, 
  Target,
  CheckCircle,
  ArrowRight,
  Zap
} from 'lucide-react';
import { useContextualAI } from '@/hooks/useContextualAI';

interface ContextualAssistancePanelProps {
  leadId: string | null;
  conversation: any;
  onSendMessage: (message: string, isTemplate?: boolean) => Promise<void>;
  className?: string;
}

const ContextualAssistancePanel: React.FC<ContextualAssistancePanelProps> = ({
  leadId,
  conversation,
  onSendMessage,
  className = ''
}) => {
  const { insights, isAnalyzing, executeRecommendation } = useContextualAI(leadId);

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'critical': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'high': return <TrendingUp className="h-4 w-4 text-orange-600" />;
      case 'medium': return <Target className="h-4 w-4 text-yellow-600" />;
      default: return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'immediate': return <Zap className="h-3 w-3" />;
      case 'scheduled': return <Calendar className="h-3 w-3" />;
      case 'reminder': return <Clock className="h-3 w-3" />;
      default: return <ArrowRight className="h-3 w-3" />;
    }
  };

  const getTemperatureColor = (temperature: number) => {
    if (temperature >= 80) return 'text-red-600 bg-red-50';
    if (temperature >= 60) return 'text-orange-600 bg-orange-50';
    if (temperature >= 40) return 'text-yellow-600 bg-yellow-50';
    return 'text-blue-600 bg-blue-50';
  };

  const handleScheduleFollowUp = () => {
    // This would integrate with calendar scheduling
    console.log('Schedule follow-up for lead:', leadId);
  };

  if (isAnalyzing) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Brain className="h-4 w-4 animate-pulse" />
            AI Assistant
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <Brain className="h-8 w-8 animate-pulse mx-auto mb-2 text-blue-600" />
              <p className="text-sm text-gray-500">Analyzing conversation...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!insights) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Brain className="h-4 w-4" />
            AI Assistant
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-sm text-gray-500">No analysis available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Lead Temperature & Stage */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Brain className="h-4 w-4" />
            AI Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Lead Temperature</span>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded text-sm font-bold ${getTemperatureColor(insights.leadTemperature)}`}>
                  {insights.leadTemperature}°
                </span>
                <Badge variant="outline" className={getPriorityColor(insights.urgencyLevel)}>
                  {insights.urgencyLevel.toUpperCase()}
                </Badge>
              </div>
            </div>
            
            <div className="flex items-center justify-between text-sm">
              <span>Conversation Stage</span>
              <Badge variant="secondary">
                {insights.conversationStage.replace('_', ' ').toUpperCase()}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Smart Recommendations */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Smart Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {insights.nextBestActions.slice(0, 3).map((action, index) => (
              <div key={action.id} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {getPriorityIcon(action.priority)}
                    <span className="text-sm font-medium">{action.action}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {getTypeIcon(action.type)}
                    <Badge className={`text-xs ${getPriorityColor(action.priority)}`}>
                      {action.priority}
                    </Badge>
                  </div>
                </div>
                
                <p className="text-xs text-gray-600">{action.reasoning}</p>
                
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    Confidence: {(action.confidence * 100).toFixed(0)}%
                  </span>
                  <Button
                    size="sm"
                    variant={action.priority === 'critical' ? 'default' : 'outline'}
                    onClick={() => executeRecommendation(action)}
                    disabled={!action.automatable && action.type === 'immediate'}
                  >
                    {action.automatable ? 'Execute' : 'Review'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Follow-up Scheduling */}
      {insights.followUpScheduling.shouldSchedule && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Follow-up Scheduling
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span>Suggested Time</span>
                <Badge variant="outline">
                  {insights.followUpScheduling.suggestedTime}
                </Badge>
              </div>
              
              <p className="text-xs text-gray-600">
                {insights.followUpScheduling.reason}
              </p>
              
              <Button
                size="sm"
                className="w-full"
                onClick={handleScheduleFollowUp}
              >
                <Calendar className="h-4 w-4 mr-1" />
                Schedule Follow-up
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Risk Factors */}
      {insights.riskFactors.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              Risk Factors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {insights.riskFactors.map((risk, index) => (
                <div key={index} className="flex items-start gap-2 text-sm">
                  <div className="w-1 h-1 bg-red-500 rounded-full mt-2 flex-shrink-0" />
                  <span className="text-gray-700">{risk}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Opportunities */}
      {insights.opportunities.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              Opportunities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {insights.opportunities.map((opportunity, index) => (
                <div key={index} className="flex items-start gap-2 text-sm">
                  <div className="w-1 h-1 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                  <span className="text-gray-700">{opportunity}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ContextualAssistancePanel;
