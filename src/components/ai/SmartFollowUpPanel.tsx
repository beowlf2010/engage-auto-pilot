import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  Zap, 
  Clock, 
  Target, 
  TrendingUp, 
  CheckCircle,
  AlertTriangle,
  Brain,
  ArrowRight,
  Calendar,
  MessageSquare
} from 'lucide-react';
import { smartFollowUpEngine, type SmartRecommendation, type FollowUpContext } from '@/services/smartFollowUpEngine';
import { toast } from '@/hooks/use-toast';

interface SmartFollowUpPanelProps {
  leadId: string;
  leadName: string;
  vehicleInterest: string;
  conversationHistory: string[];
  lastInteractionDate: Date;
  leadTemperature: number;
  journeyStage: string;
  engagementPattern: 'responsive' | 'slow' | 'inactive';
}

const SmartFollowUpPanel: React.FC<SmartFollowUpPanelProps> = ({
  leadId,
  leadName,
  vehicleInterest,
  conversationHistory,
  lastInteractionDate,
  leadTemperature,
  journeyStage,
  engagementPattern
}) => {
  const [recommendations, setRecommendations] = useState<SmartRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [executingActions, setExecutingActions] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadRecommendations();
  }, [leadId]);

  const loadRecommendations = async () => {
    setIsLoading(true);
    try {
      const context: FollowUpContext = {
        leadId,
        leadName,
        vehicleInterest,
        conversationHistory,
        lastInteractionDate,
        leadTemperature,
        journeyStage,
        previousActions: [], // Could be fetched from history
        engagementPattern
      };

      const newRecommendations = await smartFollowUpEngine.generateContextualRecommendations(context);
      setRecommendations(newRecommendations);
    } catch (error) {
      console.error('Error loading recommendations:', error);
      toast({
        title: "Error",
        description: "Failed to load follow-up recommendations",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const executeRecommendation = async (recommendation: SmartRecommendation) => {
    setExecutingActions(prev => new Set([...prev, recommendation.id]));
    
    try {
      const success = await smartFollowUpEngine.executeRecommendation(leadId, recommendation);
      
      if (success) {
        toast({
          title: "Action Executed",
          description: `Successfully executed: ${recommendation.action}`,
        });
        
        // Remove the executed recommendation
        setRecommendations(prev => prev.filter(r => r.id !== recommendation.id));
      } else {
        toast({
          title: "Execution Failed",
          description: "Failed to execute the recommendation",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error executing recommendation:', error);
      toast({
        title: "Error",
        description: "An error occurred while executing the action",
        variant: "destructive"
      });
    } finally {
      setExecutingActions(prev => {
        const newSet = new Set(prev);
        newSet.delete(recommendation.id);
        return newSet;
      });
    }
  };

  const getPriorityColor = (priority: SmartRecommendation['priority']) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'low': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityIcon = (priority: SmartRecommendation['priority']) => {
    switch (priority) {
      case 'critical': return <AlertTriangle className="h-4 w-4" />;
      case 'high': return <TrendingUp className="h-4 w-4" />;
      case 'medium': return <Target className="h-4 w-4" />;
      case 'low': return <Clock className="h-4 w-4" />;
      default: return <Target className="h-4 w-4" />;
    }
  };

  const getTypeIcon = (type: SmartRecommendation['type']) => {
    switch (type) {
      case 'immediate': return <Zap className="h-4 w-4" />;
      case 'scheduled': return <Calendar className="h-4 w-4" />;
      case 'reminder': return <MessageSquare className="h-4 w-4" />;
      default: return <Zap className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Smart Follow-up Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center gap-2">
              <Brain className="h-6 w-6 animate-pulse text-primary" />
              <span className="text-sm text-muted-foreground">Analyzing context and generating recommendations...</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Smart Follow-up Recommendations
            {recommendations.length > 0 && (
              <Badge variant="outline" className="ml-2">
                {recommendations.length} actions
              </Badge>
            )}
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={loadRecommendations}
            disabled={isLoading}
          >
            <Brain className="h-4 w-4 mr-1" />
            Refresh
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {recommendations.length === 0 ? (
          <div className="text-center py-6">
            <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-sm text-muted-foreground mb-3">No recommendations available</p>
            <Button variant="outline" size="sm" onClick={loadRecommendations}>
              Generate Recommendations
            </Button>
          </div>
        ) : (
          recommendations.map((recommendation, index) => (
            <div key={recommendation.id} className="space-y-3">
              <div className="border rounded-lg p-4 hover:bg-accent/5 transition-colors">
                {/* Header with priority and type */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Badge className={getPriorityColor(recommendation.priority)}>
                      {getPriorityIcon(recommendation.priority)}
                      {recommendation.priority}
                    </Badge>
                    <Badge variant="outline" className="flex items-center gap-1">
                      {getTypeIcon(recommendation.type)}
                      {recommendation.type}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">Success Rate</div>
                    <div className="text-sm font-medium">
                      {Math.round(recommendation.successProbability * 100)}%
                    </div>
                  </div>
                </div>

                {/* Action description */}
                <div className="mb-3">
                  <h4 className="font-medium text-sm mb-1">{recommendation.action}</h4>
                  <p className="text-xs text-muted-foreground">{recommendation.reasoning}</p>
                </div>

                {/* Context factors */}
                <div className="mb-3">
                  <div className="flex flex-wrap gap-1">
                    {recommendation.contextFactors.map((factor, i) => (
                      <Badge key={i} variant="secondary" className="text-xs px-2 py-0">
                        {factor}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Confidence and execution time */}
                <div className="mb-3 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Confidence</span>
                    <span className="font-medium">{Math.round(recommendation.confidence * 100)}%</span>
                  </div>
                  <Progress value={recommendation.confidence * 100} className="h-1" />
                  
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Expected outcome: {recommendation.expectedOutcome}</span>
                    <span>~{recommendation.timeToExecute} min</span>
                  </div>
                </div>

                {/* Related actions */}
                {recommendation.relatedActions.length > 0 && (
                  <div className="mb-3">
                    <div className="text-xs text-muted-foreground mb-1">Related actions:</div>
                    <div className="text-xs">
                      {recommendation.relatedActions.join(' • ')}
                    </div>
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => executeRecommendation(recommendation)}
                    disabled={executingActions.has(recommendation.id)}
                    className="flex-1"
                  >
                    {executingActions.has(recommendation.id) ? (
                      <>
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current mr-2" />
                        Executing...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-3 w-3 mr-2" />
                        Execute Action
                      </>
                    )}
                  </Button>
                  
                  {recommendation.automatable && (
                    <Badge variant="outline" className="text-xs">
                      Auto
                    </Badge>
                  )}
                </div>
              </div>

              {index < recommendations.length - 1 && <Separator />}
            </div>
          ))
        )}

        {/* Summary stats */}
        {recommendations.length > 0 && (
          <div className="border-t pt-4 mt-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-lg font-semibold text-primary">
                  {recommendations.filter(r => r.type === 'immediate').length}
                </div>
                <div className="text-xs text-muted-foreground">Immediate</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-orange-600">
                  {recommendations.filter(r => r.priority === 'critical' || r.priority === 'high').length}
                </div>
                <div className="text-xs text-muted-foreground">High Priority</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-green-600">
                  {recommendations.filter(r => r.automatable).length}
                </div>
                <div className="text-xs text-muted-foreground">Automatable</div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SmartFollowUpPanel;