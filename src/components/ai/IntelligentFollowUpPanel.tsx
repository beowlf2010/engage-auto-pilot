import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Bot, 
  Calendar, 
  Phone, 
  Mail, 
  MessageSquare,
  Target,
  Clock,
  RefreshCw,
  Zap,
  TrendingUp
} from 'lucide-react';
import { useAdvancedAI, type FollowUpRecommendations } from '@/hooks/useAdvancedAI';
import { cn } from '@/lib/utils';

interface IntelligentFollowUpPanelProps {
  leadId: string;
  className?: string;
  contextType?: 'post_conversation' | 'scheduled_check' | 'response_delay' | 're_engagement';
}

const IntelligentFollowUpPanel: React.FC<IntelligentFollowUpPanelProps> = ({
  leadId,
  className,
  contextType = 'scheduled_check'
}) => {
  const { generateFollowUpRecommendations, isAnalyzing, error } = useAdvancedAI();
  const [recommendations, setRecommendations] = useState<FollowUpRecommendations | null>(null);
  const [lastGenerated, setLastGenerated] = useState<Date | null>(null);

  const handleGenerate = async () => {
    const result = await generateFollowUpRecommendations(leadId, contextType);
    if (result) {
      setRecommendations(result);
      setLastGenerated(new Date());
    }
  };

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'call': return <Phone className="h-4 w-4" />;
      case 'text': return <MessageSquare className="h-4 w-4" />;
      case 'email': return <Mail className="h-4 w-4" />;
      case 'appointment': return <Calendar className="h-4 w-4" />;
      default: return <Zap className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-500 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-yellow-500 text-white';
      case 'low': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getApproachColor = (approach: string) => {
    switch (approach) {
      case 'urgent': return 'text-red-600 bg-red-50';
      case 'consultative': return 'text-blue-600 bg-blue-50';
      case 'nurturing': return 'text-green-600 bg-green-50';
      case 'educational': return 'text-purple-600 bg-purple-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-blue-600" />
            Intelligent Follow-Up
            {isAnalyzing && (
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            )}
          </CardTitle>
          <Button
            onClick={handleGenerate}
            size="sm"
            disabled={isAnalyzing}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", isAnalyzing && "animate-spin")} />
            Generate
          </Button>
        </div>
        {lastGenerated && (
          <p className="text-xs text-gray-500">
            Generated: {lastGenerated.toLocaleString()}
          </p>
        )}
      </CardHeader>

      <CardContent>
        {error ? (
          <div className="text-center py-4">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        ) : !recommendations && !isAnalyzing ? (
          <div className="text-center py-4">
            <p className="text-gray-500 text-sm">Click "Generate" for AI-powered follow-up recommendations</p>
          </div>
        ) : isAnalyzing ? (
          <div className="text-center py-4">
            <p className="text-gray-500 text-sm">Generating intelligent recommendations...</p>
          </div>
        ) : recommendations ? (
          <Tabs defaultValue="actions" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="actions">Actions</TabsTrigger>
              <TabsTrigger value="strategy">Strategy</TabsTrigger>
              <TabsTrigger value="insights">Insights</TabsTrigger>
            </TabsList>

            <TabsContent value="actions" className="space-y-3">
              <div className="space-y-3">
                {recommendations.recommendations.slice(0, 4).map((action, index) => (
                  <div key={action.id} className="p-3 border rounded-lg space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        {getActionIcon(action.action_type)}
                        <h4 className="font-medium text-sm">{action.title}</h4>
                      </div>
                      <div className="flex items-center gap-1">
                        <Badge className={getPriorityColor(action.priority)}>
                          {action.priority}
                        </Badge>
                      </div>
                    </div>
                    
                    <p className="text-xs text-gray-600">{action.description}</p>
                    
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {action.timing.suggested_delay_hours}h delay
                      </div>
                      <div>
                        Best: {action.timing.optimal_time_of_day}
                      </div>
                    </div>

                    {action.suggested_content && (
                      <div className="p-2 bg-gray-50 rounded text-xs">
                        <strong>Suggested:</strong> {action.suggested_content.substring(0, 100)}
                        {action.suggested_content.length > 100 && '...'}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="strategy" className="space-y-4">
              <div className="space-y-3">
                <div>
                  <h4 className="text-sm font-medium mb-2">Recommended Approach</h4>
                  <Badge className={getApproachColor(recommendations.strategy_summary.approach)}>
                    {recommendations.strategy_summary.approach.toUpperCase()}
                  </Badge>
                </div>

                <div>
                  <h4 className="text-sm font-medium mb-2">Success Probability</h4>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${recommendations.strategy_summary.success_probability}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium">{recommendations.strategy_summary.success_probability}%</span>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Key Focus Areas
                  </h4>
                  <div className="flex flex-wrap gap-1">
                    {recommendations.strategy_summary.key_focus_areas.map((area, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {area}
                      </Badge>
                    ))}
                  </div>
                </div>

                {recommendations.strategy_summary.risk_mitigation.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Risk Mitigation</h4>
                    <div className="space-y-1">
                      {recommendations.strategy_summary.risk_mitigation.map((risk, index) => (
                        <div key={index} className="text-xs p-2 bg-orange-50 rounded border-l-2 border-orange-400">
                          {risk}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="insights" className="space-y-4">
              <div className="space-y-3">
                <div>
                  <h4 className="text-sm font-medium mb-2">Communication Style</h4>
                  <Badge variant="outline">
                    {recommendations.personalization.communication_style}
                  </Badge>
                </div>

                <div>
                  <h4 className="text-sm font-medium mb-2">Key Interests</h4>
                  <div className="flex flex-wrap gap-1">
                    {recommendations.personalization.key_interests.map((interest, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {interest}
                      </Badge>
                    ))}
                  </div>
                </div>

                {recommendations.personalization.pain_points.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Pain Points</h4>
                    <div className="space-y-1">
                      {recommendations.personalization.pain_points.map((pain, index) => (
                        <div key={index} className="text-xs p-2 bg-red-50 rounded border-l-2 border-red-400">
                          {pain}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {recommendations.personalization.motivators.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                      Motivators
                    </h4>
                    <div className="space-y-1">
                      {recommendations.personalization.motivators.map((motivator, index) => (
                        <div key={index} className="text-xs p-2 bg-green-50 rounded border-l-2 border-green-400">
                          {motivator}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-2 border-t">
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>AI Confidence</span>
                    <span>{recommendations.confidence_level}%</span>
                  </div>
                  <div className="flex-1 bg-gray-200 rounded-full h-1 mt-1">
                    <div 
                      className="bg-green-600 h-1 rounded-full" 
                      style={{ width: `${recommendations.confidence_level}%` }}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        ) : null}
      </CardContent>
    </Card>
  );
};

export default IntelligentFollowUpPanel;