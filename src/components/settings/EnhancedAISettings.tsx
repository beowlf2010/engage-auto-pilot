
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { 
  Brain, 
  Target, 
  TrendingUp, 
  Zap,
  Clock,
  MessageSquare,
  BarChart3,
  Settings
} from "lucide-react";

interface EnhancedAISettingsProps {
  userRole: string;
}

const EnhancedAISettings = ({ userRole }: EnhancedAISettingsProps) => {
  const [settings, setSettings] = useState({
    behavioralTriggers: true,
    inventoryAlerts: true,
    marketIntelligence: true,
    personalizedMemory: true,
    urgencyDetection: true,
    responsePatternLearning: true,
    competitiveAnalysis: false,
    seasonalCampaigns: false
  });

  const [triggers, setTriggers] = useState({
    websiteVisit: { enabled: true, delay: 5, message: "I noticed you were looking at vehicles online. Found anything interesting?" },
    priceDrop: { enabled: true, delay: 0, message: "Great news! The price just dropped on that vehicle you were interested in." },
    newInventory: { enabled: true, delay: 30, message: "Just got a vehicle that matches what you're looking for. Want to see it?" },
    abandonedQuote: { enabled: true, delay: 60, message: "You were looking at financing options. Any questions I can help answer?" }
  });

  const { toast } = useToast();

  const handleSettingChange = (setting: string, value: boolean) => {
    setSettings(prev => ({ ...prev, [setting]: value }));
  };

  const handleTriggerChange = (trigger: string, field: string, value: any) => {
    setTriggers(prev => ({
      ...prev,
      [trigger]: { ...prev[trigger], [field]: value }
    }));
  };

  const handleSave = () => {
    toast({
      title: "Enhanced AI Settings Saved",
      description: "Your advanced Finn AI configuration has been updated successfully"
    });
  };

  if (userRole === "sales") {
    return (
      <div className="text-center py-12">
        <Brain className="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-slate-800 mb-2">Manager Access Required</h3>
        <p className="text-slate-600">Enhanced AI settings can only be configured by managers and administrators</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Core AI Features */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Brain className="w-5 h-5" />
            <span>Core AI Features</span>
            <Badge variant="secondary">Phase 1</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-medium">Personalized Memory</Label>
                  <p className="text-sm text-slate-500">Remember lead preferences, objections, and interests</p>
                </div>
                <Switch 
                  checked={settings.personalizedMemory}
                  onCheckedChange={(value) => handleSettingChange('personalizedMemory', value)}
                  disabled={userRole === "sales"}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-medium">Response Pattern Learning</Label>
                  <p className="text-sm text-slate-500">Learn when leads are most likely to respond</p>
                </div>
                <Switch 
                  checked={settings.responsePatternLearning}
                  onCheckedChange={(value) => handleSettingChange('responsePatternLearning', value)}
                  disabled={userRole === "sales"}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-medium">Urgency Detection</Label>
                  <p className="text-sm text-slate-500">Detect buying signals and adjust messaging</p>
                </div>
                <Switch 
                  checked={settings.urgencyDetection}
                  onCheckedChange={(value) => handleSettingChange('urgencyDetection', value)}
                  disabled={userRole === "sales"}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-medium">Market Intelligence</Label>
                  <p className="text-sm text-slate-500">Include market trends and pricing context</p>
                </div>
                <Switch 
                  checked={settings.marketIntelligence}
                  onCheckedChange={(value) => handleSettingChange('marketIntelligence', value)}
                  disabled={userRole === "sales"}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Behavioral Triggers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Target className="w-5 h-5" />
            <span>Behavioral Triggers</span>
            <Badge variant="secondary">Phase 2</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <Label className="font-medium">Enable Behavioral Triggers</Label>
              <p className="text-sm text-slate-500">Send messages based on lead actions and behavior</p>
            </div>
            <Switch 
              checked={settings.behavioralTriggers}
              onCheckedChange={(value) => handleSettingChange('behavioralTriggers', value)}
              disabled={userRole === "sales"}
            />
          </div>

          {settings.behavioralTriggers && (
            <div className="space-y-4 border-t pt-4">
              {Object.entries(triggers).map(([key, trigger]) => (
                <div key={key} className="p-4 border border-slate-200 rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="font-medium capitalize">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </Label>
                    <Switch 
                      checked={trigger.enabled}
                      onCheckedChange={(value) => handleTriggerChange(key, 'enabled', value)}
                      disabled={userRole === "sales"}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs">Delay (minutes)</Label>
                      <Input 
                        type="number" 
                        value={trigger.delay}
                        onChange={(e) => handleTriggerChange(key, 'delay', parseInt(e.target.value))}
                        className="text-sm"
                        disabled={userRole === "sales"}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label className="text-xs">Message Template</Label>
                      <Textarea 
                        value={trigger.message}
                        onChange={(e) => handleTriggerChange(key, 'message', e.target.value)}
                        className="text-sm"
                        rows={2}
                        disabled={userRole === "sales"}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Inventory Intelligence */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Zap className="w-5 h-5" />
            <span>Inventory Intelligence</span>
            <Badge variant="secondary">Phase 3</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-center justify-between">
              <div>
                <Label className="font-medium">Inventory Alerts</Label>
                <p className="text-sm text-slate-500">Notify leads about new arrivals and price changes</p>
              </div>
              <Switch 
                checked={settings.inventoryAlerts}
                onCheckedChange={(value) => handleSettingChange('inventoryAlerts', value)}
                disabled={userRole === "sales"}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="font-medium">Competitive Analysis</Label>
                <p className="text-sm text-slate-500">Include competitive pricing in messages</p>
              </div>
              <Switch 
                checked={settings.competitiveAnalysis}
                onCheckedChange={(value) => handleSettingChange('competitiveAnalysis', value)}
                disabled={userRole === "sales"}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Advanced Features */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="w-5 h-5" />
            <span>Advanced Features</span>
            <Badge variant="outline">Phase 4</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-center justify-between">
              <div>
                <Label className="font-medium">Seasonal Campaigns</Label>
                <p className="text-sm text-slate-500">Automatic seasonal and event-based messaging</p>
              </div>
              <Switch 
                checked={settings.seasonalCampaigns}
                onCheckedChange={(value) => handleSettingChange('seasonalCampaigns', value)}
                disabled={userRole === "sales"}
              />
            </div>

            <div className="space-y-2">
              <Label className="font-medium">AI Learning Rate</Label>
              <p className="text-sm text-slate-500">How quickly Finn adapts to new patterns</p>
              <select 
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                disabled={userRole === "sales"}
              >
                <option value="conservative">Conservative (Slower, safer learning)</option>
                <option value="balanced" selected>Balanced (Recommended)</option>
                <option value="aggressive">Aggressive (Faster adaptation)</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="w-5 h-5" />
            <span>Performance Metrics</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">94%</div>
              <div className="text-sm text-slate-600">Message Delivery</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">23%</div>
              <div className="text-sm text-slate-600">Response Rate</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">47</div>
              <div className="text-sm text-slate-600">Active Sequences</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">12%</div>
              <div className="text-sm text-slate-600">Conversion Rate</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      {userRole !== "sales" && (
        <div className="flex justify-end">
          <Button onClick={handleSave} size="lg">
            <Settings className="w-4 h-4 mr-2" />
            Save Enhanced AI Settings
          </Button>
        </div>
      )}
    </div>
  );
};

export default EnhancedAISettings;
