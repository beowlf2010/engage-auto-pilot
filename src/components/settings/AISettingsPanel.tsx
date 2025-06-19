
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { 
  Brain, 
  Settings, 
  Zap, 
  MessageSquare, 
  Target, 
  Clock,
  AlertTriangle,
  CheckCircle,
  Save
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const AISettingsPanel = () => {
  const [settings, setSettings] = useState({
    globalAIEnabled: true,
    predictiveAnalytics: true,
    automatedDecisions: true,
    realTimeLearning: true,
    messageGeneration: true,
    leadScoring: true,
    responseThreshold: [75],
    decisionConfidence: [80],
    learningRate: [50],
    messageDelay: [5],
    maxDailyMessages: [10]
  });

  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Settings Saved",
        description: "AI configuration has been updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-6">
      {/* AI Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-blue-600" />
            AI System Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <div className="text-sm font-medium">Finn AI</div>
              <div className="text-xs text-muted-foreground">Active</div>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <div className="text-sm font-medium">Learning</div>
              <div className="text-xs text-muted-foreground">Real-time</div>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <div className="text-sm font-medium">Predictions</div>
              <div className="text-xs text-muted-foreground">87% accuracy</div>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <AlertTriangle className="w-8 h-8 text-yellow-500" />
              </div>
              <div className="text-sm font-medium">Queue</div>
              <div className="text-xs text-muted-foreground">3 pending</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Core AI Features */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Core AI Features
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Global AI System</h4>
              <p className="text-sm text-muted-foreground">
                Master switch for all AI functionality
              </p>
            </div>
            <Switch 
              checked={settings.globalAIEnabled}
              onCheckedChange={(value) => updateSetting('globalAIEnabled', value)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium flex items-center gap-2">
                <Target className="w-4 h-4" />
                Predictive Analytics
              </h4>
              <p className="text-sm text-muted-foreground">
                Lead scoring and conversion predictions
              </p>
            </div>
            <Switch 
              checked={settings.predictiveAnalytics}
              onCheckedChange={(value) => updateSetting('predictiveAnalytics', value)}
              disabled={!settings.globalAIEnabled}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Automated Decisions
              </h4>
              <p className="text-sm text-muted-foreground">
                Automatic lead prioritization and routing
              </p>
            </div>
            <Switch 
              checked={settings.automatedDecisions}
              onCheckedChange={(value) => updateSetting('automatedDecisions', value)}
              disabled={!settings.globalAIEnabled}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Message Generation
              </h4>
              <p className="text-sm text-muted-foreground">
                AI-powered message suggestions and responses
              </p>
            </div>
            <Switch 
              checked={settings.messageGeneration}
              onCheckedChange={(value) => updateSetting('messageGeneration', value)}
              disabled={!settings.globalAIEnabled}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Real-time Learning</h4>
              <p className="text-sm text-muted-foreground">
                Continuous improvement from interactions
              </p>
            </div>
            <Switch 
              checked={settings.realTimeLearning}
              onCheckedChange={(value) => updateSetting('realTimeLearning', value)}
              disabled={!settings.globalAIEnabled}
            />
          </div>
        </CardContent>
      </Card>

      {/* AI Performance Tuning */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Tuning</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="font-medium">Response Threshold</label>
              <Badge variant="outline">{settings.responseThreshold[0]}%</Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              Minimum confidence level for AI responses
            </p>
            <Slider
              value={settings.responseThreshold}
              onValueChange={(value) => updateSetting('responseThreshold', value)}
              max={100}
              min={50}
              step={5}
              className="w-full"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="font-medium">Decision Confidence</label>
              <Badge variant="outline">{settings.decisionConfidence[0]}%</Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              Required confidence for automated decisions
            </p>
            <Slider
              value={settings.decisionConfidence}
              onValueChange={(value) => updateSetting('decisionConfidence', value)}
              max={100}
              min={60}
              step={5}
              className="w-full"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="font-medium">Learning Rate</label>
              <Badge variant="outline">{settings.learningRate[0]}%</Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              How quickly AI adapts to new patterns
            </p>
            <Slider
              value={settings.learningRate}
              onValueChange={(value) => updateSetting('learningRate', value)}
              max={100}
              min={10}
              step={10}
              className="w-full"
            />
          </div>
        </CardContent>
      </Card>

      {/* Message Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Message Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="font-medium flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Message Delay
              </label>
              <Badge variant="outline">{settings.messageDelay[0]} min</Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              Delay between automated messages
            </p>
            <Slider
              value={settings.messageDelay}
              onValueChange={(value) => updateSetting('messageDelay', value)}
              max={60}
              min={1}
              step={1}
              className="w-full"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="font-medium">Daily Message Limit</label>
              <Badge variant="outline">{settings.maxDailyMessages[0]} msgs</Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              Maximum AI messages per lead per day
            </p>
            <Slider
              value={settings.maxDailyMessages}
              onValueChange={(value) => updateSetting('maxDailyMessages', value)}
              max={20}
              min={1}
              step={1}
              className="w-full"
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="flex items-center gap-2">
          {saving ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save Settings
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default AISettingsPanel;
