
import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Zap, 
  Calendar, 
  Phone, 
  Mail, 
  MessageSquare, 
  TrendingUp,
  Clock,
  AlertTriangle
} from 'lucide-react';
import type { AIRecommendation } from '@/services/contextualAIAssistant';
import type { SmartRecommendation } from '@/services/smartFollowUpEngine';

interface SmartActionButtonsProps {
  recommendations: (AIRecommendation | SmartRecommendation)[];
  onExecuteAction: (action: AIRecommendation | SmartRecommendation) => void;
  className?: string;
}

const SmartActionButtons: React.FC<SmartActionButtonsProps> = ({
  recommendations,
  onExecuteAction,
  className = ''
}) => {
  const getActionIcon = (action: string) => {
    const actionLower = action.toLowerCase();
    
    if (actionLower.includes('call') || actionLower.includes('phone')) {
      return <Phone className="h-4 w-4" />;
    }
    if (actionLower.includes('email') || actionLower.includes('send')) {
      return <Mail className="h-4 w-4" />;
    }
    if (actionLower.includes('schedule') || actionLower.includes('appointment')) {
      return <Calendar className="h-4 w-4" />;
    }
    if (actionLower.includes('message') || actionLower.includes('text')) {
      return <MessageSquare className="h-4 w-4" />;
    }
    if (actionLower.includes('close') || actionLower.includes('closing')) {
      return <TrendingUp className="h-4 w-4" />;
    }
    
    return <Zap className="h-4 w-4" />;
  };

  const getPriorityVariant = (priority: AIRecommendation['priority']) => {
    switch (priority) {
      case 'critical': return 'destructive';
      case 'high': return 'default';
      default: return 'outline';
    }
  };

  const getButtonText = (action: AIRecommendation | SmartRecommendation) => {
    // Shorten action text for button display
    const text = action.action;
    if (text.length > 30) {
      return text.substring(0, 27) + '...';
    }
    return text;
  };

  const isSmartRecommendation = (action: AIRecommendation | SmartRecommendation): action is SmartRecommendation => {
    return 'successProbability' in action;
  };

  // Show only top 3 immediate actions
  const immediateActions = recommendations
    .filter(r => r.type === 'immediate')
    .slice(0, 3);

  if (immediateActions.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center gap-2 mb-2">
        <Zap className="h-4 w-4 text-blue-600" />
        <span className="text-sm font-medium text-gray-700">Smart Actions</span>
      </div>
      
      <div className="flex flex-wrap gap-2">
        {immediateActions.map((action) => (
          <div key={action.id} className="relative">
            <Button
              variant={getPriorityVariant(action.priority)}
              size="sm"
              onClick={() => onExecuteAction(action)}
              className="flex items-center gap-2"
            >
              {getActionIcon(action.action)}
              {getButtonText(action)}
            </Button>
            
            {action.priority === 'critical' && (
              <Badge 
                variant="destructive" 
                className="absolute -top-2 -right-2 text-xs px-1 py-0 h-4"
              >
                !
              </Badge>
            )}
            
            {action.type === 'immediate' && action.priority === 'high' && (
              <div className="absolute -top-1 -right-1">
                <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
              </div>
            )}

            {isSmartRecommendation(action) && action.successProbability > 0.8 && (
              <Badge 
                variant="outline" 
                className="absolute -top-2 -left-2 text-xs px-1 py-0 h-4 bg-green-50 text-green-700 border-green-200"
              >
                {Math.round(action.successProbability * 100)}%
              </Badge>
            )}
          </div>
        ))}
      </div>
      
      {recommendations.length > 3 && (
        <p className="text-xs text-gray-500">
          +{recommendations.length - 3} more recommendations available
        </p>
      )}
    </div>
  );
};

export default SmartActionButtons;
