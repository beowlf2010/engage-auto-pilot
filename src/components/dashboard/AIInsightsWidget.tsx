import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  TrendingUp, TrendingDown, AlertTriangle, Brain, 
  Target, MessageSquare, Users, Zap, ArrowRight,
  CheckCircle, Clock, BarChart3 
} from 'lucide-react';
import { useAIInsights, AIInsight } from '@/hooks/useAIInsights';
import { AIInsightsSkeleton } from '@/components/ui/dashboard-skeletons';

const getInsightIcon = (type: AIInsight['type']) => {
  switch (type) {
    case 'performance': return BarChart3;
    case 'opportunity': return Target;
    case 'risk': return AlertTriangle;
    case 'optimization': return Zap;
    default: return Brain;
  }
};

const getInsightColor = (priority: AIInsight['priority']) => {
  switch (priority) {
    case 'high': return 'text-red-600 bg-red-50 border-red-200';
    case 'medium': return 'text-orange-600 bg-orange-50 border-orange-200';
    case 'low': return 'text-blue-600 bg-blue-50 border-blue-200';
    default: return 'text-gray-600 bg-gray-50 border-gray-200';
  }
};

const getPriorityBadgeColor = (priority: AIInsight['priority']) => {
  switch (priority) {
    case 'high': return 'bg-red-100 text-red-800';
    case 'medium': return 'bg-orange-100 text-orange-800';
    case 'low': return 'bg-blue-100 text-blue-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const handleInsightAction = (insight: AIInsight) => {
  // Create URL with insight context for better targeting
  const baseParams = new URLSearchParams({
    source: 'ai_insight',
    insight_id: insight.id,
    insight_type: insight.type
  });

  switch (insight.actionType) {
    case 'view_leads':
      // Add specific filters based on insight data
      if (insight.data?.leadIds) {
        baseParams.set('filter_ids', insight.data.leadIds.join(','));
      }
      if (insight.id === 'unresponsive-leads') {
        baseParams.set('filter_status', 'new');
        baseParams.set('filter_last_reply', '7_days_ago');
      }
      if (insight.id === 'high-potential-leads') {
        baseParams.set('filter_ai_opted', 'true');
        baseParams.set('filter_engagement', 'low');
      }
      window.location.hash = `#/leads?${baseParams.toString()}`;
      break;
      
    case 'update_templates':
      if (insight.data?.templates) {
        baseParams.set('focus_templates', insight.data.templates.map((t: any) => t.id).join(','));
      }
      window.location.hash = `#/templates?${baseParams.toString()}`;
      break;
      
    case 'schedule_calls':
      if (insight.data?.leads) {
        baseParams.set('priority_leads', insight.data.leads.map((l: any) => l.id).join(','));
      }
      window.location.hash = `#/calls?${baseParams.toString()}`;
      break;
      
    case 'review_messages':
      if (insight.data?.responseRate !== undefined) {
        baseParams.set('focus_metric', 'response_rate');
        baseParams.set('current_rate', insight.data.responseRate.toString());
      }
      window.location.hash = `#/conversations?${baseParams.toString()}`;
      break;
  }
};

const AIInsightsWidget = () => {
  const { insights, isLoading, refresh } = useAIInsights();

  if (isLoading) {
    return <AIInsightsSkeleton />;
  }

  return (
    <Card variant="floating" className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          AI Insights
        </CardTitle>
        <Button
          variant="glass"
          size="sm"
          onClick={refresh}
          className="h-8 px-2 hover:scale-110 transition-transform"
        >
          <TrendingUp className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {insights.length === 0 ? (
          <div className="text-center py-8">
            <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-sm text-muted-foreground mb-2">
              Analyzing your data...
            </p>
            <p className="text-xs text-muted-foreground">
              Insights will appear as you use the system
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {insights.map((insight) => {
              const IconComponent = getInsightIcon(insight.type);
              const colorClasses = getInsightColor(insight.priority);
              const badgeColor = getPriorityBadgeColor(insight.priority);
              
              return (
                <div
                  key={insight.id}
                  className={`p-4 rounded-xl border backdrop-blur-xl transition-[var(--transition-smooth)] hover:scale-[1.02] hover:shadow-[var(--shadow-elegant)] animate-in fade-in-0 slide-in-from-bottom-2 duration-300 ${colorClasses}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2 flex-1">
                      <div className="p-1.5 rounded-lg bg-background/50 backdrop-blur-sm">
                        <IconComponent className="h-4 w-4 flex-shrink-0" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-semibold text-sm leading-tight">
                          {insight.title}
                        </h4>
                      </div>
                    </div>
                    <Badge 
                      variant={insight.priority === 'high' ? 'destructive' : insight.priority === 'medium' ? 'warning' : 'glass'}
                      className={`text-xs ml-2 shadow-sm`}
                    >
                      {insight.priority}
                    </Badge>
                  </div>
                  
                  <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
                    {insight.description}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-xs bg-background/30 rounded-full px-2 py-1">
                      <CheckCircle className="h-3 w-3" />
                      <span className="text-muted-foreground font-medium">
                        {Math.round(insight.confidence * 100)}% confidence
                      </span>
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleInsightAction(insight)}
                      className="h-7 px-2 text-xs hover:bg-background/50 transition-[var(--transition-smooth)]"
                    >
                      {insight.actionText}
                      <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  </div>
                  
                  {insight.impact && (
                    <div className="mt-3 pt-3 border-t border-current/10 bg-background/20 rounded-lg p-2">
                      <p className="text-xs text-muted-foreground italic">
                        💡 {insight.impact}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        
        {insights.length > 0 && (
          <div className="pt-2 border-t border-muted">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Last updated: {new Date().toLocaleTimeString()}</span>
              <span>{insights.length} insight{insights.length !== 1 ? 's' : ''}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AIInsightsWidget;
