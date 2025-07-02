import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Layout,
  Palette,
  Monitor,
  Smartphone,
  Tablet,
  Eye,
  Settings,
  Save,
  RotateCcw,
  Grid,
  List,
  Sidebar,
  PanelLeft,
  PanelRight,
  MessageSquare
} from 'lucide-react';

interface WorkspaceSettings {
  layout: 'compact' | 'comfortable' | 'spacious';
  density: 'high' | 'medium' | 'low';
  sidebarWidth: number;
  aiPanelWidth: number;
  showAvatars: boolean;
  showTimestamps: boolean;
  showAIInsights: boolean;
  showBuyingSignals: boolean;
  viewMode: 'list' | 'grid' | 'cards';
  theme: 'auto' | 'light' | 'dark';
  focusMode: boolean;
}

interface WorkspaceCustomizationProps {
  settings: WorkspaceSettings;
  onSettingsChange: (settings: Partial<WorkspaceSettings>) => void;
  onSave: () => void;
  onReset: () => void;
  isOpen: boolean;
  onClose: () => void;
}

const defaultSettings: WorkspaceSettings = {
  layout: 'comfortable',
  density: 'medium',
  sidebarWidth: 384, // w-96 = 24rem = 384px
  aiPanelWidth: 320, // w-80 = 20rem = 320px
  showAvatars: true,
  showTimestamps: true,
  showAIInsights: true,
  showBuyingSignals: true,
  viewMode: 'list',
  theme: 'auto',
  focusMode: false
};

export const WorkspaceCustomization: React.FC<WorkspaceCustomizationProps> = ({
  settings,
  onSettingsChange,
  onSave,
  onReset,
  isOpen,
  onClose
}) => {
  const [previewMode, setPreviewMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');

  if (!isOpen) return null;

  const handleSettingChange = <K extends keyof WorkspaceSettings>(
    key: K,
    value: WorkspaceSettings[K]
  ) => {
    onSettingsChange({ [key]: value });
  };

  const layoutPresets = [
    {
      id: 'compact',
      name: 'Compact',
      description: 'Maximize conversations visible at once',
      settings: {
        layout: 'compact' as const,
        density: 'high' as const,
        sidebarWidth: 320,
        showTimestamps: false
      }
    },
    {
      id: 'comfortable',
      name: 'Comfortable',
      description: 'Balanced view with good readability',
      settings: {
        layout: 'comfortable' as const,
        density: 'medium' as const,
        sidebarWidth: 384,
        showTimestamps: true
      }
    },
    {
      id: 'spacious',
      name: 'Spacious',
      description: 'Maximum readability and spacing',
      settings: {
        layout: 'spacious' as const,
        density: 'low' as const,
        sidebarWidth: 448,
        showTimestamps: true
      }
    }
  ];

  const viewModes = [
    { id: 'list', name: 'List View', icon: List },
    { id: 'grid', name: 'Grid View', icon: Grid },
    { id: 'cards', name: 'Card View', icon: Layout }
  ];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Workspace Customization
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={onReset}>
                <RotateCcw className="h-4 w-4 mr-1" />
                Reset
              </Button>
              <Button size="sm" onClick={onSave}>
                <Save className="h-4 w-4 mr-1" />
                Save
              </Button>
              <Button variant="ghost" size="sm" onClick={onClose}>
                ×
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="flex h-[600px]">
            {/* Settings Panel */}
            <div className="w-80 border-r bg-muted/30 overflow-auto">
              <div className="p-6 space-y-6">
                {/* Layout Presets */}
                <div>
                  <h3 className="font-medium mb-3">Layout Presets</h3>
                  <div className="space-y-2">
                    {layoutPresets.map((preset) => (
                      <div
                        key={preset.id}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          settings.layout === preset.id
                            ? 'border-primary bg-primary/10'
                            : 'border-border hover:bg-muted/50'
                        }`}
                        onClick={() => {
                          Object.entries(preset.settings).forEach(([key, value]) => {
                            handleSettingChange(key as keyof WorkspaceSettings, value);
                          });
                        }}
                      >
                        <div className="font-medium text-sm">{preset.name}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {preset.description}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* View Mode */}
                <div>
                  <h3 className="font-medium mb-3">View Mode</h3>
                  <div className="grid grid-cols-1 gap-2">
                    {viewModes.map((mode) => {
                      const Icon = mode.icon;
                      return (
                        <Button
                          key={mode.id}
                          variant={settings.viewMode === mode.id ? 'default' : 'outline'}
                          className="justify-start h-auto p-3"
                          onClick={() => handleSettingChange('viewMode', mode.id as any)}
                        >
                          <Icon className="h-4 w-4 mr-2" />
                          {mode.name}
                        </Button>
                      );
                    })}
                  </div>
                </div>

                <Separator />

                {/* Panel Widths */}
                <div>
                  <h3 className="font-medium mb-3">Panel Sizes</h3>
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium">Sidebar Width</label>
                        <span className="text-xs text-muted-foreground">
                          {settings.sidebarWidth}px
                        </span>
                      </div>
                      <Slider
                        value={[settings.sidebarWidth]}
                        onValueChange={([value]) => handleSettingChange('sidebarWidth', value)}
                        min={280}
                        max={500}
                        step={20}
                        className="w-full"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium">AI Panel Width</label>
                        <span className="text-xs text-muted-foreground">
                          {settings.aiPanelWidth}px
                        </span>
                      </div>
                      <Slider
                        value={[settings.aiPanelWidth]}
                        onValueChange={([value]) => handleSettingChange('aiPanelWidth', value)}
                        min={240}
                        max={400}
                        step={20}
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Display Options */}
                <div>
                  <h3 className="font-medium mb-3">Display Options</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Show Avatars</label>
                      <Switch
                        checked={settings.showAvatars}
                        onCheckedChange={(checked) => handleSettingChange('showAvatars', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Show Timestamps</label>
                      <Switch
                        checked={settings.showTimestamps}
                        onCheckedChange={(checked) => handleSettingChange('showTimestamps', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Show AI Insights</label>
                      <Switch
                        checked={settings.showAIInsights}
                        onCheckedChange={(checked) => handleSettingChange('showAIInsights', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Show Buying Signals</label>
                      <Switch
                        checked={settings.showBuyingSignals}
                        onCheckedChange={(checked) => handleSettingChange('showBuyingSignals', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Focus Mode</label>
                      <Switch
                        checked={settings.focusMode}
                        onCheckedChange={(checked) => handleSettingChange('focusMode', checked)}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Theme */}
                <div>
                  <h3 className="font-medium mb-3">Theme</h3>
                  <Select
                    value={settings.theme}
                    onValueChange={(value) => handleSettingChange('theme', value as any)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Auto</SelectItem>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Preview */}
            <div className="flex-1 bg-background">
              <div className="border-b p-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">Preview</h3>
                  <div className="flex gap-2">
                    <Button
                      variant={previewMode === 'desktop' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setPreviewMode('desktop')}
                    >
                      <Monitor className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={previewMode === 'tablet' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setPreviewMode('tablet')}
                    >
                      <Tablet className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={previewMode === 'mobile' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setPreviewMode('mobile')}
                    >
                      <Smartphone className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="p-4 h-full overflow-auto">
                <div className={`mx-auto bg-white border rounded-lg overflow-hidden ${
                  previewMode === 'desktop' ? 'w-full h-[400px]' :
                  previewMode === 'tablet' ? 'w-3/4 h-[300px]' :
                  'w-80 h-[500px]'
                }`}>
                  {/* Mock preview of the inbox with applied settings */}
                  <div className="h-full flex">
                    <div 
                      className="border-r bg-muted/30 flex-shrink-0"
                      style={{ width: `${settings.sidebarWidth / 4}px` }}
                    >
                      <div className="p-2">
                        <div className="text-xs font-medium mb-2">Conversations</div>
                        {[1, 2, 3].map((i) => (
                          <div key={i} className={`p-2 mb-1 bg-white rounded border text-xs ${
                            settings.layout === 'compact' ? 'py-1' :
                            settings.layout === 'spacious' ? 'py-3' : 'py-2'
                          }`}>
                            <div className="flex items-center gap-2 mb-1">
                              {settings.showAvatars && (
                                <div className="w-4 h-4 bg-blue-500 rounded-full" />
                              )}
                              <span className="font-medium">Customer {i}</span>
                            </div>
                            <div className="text-muted-foreground">Last message...</div>
                            {settings.showTimestamps && (
                              <div className="text-xs text-muted-foreground mt-1">2m ago</div>
                            )}
                            {settings.showAIInsights && (
                              <Badge variant="secondary" className="text-xs mt-1">AI: 85%</Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="flex-1 bg-background">
                      <div className="p-4 text-center text-muted-foreground">
                        <MessageSquare className="h-8 w-8 mx-auto mb-2" />
                        <div className="text-sm">Chat View</div>
                      </div>
                    </div>
                    
                    <div 
                      className="border-l bg-muted/30 flex-shrink-0"
                      style={{ width: `${settings.aiPanelWidth / 4}px` }}
                    >
                      <div className="p-2">
                        <div className="text-xs font-medium mb-2">AI Assistant</div>
                        <div className="bg-white rounded border p-2 text-xs">
                          <div className="font-medium mb-1">Insights</div>
                          <div className="text-muted-foreground">AI recommendations...</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};