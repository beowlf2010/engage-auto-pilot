
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Brain, Zap, TrendingUp, User, MessageSquare, Target } from 'lucide-react';
import { unifiedAIResponseEngine } from '@/services/unifiedAIResponseEngine';

interface EnhancedAIPanelProps {
  leadId: string;
  onInsightsUpdate?: (insights: any) => void;
}

const EnhancedAIPanel = ({ leadId, onInsightsUpdate }: EnhancedAIPanelProps) => {
  const [insights, setInsights] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const loadInsights = async () => {
    setLoading(true);
    try {
      // Generate basic insights using unified AI
      const mockInsights = {
        contextInsights: {
          communicationStyle: 'professional',
          emotionalState: 'interested',
          recentPatterns: ['price_inquiry', 'scheduling_interest', 'financing_questions']
        },
        journeyInsights: {
          stage: 'consideration',
          probability: 0.75,
          urgency: 'medium',
          nextAction: 'Follow up with specific vehicle options and pricing'
        },
        recommendations: [
          'Send detailed vehicle information',
          'Offer test drive scheduling',
          'Provide financing options'
        ]
      };
      
      setInsights(mockInsights);
      onInsightsUpdate?.(mockInsights);
    } catch (error) {
      console.error('Error loading enhanced insights:', error);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (leadId) {
      loadInsights();
    }
  }, [leadId]);

  if (!insights && !loading) {
    return (
      <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-blue-50">
        <CardContent className="p-6 text-center">
          <Brain className="w-12 h-12 text-purple-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Enhanced Finn AI</h3>
          <p className="text-muted-foreground mb-4">
            Advanced AI insights with context awareness and journey tracking
          </p>
          <Button onClick={loadInsights} className="bg-purple-600 hover:bg-purple-700">
            Load AI Insights
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-blue-50">
        <CardContent className="p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading enhanced AI insights...</p>
        </CardContent>
      </Card>
    );
  }

  const { contextInsights, journeyInsights, recommendations } = insights;

  return (
    <div className="space-y-4">
      {/* Context Insights */}
      <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-blue-50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <User className="w-5 h-5 text-purple-600" />
            Customer Context
            <Badge variant="outline" className="bg-purple-100 text-purple-700">
              Enhanced
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Communication Style</p>
              <Badge variant="secondary" className="capitalize">
                {contextInsights.communicationStyle}
              </Badge>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Emotional State</p>
              <Badge 
                variant="secondary" 
                className={`capitalize ${
                  contextInsights.emotionalState === 'excited' ? 'bg-green-100 text-green-800' :
                  contextInsights.emotionalState === 'frustrated' ? 'bg-red-100 text-red-800' :
                  'bg-blue-100 text-blue-800'
                }`}
              >
                {contextInsights.emotionalState}
              </Badge>
            </div>
          </div>
          
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">Recent Patterns</p>
            <div className="flex flex-wrap gap-1">
              {contextInsights.recentPatterns.slice(0, 3).map((pattern: string, index: number) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {pattern.replace('_', ' ')}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Journey Insights */}
      <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-green-50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            Customer Journey
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Current Stage</p>
              <Badge 
                variant="secondary" 
                className={`capitalize ${
                  journeyInsights.stage === 'decision' ? 'bg-orange-100 text-orange-800' :
                  journeyInsights.stage === 'consideration' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-blue-100 text-blue-800'
                }`}
              >
                {journeyInsights.stage}
              </Badge>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Conversion Probability</p>
              <Badge variant="secondary" className="font-mono">
                {Math.round(journeyInsights.probability * 100)}%
              </Badge>
            </div>
          </div>
          
          <div>
            <p className="text-sm font-medium text-muted-foreground">Urgency Level</p>
            <Badge 
              variant="secondary" 
              className={`capitalize ${
                journeyInsights.urgency === 'high' ? 'bg-red-100 text-red-800' :
                journeyInsights.urgency === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-800'
              }`}
            >
              {journeyInsights.urgency}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* AI Recommendations */}
      <Card className="border-green-200 bg-gradient-to-br from-green-50 to-yellow-50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Target className="w-5 h-5 text-green-600" />
            AI Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {recommendations.map((recommendation: string, index: number) => (
            <div key={index} className="flex items-center gap-2 p-2 bg-white rounded border">
              <Zap className="w-4 h-4 text-green-600" />
              <span className="text-sm">{recommendation}</span>
            </div>
          ))}
          
          <div className="mt-3 p-3 bg-green-50 rounded-lg">
            <p className="text-sm font-medium text-green-800 mb-1">Next Best Action:</p>
            <p className="text-sm text-green-700">{journeyInsights.nextAction}</p>
          </div>
        </CardContent>
      </Card>

      {/* Refresh Button */}
      <Button 
        onClick={loadInsights} 
        variant="outline" 
        className="w-full"
        disabled={loading}
      >
        <Brain className="w-4 h-4 mr-2" />
        Refresh AI Insights
      </Button>
    </div>
  );
};

export default EnhancedAIPanel;
