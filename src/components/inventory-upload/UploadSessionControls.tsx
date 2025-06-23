
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Timer, Upload, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { uploadSessionService, type UploadSession } from '@/services/inventory/uploadSessionService';
import { performInventoryCleanup } from '@/services/inventory/core/inventoryCleanupService';
import { toast } from '@/hooks/use-toast';

interface UploadSessionControlsProps {
  userId: string;
  disabled?: boolean;
}

const UploadSessionControls: React.FC<UploadSessionControlsProps> = ({ userId, disabled = false }) => {
  const [session, setSession] = useState<UploadSession | null>(null);
  const [isRunningCleanup, setIsRunningCleanup] = useState(false);

  useEffect(() => {
    const checkSession = () => {
      const activeSession = uploadSessionService.getActiveSession();
      setSession(activeSession);
    };

    checkSession();
    const interval = setInterval(checkSession, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, []);

  const handleStartSession = async () => {
    try {
      const newSession = await uploadSessionService.startSession(userId);
      setSession(newSession);
      toast({
        title: "Upload Session Started",
        description: "Automatic cleanup is now disabled. Upload your files safely.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to start upload session",
        variant: "destructive"
      });
    }
  };

  const handleEndSession = () => {
    uploadSessionService.endSession();
    setSession(null);
    toast({
      title: "Upload Session Ended",
      description: "You can now run cleanup manually or it will resume automatically for new uploads.",
    });
  };

  const handleCompleteAndCleanup = async () => {
    setIsRunningCleanup(true);
    try {
      uploadSessionService.completeSession();
      setSession(null);
      
      await performInventoryCleanup();
      
      toast({
        title: "Session Complete",
        description: "Upload session ended and inventory cleanup completed successfully.",
      });
    } catch (error) {
      toast({
        title: "Cleanup Error",
        description: "Session ended but cleanup had issues. Check console for details.",
        variant: "destructive"
      });
    } finally {
      setIsRunningCleanup(false);
    }
  };

  const getTimeRemaining = () => {
    if (!session) return null;
    
    const now = new Date();
    const lastActivity = new Date(session.lastActivity);
    const timeElapsed = now.getTime() - lastActivity.getTime();
    const timeRemaining = (30 * 60 * 1000) - timeElapsed; // 30 minutes in milliseconds
    
    if (timeRemaining <= 0) return "Expired";
    
    const minutes = Math.floor(timeRemaining / (60 * 1000));
    return `${minutes}m remaining`;
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Timer className="h-4 w-4" />
          Upload Session Control
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {session ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Active Session
                </Badge>
                <span className="text-xs text-gray-500">
                  {getTimeRemaining()}
                </span>
              </div>
            </div>
            
            <div className="text-sm text-gray-600">
              <div>Files uploaded: <strong>{session.uploadCount}</strong></div>
              <div>Auto-cleanup: <strong className="text-orange-600">Disabled</strong></div>
            </div>
            
            <div className="flex gap-2">
              <Button
                onClick={handleCompleteAndCleanup}
                size="sm"
                disabled={disabled || isRunningCleanup}
                className="flex-1"
              >
                {isRunningCleanup ? (
                  <>
                    <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                    Running Cleanup...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Complete & Cleanup
                  </>
                )}
              </Button>
              
              <Button
                onClick={handleEndSession}
                variant="outline"
                size="sm"
                disabled={disabled || isRunningCleanup}
              >
                <XCircle className="h-3 w-3 mr-1" />
                End Session
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-sm text-gray-600">
              <div>Status: <strong className="text-blue-600">Ready for uploads</strong></div>
              <div>Auto-cleanup: <strong className="text-green-600">Enabled</strong></div>
            </div>
            
            <Button
              onClick={handleStartSession}
              size="sm"
              disabled={disabled}
              className="w-full"
            >
              <Upload className="h-3 w-3 mr-1" />
              Start Multi-File Session
            </Button>
            
            <p className="text-xs text-gray-500">
              Start a session to upload multiple inventory files without automatic cleanup between uploads.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default UploadSessionControls;
