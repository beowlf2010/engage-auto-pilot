
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
  AlertCircle,
  ChevronUp,
  ChevronDown
} from 'lucide-react';

interface AIControlPanelProps {
  selectedLead: string | null;
  conversation: any;
}

const AIControlPanel = ({ selectedLead, conversation }: AIControlPanelProps) => {
  const [aiEnabled, setAiEnabled] = useState(conversation?.aiOptIn || false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  if (!selectedLead || !conversation) {
    return null;
  }

  const handleAiToggle = (enabled: boolean) => {
    setAiEnabled(enabled);
    console.log(`AI ${enabled ? 'enabled' : 'disabled'} for lead ${selectedLead}`);
  };

  // Collapsed state - just a small floating button
  if (!isExpanded) {
    return (
      <div className="fixed bottom-4 right-4 z-40">
        <Button
          onClick={() => setIsExpanded(true)}
          className={`rounded-full w-12 h-12 shadow-lg ${
            aiEnabled 
              ? 'bg-purple-600 hover:bg-purple-700 text-white' 
              : 'bg-slate-600 hover:bg-slate-700 text-white'
          }`}
        >
          <Bot className="h-5 w-5" />
        </Button>
        {aiEnabled && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
        )}
      </div>
    );
  }

  // Expanded state - compact panel
  return (
    <div className="fixed bottom-4 right-4 w-72 z-40">
      <Card className="border-purple-200 bg-white shadow-xl">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Bot className="h-4 w-4 text-purple-600" />
              Finn AI
              <Badge variant={aiEnabled ? 'default' : 'secondary'} className="text-xs">
                {aiEnabled ? 'Active' : 'Paused'}
              </Badge>
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(false)}
              className="h-6 w-6 p-0"
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-3 pt-0">
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
              size="sm"
            />
          </div>

          {aiEnabled && (
            <>
              <Separator />
              
              {/* Compact AI Status */}
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Next Message</span>
                  <Badge variant="outline" className="text-xs">
                    <Clock className="h-2 w-2 mr-1" />
                    2h
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Messages Today</span>
                  <span className="font-medium">3</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Response Rate</span>
                  <span className="font-medium text-green-600">67%</span>
                </div>
              </div>

              <Separator />

              {/* Quick Settings Toggle */}
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-between text-xs h-7"
                onClick={() => setShowAdvanced(!showAdvanced)}
              >
                <div className="flex items-center">
                  <Settings className="h-3 w-3 mr-2" />
                  Settings
                </div>
                {showAdvanced ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </Button>
              
              {showAdvanced && (
                <div className="space-y-2 p-2 bg-slate-50 rounded border text-xs">
                  <div className="flex items-center justify-between">
                    <span>Aggressive Mode</span>
                    <Switch defaultChecked={false} size="sm" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Auto-Pause on Reply</span>
                    <Switch defaultChecked={true} size="sm" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Weekend Messages</span>
                    <Switch defaultChecked={false} size="sm" />
                  </div>
                </div>
              )}

              {/* Compact AI Insight */}
              <div className="bg-blue-50 p-2 rounded border">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="h-3 w-3 text-blue-600" />
                  <span className="text-xs font-medium">AI Insight</span>
                </div>
                <p className="text-xs text-slate-600">
                  Lead shows high interest in financing options.
                </p>
              </div>
            </>
          )}

          {!aiEnabled && (
            <div className="bg-orange-50 p-2 rounded border border-orange-200">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-3 w-3 text-orange-600" />
                <span className="text-xs text-orange-700">
                  AI is paused
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
