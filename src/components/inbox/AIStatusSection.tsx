
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Brain, Clock, Pause } from 'lucide-react';

interface AIStatusSectionProps {
  conversation: any;
}

const AIStatusSection: React.FC<AIStatusSectionProps> = ({ conversation }) => {
  if (!conversation.aiOptIn) {
    return (
      <div className="space-y-2">
        <h4 className="font-medium text-sm text-gray-700">AI Status</h4>
        <div className="bg-gray-50 p-3 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
            <span className="text-sm font-medium text-gray-600">Finn AI Disabled</span>
          </div>
          <p className="text-xs text-gray-500">
            AI assistant is not active for this lead
          </p>
        </div>
      </div>
    );
  }

  const getIntensityColor = (intensity: string) => {
    switch (intensity) {
      case 'aggressive': return 'bg-red-50 border-red-200 text-red-700';
      case 'standard': return 'bg-blue-50 border-blue-200 text-blue-700';
      case 'gentle': return 'bg-green-50 border-green-200 text-green-700';
      case 'minimal': return 'bg-yellow-50 border-yellow-200 text-yellow-700';
      default: return 'bg-blue-50 border-blue-200 text-blue-700';
    }
  };

  const getIntensityLabel = (intensity: string) => {
    switch (intensity) {
      case 'aggressive': return 'Aggressive (Daily)';
      case 'standard': return 'Standard (2-3 days)';
      case 'gentle': return 'Gentle (Weekly)';
      case 'minimal': return 'Minimal (Monthly)';
      default: return 'Standard';
    }
  };

  return (
    <div className="space-y-3">
      <h4 className="font-medium text-sm text-gray-700">AI Status</h4>
      
      <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
        <div className="flex items-center space-x-2 mb-2">
          <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
          <span className="text-sm font-medium text-purple-800">Finn AI Active</span>
          {conversation.aiSequencePaused && (
            <Badge variant="outline" className="text-xs">
              <Pause className="h-3 w-3 mr-1" />
              Paused
            </Badge>
          )}
        </div>
        
        <div className="space-y-2">
          <p className="text-xs text-purple-600">
            AI assistant is helping with this lead
          </p>
          
          {conversation.messageIntensity && (
            <div className={`inline-flex items-center px-2 py-1 rounded text-xs border ${getIntensityColor(conversation.messageIntensity)}`}>
              <Brain className="h-3 w-3 mr-1" />
              {getIntensityLabel(conversation.messageIntensity)}
            </div>
          )}
          
          {conversation.nextAiSendAt && !conversation.aiSequencePaused && (
            <div className="flex items-center space-x-1 text-xs text-gray-600">
              <Clock className="h-3 w-3" />
              <span>Next: {new Date(conversation.nextAiSendAt).toLocaleDateString()}</span>
            </div>
          )}
          
          {conversation.aiStage && (
            <div className="text-xs text-gray-600">
              Stage: {conversation.aiStage.replace(/_/g, ' ')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AIStatusSection;
