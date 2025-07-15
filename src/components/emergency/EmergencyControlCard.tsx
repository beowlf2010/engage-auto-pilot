import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, Shield, ShieldOff, Play, Pause } from 'lucide-react';
import { aiEmergencyService } from '@/services/aiEmergencyService';
import { useAuth } from '@/components/auth/AuthProvider';

export const EmergencyControlCard: React.FC = () => {
  const [isDisabled, setIsDisabled] = useState(false);
  const [disableInfo, setDisableInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { profile } = useAuth();

  useEffect(() => {
    const initializeService = async () => {
      await aiEmergencyService.initialize();
      setIsDisabled(aiEmergencyService.isAIDisabled());
      setDisableInfo(aiEmergencyService.getDisableInfo());
    };

    initializeService();

    const unsubscribe = aiEmergencyService.onStatusChange((disabled) => {
      setIsDisabled(disabled);
      setDisableInfo(aiEmergencyService.getDisableInfo());
    });

    return unsubscribe;
  }, []);

  const handleToggle = async () => {
    if (isLoading) return;

    setIsLoading(true);
    try {
      if (isDisabled) {
        await aiEmergencyService.enableAI(profile?.id);
      } else {
        await aiEmergencyService.disableAI('Manual emergency stop', profile?.id);
      }
    } catch (error) {
      console.error('❌ Error toggling AI emergency state:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const canControl = profile?.role === 'admin' || profile?.role === 'manager';

  return (
    <Card className={`border-2 ${isDisabled ? 'border-destructive bg-destructive/5' : 'border-green-500 bg-green-50 dark:bg-green-950/20'}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          {isDisabled ? (
            <>
              <ShieldOff className="h-4 w-4 text-destructive" />
              AI Emergency Stop
            </>
          ) : (
            <>
              <Shield className="h-4 w-4 text-green-600" />
              AI System Status
            </>
          )}
        </CardTitle>
        <Badge 
          variant={isDisabled ? "destructive" : "default"}
          className={isDisabled ? "bg-destructive text-destructive-foreground" : "bg-green-500 text-white"}
        >
          {isDisabled ? 'STOPPED' : 'OPERATIONAL'}
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            {isDisabled ? (
              <AlertTriangle className="h-5 w-5 text-destructive animate-pulse" />
            ) : (
              <CheckCircle className="h-5 w-5 text-green-600" />
            )}
            <div className="flex-1">
              <div className={`text-sm font-medium ${isDisabled ? 'text-destructive' : 'text-green-700 dark:text-green-400'}`}>
                {isDisabled ? 'AI automation is stopped' : 'AI automation is running'}
              </div>
              {disableInfo?.reason && (
                <div className="text-xs text-muted-foreground mt-1">
                  Reason: {disableInfo.reason}
                </div>
              )}
              {disableInfo?.disabledAt && (
                <div className="text-xs text-muted-foreground">
                  Since: {new Date(disableInfo.disabledAt).toLocaleString()}
                </div>
              )}
            </div>
          </div>

          {canControl && (
            <Button
              onClick={handleToggle}
              disabled={isLoading}
              variant={isDisabled ? "default" : "destructive"}
              size="sm"
              className="w-full"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                  <span>{isDisabled ? 'Enabling...' : 'Stopping...'}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  {isDisabled ? (
                    <>
                      <Play className="h-3 w-3" />
                      <span>Enable AI System</span>
                    </>
                  ) : (
                    <>
                      <Pause className="h-3 w-3" />
                      <span>Emergency Stop</span>
                    </>
                  )}
                </div>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};