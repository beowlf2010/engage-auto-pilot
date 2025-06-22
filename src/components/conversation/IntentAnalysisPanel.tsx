
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Target, 
  AlertTriangle, 
  Clock, 
  DollarSign, 
  Calendar, 
  MessageSquare,
  ArrowRight,
  TrendingUp
} from 'lucide-react';
import type { ConversationIntent, DetectedIntent } from '@/services/intentRecognitionService';

interface IntentAnalysisPanelProps {
  intent: ConversationIntent;
  onTakeAction?: (action: string) => void;
  className?: string;
}

const IntentAnalysisPanel: React.FC<IntentAnalysisPanelProps> = ({
  intent,
  onTakeAction,
  className = ''
}) => {
  const getIntentIcon = (type: DetectedIntent['type']) => {
    switch (type) {
      case 'buying_signal':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'objection':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'scheduling':
        return <Calendar className="h-4 w-4 text-blue-600" />;
      case 'pricing_inquiry':
        return <DollarSign className="h-4 w-4 text-yellow-600" />;
      case 'comparison_request':
        return <Target className="h-4 w-4 text-purple-600" />;
      default:
        return <MessageSquare className="h-4 w-4 text-gray-600" />;
    }
  };

  const getIntentColor = (type: DetectedIntent['type']) => {
    switch (type) {
      case 'buying_signal':
        return 'bg-green-100 text-green-800';
      case 'objection':
        return 'bg-red-100 text-red-800';
      case 'scheduling':
        return 'bg-blue-100 text-blue-800';
      case 'pricing_inquiry':
        return 'bg-yellow-100 text-yellow-800';
      case 'comparison_request':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getUrgencyColor = (urgency: DetectedIntent['urgency']) => {
    switch (urgency) {
      case 'critical':
        return 'text-red-600';
      case 'high':
        return 'text-orange-600';
      case 'medium':
        return 'text-yellow-600';
      default:
        return 'text-gray-600';
    }
  };

  const formatIntentType = (type: DetectedIntent['type']) => {
    return type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Target className="h-4 w-4" />
          Intent Analysis
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Primary Intent */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Primary Intent</h4>
            <div className="flex items-center gap-2">
              <Clock className={`h-3 w-3 ${getUrgencyColor(intent.overallUrgency)}`} />
              <span className={`text-xs font-medium ${getUrgencyColor(intent.overallUrgency)}`}>
                {intent.overallUrgency.toUpperCase()}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {getIntentIcon(intent.primaryIntent.type)}
            <Badge className={getIntentColor(intent.primaryIntent.type)}>
              {formatIntentType(intent.primaryIntent.type)}
            </Badge>
            <span className="text-xs text-gray-500">
              {(intent.primaryIntent.confidence * 100).toFixed(0)}% confidence
            </span>
          </div>

          {intent.primaryIntent.context && (
            <p className="text-xs text-gray-600 italic">
              "{intent.primaryIntent.context}"
            </p>
          )}
        </div>

        {/* Secondary Intents */}
        {intent.secondaryIntents.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Secondary Signals</h4>
            <div className="flex flex-wrap gap-1">
              {intent.secondaryIntents.slice(0, 3).map((secondaryIntent, index) => (
                <div key={index} className="flex items-center gap-1">
                  {getIntentIcon(secondaryIntent.type)}
                  <Badge variant="outline" className="text-xs">
                    {formatIntentType(secondaryIntent.type)}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Next Best Action */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Recommended Action</h4>
          <div className="flex items-start gap-2">
            <ArrowRight className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="space-y-2 flex-1">
              <p className="text-sm text-gray-700">{intent.nextBestAction}</p>
              {onTakeAction && (
                <Button
                  size="sm"
                  onClick={() => onTakeAction(intent.nextBestAction)}
                  className="w-full"
                >
                  Take Action
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Keywords */}
        {intent.primaryIntent.keywords.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Key Phrases</h4>
            <div className="flex flex-wrap gap-1">
              {intent.primaryIntent.keywords.map((keyword, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {keyword}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default IntentAnalysisPanel;
