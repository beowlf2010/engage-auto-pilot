
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Brain, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Target,
  Zap,
  RefreshCw,
  Eye,
  DollarSign
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { generateInventoryInsights, type InventoryInsight } from '@/services/inventory/ai/inventoryIntelligenceService';

interface AIMetricsProps {
  totalVehicles: number;
}

const AIInventoryMetrics = ({ totalVehicles }: AIMetricsProps) => {
  const [refreshing, setRefreshing] = useState(false);

  const { data: insights, isLoading, refetch } = useQuery({
    queryKey: ['inventory-ai-insights'],
    queryFn: generateInventoryInsights,
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const getInsightIcon = (type: InventoryInsight['type']) => {
    switch (type) {
      case 'opportunity':
        return <Target className="w-4 h-4 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-orange-600" />;
      case 'trend':
        return <TrendingUp className="w-4 h-4 text-blue-600" />;
      default:
        return <Eye className="w-4 h-4 text-gray-600" />;
    }
  };

  const getUrgencyColor = (urgency: InventoryInsight['urgency']) => {
    switch (urgency) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-orange-100 text-orange-800';
      case 'low':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Brain className="w-5 h-5 text-purple-600" />
            <span>AI Inventory Intelligence</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-600">Analyzing inventory...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const opportunityInsights = insights?.filter(i => i.type === 'opportunity') || [];
  const warningInsights = insights?.filter(i => i.type === 'warning') || [];
  const trendInsights = insights?.filter(i => i.type === 'trend') || [];

  return (
    <div className="space-y-6">
      {/* AI Intelligence Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Opportunities</p>
                <p className="text-2xl font-bold text-green-900">{opportunityInsights.length}</p>
                <p className="text-xs text-green-700">
                  {opportunityInsights.reduce((sum, i) => sum + i.affectedVehicles, 0)} vehicles
                </p>
              </div>
              <Target className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-600">Warnings</p>
                <p className="text-2xl font-bold text-orange-900">{warningInsights.length}</p>
                <p className="text-xs text-orange-700">
                  {warningInsights.reduce((sum, i) => sum + i.affectedVehicles, 0)} vehicles need attention
                </p>
              </div>
              <AlertTriangle className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Market Trends</p>
                <p className="text-2xl font-bold text-blue-900">{trendInsights.length}</p>
                <p className="text-xs text-blue-700">Active insights</p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Insights */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Brain className="w-5 h-5 text-purple-600" />
              <span>AI Inventory Intelligence</span>
            </CardTitle>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {insights && insights.length > 0 ? (
            <div className="space-y-3">
              {insights.map((insight, index) => (
                <Alert key={index} className="border-l-4 border-l-purple-500">
                  <div className="flex items-start space-x-3">
                    {getInsightIcon(insight.type)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-medium text-gray-900">{insight.title}</p>
                        <div className="flex items-center space-x-2">
                          <Badge className={getUrgencyColor(insight.urgency)}>
                            {insight.urgency}
                          </Badge>
                          {insight.actionRequired && (
                            <Badge variant="destructive">Action Required</Badge>
                          )}
                        </div>
                      </div>
                      <AlertDescription>{insight.description}</AlertDescription>
                      {insight.affectedVehicles > 0 && (
                        <p className="text-xs text-gray-600 mt-1">
                          Affects {insight.affectedVehicles} vehicle{insight.affectedVehicles !== 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                  </div>
                </Alert>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Brain className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">No insights available yet</p>
              <p className="text-sm text-gray-500">AI is analyzing your inventory data</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AIInventoryMetrics;
