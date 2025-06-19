
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Brain, TrendingUp, Zap, AlertTriangle, Target, ArrowRight } from 'lucide-react';
import { usePredictiveAnalytics } from '@/hooks/usePredictiveAnalytics';
import { useNavigate } from 'react-router-dom';

const AIInsightsWidget = () => {
  const { insights, decisions, loading } = usePredictiveAnalytics();
  const navigate = useNavigate();

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </CardContent>
      </Card>
    );
  }

  const highValueLeads = insights.filter(i => 
    i.type === 'conversion_probability' && i.confidence > 0.7
  ).length;

  const urgentDecisions = decisions.filter(d => 
    d.type === 'human_handoff' || d.type === 'campaign_trigger'
  ).length;

  const todayInsights = insights.filter(i => {
    const today = new Date();
    const insightDate = new Date(i.createdAt || today);
    return insightDate.toDateString() === today.toDateString();
  }).length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Brain className="w-5 h-5 text-blue-600" />
          AI Insights
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{highValueLeads}</div>
            <div className="text-xs text-muted-foreground">High-Value Leads</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{urgentDecisions}</div>
            <div className="text-xs text-muted-foreground">Urgent Actions</div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1">
              <Target className="w-3 h-3" />
              Today's Insights
            </span>
            <Badge variant="outline">{todayInsights}</Badge>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1">
              <Zap className="w-3 h-3" />
              Active Predictions
            </span>
            <Badge variant="outline">{insights.length}</Badge>
          </div>

          {urgentDecisions > 0 && (
            <div className="flex items-center gap-2 p-2 bg-orange-50 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-orange-600" />
              <span className="text-sm text-orange-800">
                {urgentDecisions} decisions need attention
              </span>
            </div>
          )}
        </div>

        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => navigate('/ai-monitor')}
          className="w-full flex items-center gap-2"
        >
          View AI Monitor
          <ArrowRight className="w-3 h-3" />
        </Button>
      </CardContent>
    </Card>
  );
};

export default AIInsightsWidget;
