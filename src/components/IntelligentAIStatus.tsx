
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Brain, MessageSquare, Users, TrendingUp } from 'lucide-react';
import { getAIAnalyticsDashboard } from '@/services/enhancedAIMessageService';

export const IntelligentAIStatus = () => {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const data = await getAIAnalyticsDashboard();
        setAnalytics(data);
      } catch (error) {
        console.error('Error fetching AI analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5" />
            Intelligent AI System
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-gray-500">Loading analytics...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-blue-600" />
          Intelligent AI System
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            Active
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-blue-500" />
            <div>
              <div className="text-2xl font-bold">{analytics?.totalMessagesSent || 0}</div>
              <div className="text-xs text-gray-500">Unique Messages</div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-green-500" />
            <div>
              <div className="text-2xl font-bold">{analytics?.totalResponses || 0}</div>
              <div className="text-xs text-gray-500">Responses</div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-purple-500" />
            <div>
              <div className="text-2xl font-bold">
                {analytics?.overallResponseRate ? `${(analytics.overallResponseRate * 100).toFixed(1)}%` : '0%'}
              </div>
              <div className="text-xs text-gray-500">Response Rate</div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-orange-500" />
            <div>
              <div className="text-2xl font-bold">
                {analytics?.averageMessagesPerLead ? analytics.averageMessagesPerLead.toFixed(1) : '0'}
              </div>
              <div className="text-xs text-gray-500">Avg/Lead</div>
            </div>
          </div>
        </div>
        
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <div className="text-sm font-medium text-blue-800">✨ AI-Powered Features Active:</div>
          <div className="text-xs text-blue-600 mt-1">
            • 100% unique message generation • Context-aware conversations • Behavioral triggers • Quality controls
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
