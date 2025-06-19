
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/cards';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Brain, Zap, CheckCircle, XCircle, Clock, TrendingUp, AlertTriangle, User } from 'lucide-react';
import { useSmartMessageQueue } from '@/hooks/useSmartMessageQueue';
import { toast } from '@/hooks/use-toast';

const SmartAIQueueTab = () => {
  const {
    queuedMessages,
    loading,
    autoApprovalEnabled,
    setAutoApprovalEnabled,
    approveMessage,
    rejectMessage
  } = useSmartMessageQueue();

  const [selectedMessage, setSelectedMessage] = useState<string | null>(null);

  const handleApprove = async (messageId: string, feedback?: any) => {
    await approveMessage(messageId, feedback);
    toast({
      title: "Message Approved",
      description: "Message has been approved and will be sent",
    });
  };

  const handleReject = async (messageId: string, reason: string) => {
    await rejectMessage(messageId, reason);
    toast({
      title: "Message Rejected",
      description: "Message has been rejected and removed from queue",
      variant: "destructive"
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return <AlertTriangle className="w-4 h-4" />;
      case 'medium': return <Clock className="w-4 h-4" />;
      case 'low': return <CheckCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getEffectivenessColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 animate-pulse text-blue-600" />
            <span>Loading smart queue...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const highPriorityCount = queuedMessages.filter(m => m.priority === 'high').length;
  const avgEffectiveness = queuedMessages.reduce((acc, m) => acc + (m.effectiveness_score || 0), 0) / queuedMessages.length;

  return (
    <div className="space-y-6">
      {/* Smart Queue Controls */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-blue-600" />
            Smart AI Queue
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Auto-Approval</h4>
              <p className="text-sm text-muted-foreground">
                Automatically approve high-performing messages (85+ effectiveness)
              </p>
            </div>
            <Switch 
              checked={autoApprovalEnabled} 
              onCheckedChange={setAutoApprovalEnabled}
            />
          </div>

          {/* Queue Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{queuedMessages.length}</div>
              <div className="text-xs text-muted-foreground">Total Queued</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{highPriorityCount}</div>
              <div className="text-xs text-muted-foreground">High Priority</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{avgEffectiveness.toFixed(1)}%</div>
              <div className="text-xs text-muted-foreground">Avg Effectiveness</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {autoApprovalEnabled ? 'ON' : 'OFF'}
              </div>
              <div className="text-xs text-muted-foreground">Auto-Approval</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Message Queue */}
      <Card>
        <CardHeader>
          <CardTitle>Queued Messages</CardTitle>
        </CardHeader>
        <CardContent>
          {queuedMessages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Zap className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No messages in queue</p>
              <p className="text-sm">AI will generate messages as needed</p>
            </div>
          ) : (
            <div className="space-y-4">
              {queuedMessages.map((message) => (
                <div key={message.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`${getPriorityColor(message.priority)}`}>
                        {getPriorityIcon(message.priority)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">{message.leadName}</span>
                          <Badge variant="outline" className="text-xs">
                            {message.stage}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {message.scheduledFor.toLocaleString()}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${getPriorityColor(message.priority)}`}
                      >
                        {message.priority.toUpperCase()}
                      </Badge>
                      {message.effectiveness_score && (
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${getEffectivenessColor(message.effectiveness_score)}`}
                        >
                          {message.effectiveness_score.toFixed(0)}% effective
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Message Content */}
                  <div className="bg-muted p-3 rounded text-sm">
                    {message.messageContent.length > 150 
                      ? `${message.messageContent.substring(0, 150)}...`
                      : message.messageContent
                    }
                  </div>

                  {/* Learning Insights */}
                  {message.learning_insights && (
                    <div className="bg-blue-50 p-3 rounded">
                      <div className="flex items-center gap-2 text-sm font-medium text-blue-700 mb-2">
                        <Brain className="w-4 h-4" />
                        AI Learning Insights
                      </div>
                      <div className="text-xs text-blue-600">
                        <div>Effectiveness: {message.effectiveness_score?.toFixed(1)}%</div>
                        {message.learning_insights.recommendations?.length > 0 && (
                          <div className="mt-1">
                            Suggestions: {message.learning_insights.recommendations[0]}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      onClick={() => handleApprove(message.id, {
                        type: 'positive',
                        rating: 4,
                        suggestions: 'Approved from smart queue'
                      })}
                      className="flex-1"
                    >
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Approve
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setSelectedMessage(message.id)}
                    >
                      Preview
                    </Button>
                    
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={() => handleReject(message.id, 'Manual rejection from queue')}
                    >
                      <XCircle className="w-3 h-3 mr-1" />
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SmartAIQueueTab;
