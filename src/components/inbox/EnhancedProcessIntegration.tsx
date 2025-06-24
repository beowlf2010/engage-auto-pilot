
import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Brain, Zap, Target, AlertCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { enhancedProcessService } from '@/services/enhancedProcessService';
import { ProcessAssignmentLogic } from '@/types/enhancedLeadProcess';

interface EnhancedProcessIntegrationProps {
  conversation: any;
  onProcessUpdate?: (processId: string) => void;
}

const EnhancedProcessIntegration: React.FC<EnhancedProcessIntegrationProps> = ({
  conversation,
  onProcessUpdate
}) => {
  const [recommendation, setRecommendation] = useState<ProcessAssignmentLogic | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  useEffect(() => {
    if (conversation.leadId) {
      analyzeAndRecommend();
    }
  }, [conversation.leadId, conversation.leadSource, conversation.status]);

  const analyzeAndRecommend = async () => {
    setIsAnalyzing(true);
    try {
      const logic = enhancedProcessService.getRecommendedProcess(
        conversation.leadSource || '',
        conversation.leadType,
        conversation.status
      );
      setRecommendation(logic);
    } catch (error) {
      console.error('Error analyzing process recommendation:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const applyRecommendation = async () => {
    if (!recommendation) return;

    setIsApplying(true);
    try {
      const processTemplate = await enhancedProcessService.createEnhancedProcess(
        recommendation.sourceBucket,
        recommendation.leadType,
        recommendation.status
      );

      toast({
        title: "Enhanced Process Applied",
        description: `Applied ${processTemplate.name} with ${processTemplate.aggression}/5 aggression`,
      });

      onProcessUpdate?.(processTemplate.id);
    } catch (error) {
      console.error('Error applying process:', error);
      toast({
        title: "Error",
        description: "Failed to apply enhanced process",
        variant: "destructive"
      });
    } finally {
      setIsApplying(false);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-green-100 text-green-800';
    if (confidence >= 0.6) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getAggressionColor = (level: number) => {
    const colors = {
      1: 'bg-green-100 text-green-800',
      2: 'bg-blue-100 text-blue-800',
      3: 'bg-yellow-100 text-yellow-800',
      4: 'bg-orange-100 text-orange-800',
      5: 'bg-red-100 text-red-800'
    };
    return colors[level as keyof typeof colors] || colors[3];
  };

  if (isAnalyzing) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center gap-2">
          <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
          <span className="text-sm font-medium text-blue-800">Analyzing optimal process...</span>
        </div>
      </div>
    );
  }

  if (!recommendation) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-gray-600" />
          <span className="text-sm text-gray-600">No process recommendation available</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-purple-600" />
          <span className="font-medium text-purple-800">AI Process Recommendation</span>
          <Badge className={getConfidenceColor(recommendation.confidence)}>
            {Math.round(recommendation.confidence * 100)}% confident
          </Badge>
        </div>
        <Badge className={getAggressionColor(recommendation.sourceBucket === 'phone_up' ? 5 : 3)}>
          Smart Aggression
        </Badge>
      </div>

      <div className="space-y-2 mb-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-purple-700">Source Bucket:</span>
            <p className="text-purple-600 capitalize">{recommendation.sourceBucket.replace('_', ' ')}</p>
          </div>
          <div>
            <span className="font-medium text-purple-700">Lead Type:</span>
            <p className="text-purple-600 capitalize">{recommendation.leadType.replace('_', ' ')}</p>
          </div>
          <div>
            <span className="font-medium text-purple-700">Status:</span>
            <p className="text-purple-600 capitalize">{recommendation.status.replace('_', ' ')}</p>
          </div>
          <div>
            <span className="font-medium text-purple-700">Process ID:</span>
            <p className="text-purple-600 text-xs font-mono">{recommendation.recommendedProcessId}</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button 
          size="sm" 
          onClick={applyRecommendation}
          disabled={isApplying}
          className="bg-purple-600 hover:bg-purple-700"
        >
          <Zap className="h-3 w-3 mr-1" />
          {isApplying ? 'Applying...' : 'Apply Process'}
        </Button>
        <Button 
          size="sm" 
          variant="outline"
          onClick={analyzeAndRecommend}
          disabled={isAnalyzing}
        >
          <Target className="h-3 w-3 mr-1" />
          Re-analyze
        </Button>
      </div>

      <div className="mt-3 text-xs text-purple-600">
        This process will use ≤160 character messages with smart timing (08:00-19:00) and context-aware responses.
      </div>
    </div>
  );
};

export default EnhancedProcessIntegration;
