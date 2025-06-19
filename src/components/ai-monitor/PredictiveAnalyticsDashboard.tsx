
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Brain, 
  TrendingUp, 
  Target, 
  Zap, 
  AlertCircle, 
  CheckCircle,
  Clock,
  DollarSign,
  Users,
  BarChart3
} from 'lucide-react';
import { usePredictiveAnalytics } from '@/hooks/usePredictiveAnalytics';

const PredictiveAnalyticsDashboard = () => {
  const { insights, decisions, loading, lastUpdated, loadInsights, processDecisions } = usePredictiveAnalytics();
  const [activeTab, setActiveTab] = useState('insights');

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'conversion_probability': return <Target className="w-4 h-4 text-green-600" />;
      case 'churn_risk': return <AlertCircle className="w-4 h-4 text-red-600" />;
      case 'optimal_timing': return <Clock className="w-4 h-4 text-blue-600" />;
      case 'content_recommendation': return <Brain className="w-4 h-4 text-purple-600" />;
      default: return <BarChart3 className="w-4 h-4 text-gray-600" />;
    }
  };

  const getDecisionIcon = (type: string) => {
    switch (type) {
      case 'human_handoff': return <Users className="w-4 h-4 text-orange-600" />;
      case 'campaign_trigger': return <Zap className="w-4 h-4 text-yellow-600" />;
      case 'message_timing': return <Clock className="w-4 h-4 text-blue-600" />;
      case 'content_selection': return <Brain className="w-4 h-4 text-purple-600" />;
      default: return <CheckCircle className="w-4 h-4 text-gray-600" />;
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const handleRefresh = async () => {
    await loadInsights();
    await processDecisions();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="w-6 h-6 text-blue-600" />
            Predictive Analytics Dashboard
          </h1>
          <p className="text-muted-foreground">
            AI-powered predictions and automated decision making
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {lastUpdated && (
            <span className="text-sm text-muted-foreground">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <Button onClick={handleRefresh} disabled={loading}>
            <TrendingUp className="w-4 h-4 mr-1" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Insights</p>
                <p className="text-2xl font-bold">{insights.length}</p>
              </div>
              <Brain className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">High Conversion</p>
                <p className="text-2xl font-bold">
                  {insights.filter(i => i.type === 'conversion_probability').length}
                </p>
              </div>
              <Target className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Churn Risks</p>
                <p className="text-2xl font-bold">
                  {insights.filter(i => i.type === 'churn_risk').length}
                </p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Auto Decisions</p>
                <p className="text-2xl font-bold">{decisions.length}</p>
              </div>
              <Zap className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="insights">Predictive Insights</TabsTrigger>
          <TabsTrigger value="decisions">Automated Decisions</TabsTrigger>
        </TabsList>

        <TabsContent value="insights" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Predictive Insights</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center gap-2 py-8">
                  <Brain className="w-5 h-5 animate-pulse text-blue-600" />
                  <span>Generating insights...</span>
                </div>
              ) : insights.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Brain className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No insights available</p>
                  <p className="text-sm">Check back as AI gathers more data</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {insights.map((insight, index) => (
                    <div key={index} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          {getInsightIcon(insight.type)}
                          <div>
                            <h4 className="font-medium capitalize">
                              {insight.type.replace('_', ' ')}
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              {insight.prediction.leadName || `Lead ${insight.prediction.leadId}`}
                            </p>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <Badge variant="outline" className={getConfidenceColor(insight.confidence)}>
                            {(insight.confidence * 100).toFixed(0)}% confidence
                          </Badge>
                        </div>
                      </div>

                      {/* Prediction Details */}
                      <div className="bg-muted p-3 rounded">
                        {insight.type === 'conversion_probability' && (
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span>Conversion Probability:</span>
                              <span className="font-medium">
                                {(insight.prediction.probability * 100).toFixed(1)}%
                              </span>
                            </div>
                            <Progress value={insight.prediction.probability * 100} className="h-2" />
                            <div className="flex justify-between text-sm">
                              <span>Predicted Value:</span>
                              <span className="font-medium text-green-600">
                                ${insight.prediction.predictedValue?.toLocaleString()}
                              </span>
                            </div>
                          </div>
                        )}

                        {insight.type === 'churn_risk' && (
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span>Churn Risk:</span>
                              <span className="font-medium text-red-600">
                                {(insight.prediction.churnRisk * 100).toFixed(1)}%
                              </span>
                            </div>
                            <Progress value={insight.prediction.churnRisk * 100} className="h-2" />
                          </div>
                        )}
                      </div>

                      {/* Reasoning */}
                      <div>
                        <p className="text-sm font-medium mb-1">Why this matters:</p>
                        <ul className="text-xs text-muted-foreground space-y-1">
                          {insight.reasoning.map((reason, i) => (
                            <li key={i} className="flex items-start gap-1">
                              <span className="text-blue-600">•</span>
                              {reason}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Recommended Actions */}
                      <div>
                        <p className="text-sm font-medium mb-2">Recommended actions:</p>
                        <div className="flex flex-wrap gap-2">
                          {insight.recommendedActions.map((action, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {action}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {/* Expected Outcome */}
                      <div className="bg-blue-50 p-2 rounded text-sm">
                        <strong>Expected outcome:</strong> {insight.expectedOutcome}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="decisions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Automated Decisions</CardTitle>
            </CardHeader>
            <CardContent>
              {decisions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Zap className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No automated decisions made yet</p>
                  <p className="text-sm">AI will make decisions as patterns emerge</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {decisions.map((decision) => (
                    <div key={decision.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          {getDecisionIcon(decision.type)}
                          <div>
                            <h4 className="font-medium capitalize">
                              {decision.type.replace('_', ' ')}
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              Lead {decision.leadId}
                            </p>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <Badge 
                            variant={decision.executedAt ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {decision.executedAt ? 'Executed' : 'Pending'}
                          </Badge>
                        </div>
                      </div>

                      {/* Decision Details */}
                      <div className="bg-muted p-3 rounded text-sm">
                        <pre>{JSON.stringify(decision.decision, null, 2)}</pre>
                      </div>

                      {/* Reasoning */}
                      <div>
                        <p className="text-sm font-medium mb-1">Decision reasoning:</p>
                        <ul className="text-xs text-muted-foreground space-y-1">
                          {decision.reasoning.map((reason, i) => (
                            <li key={i} className="flex items-start gap-1">
                              <span className="text-purple-600">•</span>
                              {reason}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Execution Time */}
                      {decision.executedAt && (
                        <div className="text-xs text-muted-foreground">
                          Executed at: {decision.executedAt.toLocaleString()}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PredictiveAnalyticsDashboard;
