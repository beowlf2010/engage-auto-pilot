import React from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getErrorConfig, type ErrorType } from './error/ErrorStateConfig';
import { InlineErrorState } from './error/InlineErrorState';
import { NetworkStatus } from './error/NetworkStatus';
import { ValidationError } from './error/ValidationError';

interface ErrorStateProps {
  type?: ErrorType;
  title?: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  showRetry?: boolean;
  className?: string;
  inline?: boolean;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  type = 'generic',
  title,
  message,
  actionLabel,
  onAction,
  showRetry = true,
  className,
  inline = false
}) => {
  const config = getErrorConfig(type);
  const displayTitle = title || config.defaultTitle;
  const displayMessage = message || config.defaultMessage;
  const displayAction = actionLabel || config.defaultAction;

  if (inline) {
    return (
      <InlineErrorState
        title={displayTitle}
        message={displayMessage}
        actionLabel={displayAction}
        onAction={onAction}
        showRetry={showRetry}
        className={className}
      />
    );
  }

  return (
    <Card className={cn("w-full max-w-md mx-auto", className)}>
      <CardHeader className="text-center">
        <div className="flex items-center justify-center mb-4">
          <div className="p-3 bg-gray-100 rounded-full">
            {config.icon}
          </div>
        </div>
        <CardTitle className="text-lg text-gray-900">
          {displayTitle}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="text-center space-y-4">
        <p className="text-sm text-gray-600">
          {displayMessage}
        </p>
        
        {type === 'network' && (
          <div className="flex items-center justify-center space-x-2">
            <WifiOff className="h-4 w-4 text-gray-400" />
            <Badge variant="outline" className="text-xs">
              Connection Status: Offline
            </Badge>
          </div>
        )}
        
        {(showRetry && onAction) && (
          <Button onClick={onAction} className="w-full">
            <RefreshCw className="h-4 w-4 mr-2" />
            {displayAction}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export { ValidationError, NetworkStatus };
export default ErrorState;