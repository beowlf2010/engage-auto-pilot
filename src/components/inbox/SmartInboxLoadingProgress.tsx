
import React from 'react';
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface LoadingProgress {
  stage: 'initializing' | 'loading_basic' | 'loading_details' | 'processing' | 'complete' | 'error';
  progress: number;
  message: string;
  error?: string;
}

interface SmartInboxLoadingProgressProps {
  progress: LoadingProgress;
  onRetry?: () => void;
}

const SmartInboxLoadingProgress: React.FC<SmartInboxLoadingProgressProps> = ({
  progress,
  onRetry
}) => {
  const getStageIcon = () => {
    switch (progress.stage) {
      case 'error':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      case 'complete':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      default:
        return <Loader2 className="h-4 w-4 animate-spin text-blue-600" />;
    }
  };

  const getStageDescription = () => {
    switch (progress.stage) {
      case 'initializing':
        return 'Setting up data connection...';
      case 'loading_basic':
        return 'Loading lead information...';
      case 'loading_details':
        return 'Fetching conversation data...';
      case 'processing':
        return 'Processing and organizing data...';
      case 'complete':
        return 'Data loaded successfully!';
      case 'error':
        return 'Failed to load data';
      default:
        return 'Loading...';
    }
  };

  if (progress.stage === 'error') {
    return (
      <div className="h-[calc(100vh-8rem)] flex items-center justify-center p-4">
        <Alert className="max-w-md border-destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="mb-4">
            <div className="space-y-2">
              <p className="font-medium">Failed to load Smart Inbox</p>
              <p className="text-sm">{progress.error || progress.message}</p>
            </div>
          </AlertDescription>
          {onRetry && (
            <button
              onClick={onRetry}
              className="inline-flex items-center px-3 py-1 text-sm bg-destructive text-destructive-foreground rounded hover:bg-destructive/90"
            >
              Try Again
            </button>
          )}
        </Alert>
      </div>
    );
  }

  if (progress.stage === 'complete') {
    return null; // Hide when complete
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        <div className="text-center">
          <div className="flex items-center justify-center mb-2">
            {getStageIcon()}
          </div>
          <h3 className="text-lg font-medium text-foreground mb-1">
            Loading Smart Inbox
          </h3>
          <p className="text-sm text-muted-foreground">
            {getStageDescription()}
          </p>
        </div>
        
        <div className="space-y-2">
          <Progress value={progress.progress} className="w-full" />
          <p className="text-xs text-center text-muted-foreground">
            {progress.message}
          </p>
        </div>

        <div className="text-xs text-center text-muted-foreground">
          {progress.stage === 'loading_basic' && (
            <p>This may take a moment for large datasets...</p>
          )}
          {progress.stage === 'processing' && (
            <p>Almost ready! Organizing your conversations...</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default SmartInboxLoadingProgress;
