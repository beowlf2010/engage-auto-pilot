import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAIIntelligenceHub } from '@/hooks/useAIIntelligenceHub';
import { 
  Bell, 
  AlertTriangle, 
  Target, 
  MessageSquare, 
  Brain, 
  TrendingUp, 
  Clock,
  CheckCircle,
  XCircle,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AIIntelligenceHubProps {
  leadId?: string;
  autoRefresh?: boolean;
}

const AIIntelligenceHub: React.FC<AIIntelligenceHubProps> = ({ 
  leadId, 
  autoRefresh = true 
}) => {
  const {
    runAIAnalysis,
    loadNotifications,
    loadChurnPredictions,
    loadInventoryMatches,
    loadGeneratedMessages,
    markNotificationRead,
    approveMessage,
    isProcessing,
    notifications,
    churnPredictions,
    inventoryMatches,
    generatedMessages,
    unreadNotifications,
    highRiskLeads,
    pendingApprovals,
    error
  } = useAIIntelligenceHub();

  const [selectedTab, setSelectedTab] = useState('dashboard');

  useEffect(() => {
    if (autoRefresh) {
      loadNotifications();
      loadChurnPredictions(leadId);
      loadInventoryMatches(leadId);
      loadGeneratedMessages(leadId);
    }
  }, [autoRefresh, leadId, loadNotifications, loadChurnPredictions, loadInventoryMatches, loadGeneratedMessages]);

  const handleRunFullAnalysis = async () => {
    if (!leadId) return;
    
    await runAIAnalysis(leadId, [
      'churn_analysis',
      'inventory_matching', 
      'message_generation',
      'notifications'
    ]);
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'critical': return 'text-red-600';
      case 'high': return 'text-orange-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Brain className="w-6 h-6 text-purple-600" />
          <div>
            <h2 className="text-2xl font-bold text-slate-800">AI Intelligence Hub</h2>
            <p className="text-slate-600">Real-time AI insights and automation</p>
          </div>
        </div>
        
        {leadId && (
          <Button 
            onClick={handleRunFullAnalysis}
            disabled={isProcessing}
            className="flex items-center gap-2"
          >
            {isProcessing ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <Zap className="w-4 h-4" />
            )}
            Run Full AI Analysis
          </Button>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm text-slate-600">Unread Notifications</p>
                <p className="text-2xl font-bold">{unreadNotifications.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <div>
                <p className="text-sm text-slate-600">High Risk Leads</p>
                <p className="text-2xl font-bold">{highRiskLeads.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Target className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm text-slate-600">Vehicle Matches</p>
                <p className="text-2xl font-bold">{inventoryMatches.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <MessageSquare className="w-5 h-5 text-purple-600" />
              <div>
                <p className="text-sm text-slate-600">Pending Approvals</p>
                <p className="text-2xl font-bold">{pendingApprovals.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="notifications">
            Notifications
            {unreadNotifications.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadNotifications.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="churn">Churn Analysis</TabsTrigger>
          <TabsTrigger value="messages">Messages</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          {/* Recent Notifications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Recent AI Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {notifications.slice(0, 5).map((notification) => (
                  <div
                    key={notification.id}
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-lg border",
                      !notification.read_at ? "bg-blue-50 border-blue-200" : "bg-gray-50 border-gray-200"
                    )}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-sm">{notification.title}</h4>
                        <Badge className={getUrgencyColor(notification.urgency_level)}>
                          {notification.urgency_level}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-600">{notification.message}</p>
                      <p className="text-xs text-slate-400 mt-1">
                        Confidence: {(notification.ai_confidence * 100).toFixed(1)}%
                      </p>
                    </div>
                    {!notification.read_at && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => markNotificationRead(notification.id)}
                      >
                        <CheckCircle className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
                {notifications.length === 0 && (
                  <p className="text-center text-slate-500 py-4">
                    No AI insights yet. Run an analysis to get started.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Inventory Matches */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                Top Vehicle Matches
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {inventoryMatches.slice(0, 3).map((match) => (
                  <div key={match.id} className="flex items-center gap-3 p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium">
                          {match.inventory?.year} {match.inventory?.make} {match.inventory?.model}
                        </h4>
                        <Badge variant="outline">
                          {(match.match_score * 100).toFixed(1)}% match
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-600">{match.personalized_pitch}</p>
                      <div className="flex gap-1 mt-2">
                        {(match.vehicle_highlights as string[])?.slice(0, 3).map((highlight, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {highlight}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
                {inventoryMatches.length === 0 && (
                  <p className="text-center text-slate-500 py-4">
                    No vehicle matches yet. Run inventory matching to find perfect vehicles.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>All AI Notifications</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={cn(
                      "flex items-start gap-3 p-4 rounded-lg border",
                      !notification.read_at ? "bg-blue-50 border-blue-200" : "bg-gray-50 border-gray-200"
                    )}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium">{notification.title}</h4>
                        <Badge className={getUrgencyColor(notification.urgency_level)}>
                          {notification.urgency_level}
                        </Badge>
                        <Badge variant="outline">
                          {notification.notification_type.replace('_', ' ')}
                        </Badge>
                      </div>
                      <p className="text-slate-600 mb-2">{notification.message}</p>
                      <div className="flex items-center gap-4 text-sm text-slate-500">
                        <span>Confidence: {(notification.ai_confidence * 100).toFixed(1)}%</span>
                        <span>{new Date(notification.created_at).toLocaleString()}</span>
                      </div>
                    </div>
                    {!notification.read_at && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => markNotificationRead(notification.id)}
                      >
                        <CheckCircle className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="churn">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Churn Risk Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {churnPredictions.map((prediction) => (
                  <div key={prediction.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">Churn Risk Analysis</h4>
                        <Badge className={cn("text-white", getRiskColor(prediction.risk_level))}>
                          {prediction.risk_level} risk
                        </Badge>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-red-600">
                          {(prediction.churn_probability * 100).toFixed(1)}%
                        </p>
                        <p className="text-sm text-slate-500">churn probability</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h5 className="font-medium text-sm mb-2">Contributing Factors:</h5>
                        <ul className="space-y-1">
                          {(prediction.contributing_factors as string[])?.map((factor, idx) => (
                            <li key={idx} className="text-sm text-slate-600 flex items-center gap-2">
                              <AlertTriangle className="w-3 h-3 text-orange-500" />
                              {factor}
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      <div>
                        <h5 className="font-medium text-sm mb-2">Recommended Actions:</h5>
                        <ul className="space-y-1">
                          {(prediction.recommended_interventions as any[]).map((intervention, idx) => (
                            <li key={idx} className="text-sm">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline">{intervention.priority}</Badge>
                                <Badge variant="secondary">{intervention.timing}</Badge>
                              </div>
                              <p className="text-slate-600">{intervention.action}</p>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    
                    <div className="mt-3 pt-3 border-t flex items-center justify-between text-sm text-slate-500">
                      <span>Confidence: {(prediction.prediction_confidence * 100).toFixed(1)}%</span>
                      <span>{new Date(prediction.predicted_at).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
                {churnPredictions.length === 0 && (
                  <p className="text-center text-slate-500 py-8">
                    No churn predictions available. Run churn analysis to get insights.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="messages">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                AI-Generated Messages
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {generatedMessages.map((message) => (
                  <div key={message.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{message.message_type}</Badge>
                        <Badge variant="secondary">{message.tone_style}</Badge>
                        {message.human_approved ? (
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Approved
                          </Badge>
                        ) : (
                          <Badge variant="outline">Pending Approval</Badge>
                        )}
                      </div>
                      <span className="text-sm text-slate-500">
                        Confidence: {(message.ai_confidence * 100).toFixed(1)}%
                      </span>
                    </div>
                    
                    <div className="bg-slate-50 rounded-lg p-3 mb-3">
                      <p className="text-slate-700">{message.generated_content}</p>
                    </div>
                    
                    {!message.human_approved && (
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          onClick={() => approveMessage(message.id)}
                          className="flex items-center gap-1"
                        >
                          <CheckCircle className="w-3 h-3" />
                          Approve
                        </Button>
                        <Button size="sm" variant="outline">
                          <XCircle className="w-3 h-3 mr-1" />
                          Reject
                        </Button>
                      </div>
                    )}
                    
                    <div className="mt-3 pt-3 border-t text-sm text-slate-500">
                      Created: {new Date(message.created_at).toLocaleString()}
                    </div>
                  </div>
                ))}
                {generatedMessages.length === 0 && (
                  <p className="text-center text-slate-500 py-8">
                    No AI-generated messages yet. Run message generation to create personalized content.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-800">
              <AlertTriangle className="w-4 h-4" />
              <p className="font-medium">AI Intelligence Error</p>
            </div>
            <p className="text-red-700 mt-1">{error}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AIIntelligenceHub;