import React, { useState, useEffect } from 'react';
import { AlertTriangle, Power, PowerOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { aiEmergencyService } from '@/services/aiEmergencyService';
import { toast } from 'sonner';
import { useAuth } from '@/components/auth/AuthProvider';

export const EmergencyStopHeader = () => {
  const [isDisabled, setIsDisabled] = useState(false);
  const [disableInfo, setDisableInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { profile } = useAuth();

  useEffect(() => {
    // Initialize the service and get current state
    const initializeService = async () => {
      try {
        await aiEmergencyService.initialize();
        setIsDisabled(aiEmergencyService.isAIDisabled());
        setDisableInfo(aiEmergencyService.getDisableInfo());
      } catch (error) {
        console.error('Failed to initialize AI emergency service:', error);
      }
    };

    initializeService();

    // Subscribe to status changes
    const unsubscribe = aiEmergencyService.onStatusChange((disabled) => {
      setIsDisabled(disabled);
      setDisableInfo(aiEmergencyService.getDisableInfo());
    });

    return unsubscribe;
  }, []);

  const handleEmergencyStop = async () => {
    setIsLoading(true);
    try {
      await aiEmergencyService.disableAI('Emergency shutdown activated from header', profile?.id);
      toast.error('🚨 AI Emergency Stop Activated', {
        description: 'All AI operations have been halted immediately.',
        duration: 5000,
      });
    } catch (error) {
      console.error('Failed to activate emergency stop:', error);
      toast.error('Failed to activate emergency stop');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReEnable = async () => {
    setIsLoading(true);
    try {
      await aiEmergencyService.enableAI(profile?.id);
      toast.success('✅ AI Re-enabled', {
        description: 'AI operations have been restored.',
        duration: 3000,
      });
    } catch (error) {
      console.error('Failed to re-enable AI:', error);
      toast.error('Failed to re-enable AI');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="sticky top-0 z-[100] bg-destructive/90 backdrop-blur border-b border-destructive/20 px-4 py-2">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Status Indicator */}
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive-foreground" />
          <span className="text-sm font-medium text-destructive-foreground">
            AI Emergency Control
          </span>
          <Badge 
            variant={isDisabled ? "destructive" : "secondary"}
            className={isDisabled ? "bg-destructive text-destructive-foreground" : "bg-emerald-500 text-white animate-pulse"}
          >
            {isDisabled ? "AI STOPPED" : "AI ACTIVE"}
          </Badge>
        </div>

        {/* Emergency Button */}
        <div className="flex items-center gap-2">
          {disableInfo && (
            <span className="text-xs text-destructive-foreground/80 hidden sm:block">
              Stopped: {new Date(disableInfo.disabledAt).toLocaleTimeString()}
            </span>
          )}
          
          {isDisabled ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm"
                  disabled={isLoading}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-500"
                >
                  <Power className="h-4 w-4 mr-1" />
                  Re-enable AI
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <Power className="h-5 w-5 text-emerald-600" />
                    Re-enable AI Operations?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    This will restore all AI functionality including message generation, lead scoring, 
                    and automated responses. Make sure any issues have been resolved.
                    {disableInfo?.reason && (
                      <div className="mt-2 p-2 bg-muted rounded text-sm">
                        <strong>Disabled reason:</strong> {disableInfo.reason}
                      </div>
                    )}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleReEnable}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    Re-enable AI
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="destructive" 
                  size="sm"
                  disabled={isLoading}
                  className="bg-red-600 hover:bg-red-700 text-white shadow-lg animate-pulse"
                >
                  <PowerOff className="h-4 w-4 mr-1" />
                  EMERGENCY STOP
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                    <AlertTriangle className="h-5 w-5" />
                    Emergency AI Shutdown
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    This will immediately halt ALL AI operations including:
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>Message generation and sending</li>
                      <li>Lead scoring and analysis</li>
                      <li>Automated responses</li>
                      <li>AI-powered insights</li>
                    </ul>
                    <div className="mt-3 p-3 bg-destructive/10 rounded border-l-4 border-destructive">
                      <strong>⚠️ Only use in emergency situations!</strong>
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleEmergencyStop}
                    className="bg-destructive hover:bg-destructive/90"
                  >
                    EMERGENCY STOP
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>
    </div>
  );
};