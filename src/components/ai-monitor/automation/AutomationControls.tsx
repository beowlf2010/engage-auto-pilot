
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Activity, RefreshCw, AlertTriangle } from 'lucide-react';

interface AutomationControlsProps {
  automationEnabled: boolean;
  triggering: boolean;
  onToggleAutomation: (enabled: boolean) => void;
  onTriggerManualRun: () => void;
}

const AutomationControls = ({
  automationEnabled,
  triggering,
  onToggleAutomation,
  onTriggerManualRun
}: AutomationControlsProps) => {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            AI Automation Control Panel
          </CardTitle>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm">Automation</span>
              <Switch
                checked={automationEnabled}
                onCheckedChange={onToggleAutomation}
              />
            </div>
            <Button
              onClick={onTriggerManualRun}
              disabled={triggering}
              size="sm"
              variant="outline"
            >
              <RefreshCw className={`w-4 h-4 mr-1 ${triggering ? 'animate-spin' : ''}`} />
              Manual Run
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!automationEnabled && (
          <Alert className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Automation is currently disabled. Messages will not be sent automatically.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default AutomationControls;
