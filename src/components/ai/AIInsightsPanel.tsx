
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Brain, 
  TrendingUp, 
  MessageSquare, 
  Clock, 
  Target,
  ChevronDown,
  ChevronUp,
  Zap
} from 'lucide-react';
import { useContextualAI } from '@/hooks/useContextualAI';
import { usePerformanceAnalytics } from '@/hooks/usePerformanceAnalytics';
import SmartActionButtons from './SmartActionButtons';
import ConversionTrackingPanel from '../analytics/ConversionTrackingPanel';

interface AIInsightsPanelProps {
  leadId: string | null;
  conversation: any;
  messages: any[];
  className?: string;
}

const AIInsightsPanel: React.FC<AIInsightsPanelProps> = ({
  leadId,
  conversation,
  messages,
  className = ''
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState('insights');

  const { insights, isAnalyzing, executeRecommendation } = useContextualAI(leadId);
  const { metrics } = usePerformanceAnalytics();

  const getTemperatureColor = (temp: string) => {
    switch (temp) {
      case 'hot': return 'bg-red-100 text-red-800';
      case 'warm': return 'bg-orange-100 text-orange-800';
      case 'lukewarm': return 'bg-yellow-100 text-yellow-800';
      case 'cold': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
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

  if (!leadId) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 text-center py-4">
            Select a conversation to view AI insights
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Insights
            {isAnalyzing && (
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            )}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>
      
      {!isCollapsed && (
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="insights">Insights</TabsTrigger>
              <TabsTrigger value="actions">Actions</TabsTrigger>
              <TabsTrigger value="tracking">Tracking</TabsTrigger>
            </TabsList>

            <TabsContent value="insights" className="space-y-4">
              {insights ? (
                <>
                  {/* Lead Temperature & Urgency */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-center">
                      <Badge className={getTemperatureColor(insights.leadTemperature)}>
                        {insights.leadTemperature.toUpperCase()}
                      </Badge>
                      <p className="text-xs text-gray-600 mt-1">Lead Temperature</p>
                    </div>
                    <div className="text-center">
                      <Badge className={getUrgencyColor(insights.urgencyLevel)}>
                        {insights.urgencyLevel.toUpperCase()}
                      </Badge>
                      <p className="text-xs text-gray-600 mt-1">Urgency Level</p>
                    </div>
                  </div>

                  {/* Intent & Sentiment */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Intent</span>
                      <Badge variant="outline">{insights.intent}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Sentiment</span>
                      <Badge variant="outline">{insights.sentiment}</Badge>
                    </div>
                  </div>

                  {/* Key Insights */}
                  {insights.keyInsights.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">Key Insights</h4>
                      <div className="space-y-1">
                        {insights.keyInsights.slice(0, 3).map((insight, index) => (
                          <div key={index} className="text-xs p-2 bg-blue-50 rounded border-l-2 border-blue-400">
                            {insight}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Follow-up Recommendation */}
                  {insights.followUpScheduling.shouldSchedule && (
                    <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex items-center gap-2 mb-1">
                        <Clock className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium text-green-800">Follow-up Recommended</span>
                      </div>
                      <p className="text-xs text-green-700">
                        {insights.followUpScheduling.suggestedTime}
                      </p>
                      <p className="text-xs text-green-600 mt-1">
                        {insights.followUpScheduling.reason}
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-4">
                  <p className="text-gray-500 text-sm">Loading AI insights...</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="actions" className="space-y-4">
              {insights?.nextBestActions && insights.nextBestActions.length > 0 ? (
                <SmartActionButtons
                  recommendations={insights.nextBestActions}
                  onExecuteAction={executeRecommendation}
                />
              ) : (
                <div className="text-center py-4">
                  <p className="text-gray-500 text-sm">No AI recommendations available</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="tracking">
              <ConversionTrackingPanel
                leadId={leadId}
                className="border-0 shadow-none p-0"
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      )}
    </Card>
  );
};

export default AIInsightsPanel;
