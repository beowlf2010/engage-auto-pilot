
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { 
  Bot, 
  Play, 
  Pause, 
  Settings, 
  Clock, 
  MessageSquare,
  TrendingUp,
  AlertCircle
} from 'lucide-react';

interface AIControlPanelProps {
  selectedLead: string | null;
  conversation: any;
}

const AIControlPanel = ({ selectedLead, conversation }: AIControlPanelProps) => {
  const [aiEnabled, setAiEnabled] = useState(conversation?.aiOptIn || false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  if (!selectedLead || !conversation) {
    return null;
  }

  const handleAiToggle = (enabled: boolean) => {
    setAiEnabled(enabled);
    // TODO: Implement AI toggle logic
    console.log(`AI ${enabled ? 'enabled' : 'disabled'} for lead ${selectedLead}`);
  };

  return (
    <div className="fixed bottom-4 right-4 w-80 z-40">
      <Card className="border-purple-200 bg-purple-50/80 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Bot className="h-4 w-4 text-purple-600" />
            Finn AI Control
            <Badge variant={aiEnabled ? 'default' : 'secondary'} className="ml-auto">
              {aiEnabled ? 'Active' : 'Paused'}
            </Badge>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* AI Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">AI Assistant</span>
              {aiEnabled ? (
                <Play className="h-3 w-3 text-green-600" />
              ) : (
                <Pause className="h-3 w-3 text-orange-600" />
              )}
            </div>
            <Switch
              checked={aiEnabled}
              onCheckedChange={handleAiToggle}
            />
          </div>

          {aiEnabled && (
            <>
              <Separator />
              
              {/* AI Status */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600">Next AI Message</span>
                  <Badge variant="outline" className="text-xs">
                    <Clock className="h-2 w-2 mr-1" />
                    In 2 hours
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600">AI Messages Sent</span>
                  <span className="font-medium">3 today</span>
                </div>
                
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600">Response Rate</span>
                  <span className="font-medium text-green-600">67%</span>
                </div>
              </div>

              <Separator />

              {/* Quick Actions */}
              <div className="space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-xs"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                >
                  <Settings className="h-3 w-3 mr-2" />
                  AI Settings
                </Button>
                
                {showAdvanced && (
                  <div className="space-y-2 p-2 bg-white rounded border">
                    <div className="flex items-center justify-between">
                      <span className="text-xs">Aggressive Mode</span>
                      <Switch defaultChecked={false} />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs">Auto-Pause on Reply</span>
                      <Switch defaultChecked={true} />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs">Weekend Messages</span>
                      <Switch defaultChecked={false} />
                    </div>
                  </div>
                )}
              </div>

              {/* AI Insights */}
              <div className="bg-white p-2 rounded border">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-3 w-3 text-blue-600" />
                  <span className="text-xs font-medium">AI Insights</span>
                </div>
                <p className="text-xs text-slate-600">
                  Lead shows high interest in financing options. Consider mentioning current rates.
                </p>
              </div>
            </>
          )}

          {!aiEnabled && (
            <div className="bg-orange-50 p-2 rounded border border-orange-200">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-3 w-3 text-orange-600" />
                <span className="text-xs text-orange-700">
                  AI is paused for this lead
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AIControlPanel;
