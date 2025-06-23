
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, Activity, BarChart3, Settings } from 'lucide-react';
import AILearningDashboard from '@/components/ai-monitor/AILearningDashboard';
import PredictiveInsightsPanel from './PredictiveInsightsPanel';

interface CollapsibleAIPanelsProps {
  showLearningDashboard: boolean;
  showPredictiveInsights: boolean;
  onToggleLearningDashboard: () => void;
  onTogglePredictiveInsights: () => void;
  selectedConversation: any;
}

const CollapsibleAIPanels: React.FC<CollapsibleAIPanelsProps> = ({
  showLearningDashboard,
  showPredictiveInsights,
  onToggleLearningDashboard,
  onTogglePredictiveInsights,
  selectedConversation
}) => {
  return (
    <div className="space-y-2">
      {/* AI Learning Dashboard */}
      <Collapsible open={showLearningDashboard} onOpenChange={onToggleLearningDashboard}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="pb-2 cursor-pointer hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Activity className="h-4 w-4 text-blue-600" />
                  Learning Dashboard
                </CardTitle>
                {showLearningDashboard ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <AILearningDashboard />
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Predictive Insights */}
      {selectedConversation && (
        <Collapsible open={showPredictiveInsights} onOpenChange={onTogglePredictiveInsights}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="pb-2 cursor-pointer hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-green-600" />
                    Predictive Insights
                  </CardTitle>
                  {showPredictiveInsights ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <PredictiveInsightsPanel
                  isOpen={showPredictiveInsights}
                  onToggle={onTogglePredictiveInsights}
                  predictions={[]}
                  insights={{}}
                />
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}
    </div>
  );
};

export default CollapsibleAIPanels;
