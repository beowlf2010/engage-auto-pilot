
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, Brain, Zap, Target, TrendingUp } from 'lucide-react';

interface PredictiveInsightsPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  predictions: any[];
  insights: {
    preloadedCount: number;
    behaviorPatternsCount: number;
    queueSize: number;
    isPreloading: boolean;
  };
}

const PredictiveInsightsPanel: React.FC<PredictiveInsightsPanelProps> = ({
  isOpen,
  onToggle,
  predictions,
  insights
}) => {
  if (!isOpen) return null;

  const topPredictions = predictions.slice(0, 5);
  const preloadCandidates = predictions.filter(p => p.shouldPreload);
  const averageScore = predictions.length > 0 
    ? predictions.reduce((sum, p) => sum + p.predictionScore, 0) / predictions.length 
    : 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-4xl h-3/4 m-4">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-blue-500" />
            Predictive Loading Insights
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onToggle}>
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-green-500" />
                <div>
                  <div className="text-2xl font-bold">{insights.preloadedCount}</div>
                  <div className="text-sm text-gray-600">Preloaded</div>
                </div>
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-blue-500" />
                <div>
                  <div className="text-2xl font-bold">{preloadCandidates.length}</div>
                  <div className="text-sm text-gray-600">To Preload</div>
                </div>
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-purple-500" />
                <div>
                  <div className="text-2xl font-bold">{averageScore.toFixed(1)}</div>
                  <div className="text-sm text-gray-600">Avg Score</div>
                </div>
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-orange-500" />
                <div>
                  <div className="text-2xl font-bold">{insights.behaviorPatternsCount}</div>
                  <div className="text-sm text-gray-600">Patterns</div>
                </div>
              </div>
            </Card>
          </div>

          {/* Status Indicators */}
          <div className="flex items-center gap-4">
            <Badge variant={insights.isPreloading ? "default" : "secondary"}>
              {insights.isPreloading ? "🔄 Preloading Active" : "⏸️ Preloading Idle"}
            </Badge>
            {insights.queueSize > 0 && (
              <Badge variant="outline">
                📥 {insights.queueSize} in queue
              </Badge>
            )}
          </div>

          {/* Top Predictions */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Top Predictions</h3>
            <ScrollArea className="h-64">
              <div className="space-y-2">
                {topPredictions.map((prediction, index) => (
                  <Card key={prediction.conversationId} className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant={prediction.shouldPreload ? "default" : "outline"}>
                            #{index + 1}
                          </Badge>
                          <span className="font-medium">Lead {prediction.leadId.slice(0, 8)}...</span>
                          <span className="text-lg font-bold text-blue-600">
                            {prediction.predictionScore.toFixed(1)}
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {prediction.reasons.map((reason: string, idx: number) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {reason}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      {prediction.shouldPreload && (
                        <Zap className="w-4 h-4 text-green-500" />
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Performance Summary */}
          <Card className="p-4 bg-blue-50">
            <h4 className="font-semibold text-blue-800 mb-2">Performance Summary</h4>
            <div className="text-sm text-blue-700 space-y-1">
              <div>• {preloadCandidates.length} conversations predicted for preloading</div>
              <div>• {insights.preloadedCount} messages cached and ready</div>
              <div>• {insights.behaviorPatternsCount} user behavior patterns learned</div>
              <div>• Average prediction confidence: {averageScore.toFixed(1)}/100</div>
            </div>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
};

export default PredictiveInsightsPanel;
