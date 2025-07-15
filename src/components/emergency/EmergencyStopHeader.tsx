
import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { aiEmergencyService } from '@/services/aiEmergencyService';
import { useAuth } from '@/components/auth/AuthProvider';

export const EmergencyStopHeader: React.FC = () => {
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

  // Only show if AI is disabled - when enabled, don't show anything
  if (!isDisabled) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-red-500/90 backdrop-blur-sm border-b border-red-600/50 px-4 py-2 shadow-lg">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-white animate-pulse" />
          <div className="text-white">
            <span className="font-semibold text-sm">AI EMERGENCY STOP ACTIVE</span>
            {disableInfo?.reason && (
              <span className="ml-2 text-xs opacity-90">- {disableInfo.reason}</span>
            )}
          </div>
        </div>

        {(profile?.role === 'admin' || profile?.role === 'manager') && (
          <Button
            onClick={handleToggle}
            disabled={isLoading}
            variant="secondary"
            size="sm"
            className="bg-white/20 hover:bg-white/30 text-white border-white/30 text-xs px-3 py-1 h-auto"
          >
            {isLoading ? (
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 border border-white/50 border-t-white rounded-full animate-spin" />
                <span>Enabling...</span>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                <span>Re-enable AI</span>
              </div>
            )}
          </Button>
        )}
      </div>
    </div>
  );
};
