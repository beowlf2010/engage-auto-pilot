
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Zap, Settings, Play, Pause, CheckCircle, AlertTriangle, Clock, Users } from 'lucide-react';
import { automatedDecisionService } from '@/services/automatedDecisionService';

const AutomatedDecisionPanel = () => {
  const [isAutoMode, setIsAutoMode] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [lastProcessed, setLastProcessed] = useState<Date | null>(null);

  const handleProcessDecisions = async () => {
    setProcessing(true);
    try {
      await automatedDecisionService.processAutomatedDecisions();
      setLastProcessed(new Date());
    } catch (error) {
      console.error('Error processing decisions:', error);
    } finally {
      setProcessing(false);
    }
  };

  const decisionTypes = [
    {
      type: 'human_handoff',
      name: 'Human Handoff',
      description: 'High-value leads requiring personal attention',
      icon: <Users className="w-4 h-4" />,
      color: 'text-orange-600',
      count: 3,
      enabled: true
    },
    {
      type: 'campaign_trigger',
      name: 'Campaign Triggers',
      description: 'Automated re-engagement campaigns',
      icon: <Zap className="w-4 h-4" />,
      color: 'text-yellow-600',
      count: 7,
      enabled: true
    },
    {
      type: 'message_timing',
      name: 'Timing Optimization',
      description: 'Optimal message send time adjustments',
      icon: <Clock className="w-4 h-4" />,
      color: 'text-blue-600',
      count: 12,
      enabled: true
    },
    {
      type: 'content_selection',
      name: 'Content Strategy',
      description: 'Message content and tone adjustments',
      icon: <CheckCircle className="w-4 h-4" />,
      color: 'text-green-600',
      count: 5,
      enabled: true
    }
  ];

  return (
    <div className="space-y-6">
      {/* Control Panel */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-purple-600" />
            Automated Decision Engine
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Auto Mode Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Automatic Processing</h4>
              <p className="text-sm text-muted-foreground">
                Enable continuous automated decision making
              </p>
            </div>
            <Switch checked={isAutoMode} onCheckedChange={setIsAutoMode} />
          </div>

          {/* Manual Trigger */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div>
              <h4 className="font-medium">Manual Processing</h4>
              <p className="text-sm text-muted-foreground">
                Process decisions immediately for all active leads
              </p>
              {lastProcessed && (
                <p className="text-xs text-muted-foreground">
                  Last processed: {lastProcessed.toLocaleTimeString()}
                </p>
              )}
            </div>
            <Button 
              onClick={handleProcessDecisions} 
              disabled={processing}
              className="flex items-center gap-2"
            >
              {processing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Process Now
                </>
              )}
            </Button>
          </div>

          {/* Status Indicator */}
          <div className="flex items-center gap-2 pt-2">
            <div className={`w-2 h-2 rounded-full ${isAutoMode ? 'bg-green-500' : 'bg-gray-400'}`} />
            <span className="text-sm text-muted-foreground">
              {isAutoMode ? 'Auto-processing enabled' : 'Manual mode only'}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Decision Types */}
      <Card>
        <CardHeader>
          <CardTitle>Decision Categories</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {decisionTypes.map((type) => (
              <div key={type.type} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={type.color}>
                      {type.icon}
                    </div>
                    <div>
                      <h4 className="font-medium">{type.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {type.description}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-xs">
                      {type.count} decisions
                    </Badge>
                    <Switch checked={type.enabled} disabled />
                  </div>
                </div>

                {/* Decision Rules Preview */}
                <div className="bg-muted p-3 rounded text-xs">
                  {type.type === 'human_handoff' && (
                    <div>Triggers when: Conversion probability > 80% OR predicted value > $50,000</div>
                  )}
                  {type.type === 'campaign_trigger' && (
                    <div>Triggers when: Churn risk > 70% AND no contact for 7+ days</div>
                  )}
                  {type.type === 'message_timing' && (
                    <div>Triggers when: Response patterns identified AND suboptimal current timing</div>
                  )}
                  {type.type === 'content_selection' && (
                    <div>Triggers when: Response rate < 20% after 5+ messages</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Decision Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Decision Accuracy</span>
                <span>87%</span>
              </div>
              <Progress value={87} className="h-2" />
            </div>

            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Automation Rate</span>
                <span>92%</span>
              </div>
              <Progress value={92} className="h-2" />
            </div>

            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Positive Outcomes</span>
                <span>74%</span>
              </div>
              <Progress value={74} className="h-2" />
            </div>
          </div>

          {/* Recent Outcomes */}
          <div className="mt-6">
            <h4 className="font-medium mb-3">Recent Outcomes</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-3 h-3 text-green-600" />
                <span>Human handoff led to appointment booking</span>
                <Badge variant="secondary" className="text-xs ml-auto">2 hrs ago</Badge>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-3 h-3 text-green-600" />
                <span>Re-engagement campaign received response</span>
                <Badge variant="secondary" className="text-xs ml-auto">4 hrs ago</Badge>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <AlertTriangle className="w-3 h-3 text-yellow-600" />
                <span>Timing optimization pending validation</span>
                <Badge variant="secondary" className="text-xs ml-auto">6 hrs ago</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AutomatedDecisionPanel;
