
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Shield, ShieldOff } from 'lucide-react';
import { aiEmergencyService } from '@/services/aiEmergencyService';
import { toast } from '@/hooks/use-toast';
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

interface AIEmergencyToggleProps {
  userId?: string;
  size?: 'sm' | 'default' | 'lg';
  showStatus?: boolean;
}

const AIEmergencyToggle: React.FC<AIEmergencyToggleProps> = ({
  userId,
  size = 'default',
  showStatus = true
}) => {
  const [isDisabled, setIsDisabled] = useState(false);
  const [disableInfo, setDisableInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const initializeAndSubscribe = async () => {
      await aiEmergencyService.initialize();
      setIsDisabled(aiEmergencyService.isAIDisabled());
      setDisableInfo(aiEmergencyService.getDisableInfo());

      const unsubscribe = aiEmergencyService.onStatusChange((disabled) => {
        setIsDisabled(disabled);
        setDisableInfo(aiEmergencyService.getDisableInfo());
      });

      return unsubscribe;
    };

    let unsubscribe: (() => void) | undefined;
    
    initializeAndSubscribe().then((unsub) => {
      unsubscribe = unsub;
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const handleEmergencyShutdown = async () => {
    setIsLoading(true);
    try {
      await aiEmergencyService.disableAI('Emergency shutdown by user', userId);
      toast({
        title: '🚨 AI Emergency Shutdown Activated',
        description: 'All AI messaging has been disabled immediately.',
        variant: 'destructive'
      });
    } catch (error) {
      console.error('Error during emergency shutdown:', error);
      toast({
        title: 'Error',
        description: 'Failed to activate emergency shutdown',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReEnableAI = async () => {
    setIsLoading(true);
    try {
      await aiEmergencyService.enableAI(userId);
      toast({
        title: '✅ AI Re-enabled',
        description: 'AI messaging has been restored.',
      });
    } catch (error) {
      console.error('Error re-enabling AI:', error);
      toast({
        title: 'Error',
        description: 'Failed to re-enable AI',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isDisabled) {
    return (
      <div className="flex items-center gap-2">
        {showStatus && (
          <Badge variant="destructive" className="animate-pulse">
            <AlertTriangle className="w-3 h-3 mr-1" />
            AI DISABLED
          </Badge>
        )}
        
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button 
              variant="outline" 
              size={size}
              className="border-green-500 text-green-700 hover:bg-green-50"
              disabled={isLoading}
            >
              <Shield className="w-4 h-4 mr-1" />
              Re-enable AI
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-green-600" />
                Re-enable AI Messaging
              </AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to re-enable AI messaging? 
                {disableInfo?.reason && (
                  <div className="mt-2 p-2 bg-red-50 rounded text-sm">
                    <strong>Disabled reason:</strong> {disableInfo.reason}
                    {disableInfo.disabledAt && (
                      <div className="text-xs text-gray-600 mt-1">
                        Disabled at: {new Date(disableInfo.disabledAt).toLocaleString()}
                      </div>
                    )}
                  </div>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleReEnableAI}
                className="bg-green-600 hover:bg-green-700"
              >
                Yes, Re-enable AI
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button 
          variant="destructive" 
          size={size}
          className="bg-red-600 hover:bg-red-700"
          disabled={isLoading}
        >
          <ShieldOff className="w-4 h-4 mr-1" />
          Emergency Stop AI
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="w-5 h-5" />
            Emergency AI Shutdown
          </AlertDialogTitle>
          <AlertDialogDescription>
            This will immediately disable ALL AI messaging system-wide. Use this if you notice:
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Multiple messages sent to same customer</li>
              <li>Messages sent outside business hours</li>
              <li>Inappropriate message content</li>
              <li>Any AI malfunction</li>
            </ul>
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
              <strong className="text-red-800">This action takes effect immediately and cannot be undone automatically.</strong>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleEmergencyShutdown}
            className="bg-red-600 hover:bg-red-700"
          >
            Yes, Emergency Stop AI
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default AIEmergencyToggle;
