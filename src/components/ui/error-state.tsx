import React from 'react';
import { AlertCircle, RefreshCw, Wifi, WifiOff, Server, Shield } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ErrorStateProps {
  type?: 'network' | 'server' | 'permission' | 'validation' | 'generic';
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
  const getErrorConfig = () => {
    switch (type) {
      case 'network':
        return {
          icon: <WifiOff className="h-8 w-8 text-red-500" />,
          defaultTitle: 'Connection Error',
          defaultMessage: 'Unable to connect to the server. Please check your internet connection.',
          defaultAction: 'Try Again'
        };
      case 'server':
        return {
          icon: <Server className="h-8 w-8 text-orange-500" />,
          defaultTitle: 'Server Error',
          defaultMessage: 'Something went wrong on our end. Please try again in a moment.',
          defaultAction: 'Retry'
        };
      case 'permission':
        return {
          icon: <Shield className="h-8 w-8 text-yellow-500" />,
          defaultTitle: 'Access Denied',
          defaultMessage: 'You don\'t have permission to view this content.',
          defaultAction: 'Go Back'
        };
      case 'validation':
        return {
          icon: <AlertCircle className="h-8 w-8 text-amber-500" />,
          defaultTitle: 'Invalid Data',
          defaultMessage: 'Please check your input and try again.',
          defaultAction: 'Fix Issues'
        };
      default:
        return {
          icon: <AlertCircle className="h-8 w-8 text-red-500" />,
          defaultTitle: 'Something went wrong',
          defaultMessage: 'An unexpected error occurred. Please try again.',
          defaultAction: 'Try Again'
        };
    }
  };

  const config = getErrorConfig();
  const displayTitle = title || config.defaultTitle;
  const displayMessage = message || config.defaultMessage;
  const displayAction = actionLabel || config.defaultAction;

  if (inline) {
    return (
      <div className={cn("flex items-center space-x-3 p-4 bg-red-50 border border-red-200 rounded-lg", className)}>
        <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-red-800">{displayTitle}</p>
          {displayMessage && (
            <p className="text-sm text-red-600 mt-1">{displayMessage}</p>
          )}
        </div>
        {(showRetry && onAction) && (
          <Button
            size="sm"
            variant="outline"
            onClick={onAction}
            className="border-red-200 text-red-700 hover:bg-red-100 flex-shrink-0"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            {displayAction}
          </Button>
        )}
      </div>
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

interface ValidationErrorProps {
  errors: Array<{
    field: string;
    message: string;
  }>;
  className?: string;
}

export const ValidationError: React.FC<ValidationErrorProps> = ({
  errors,
  className
}) => (
  <div className={cn("space-y-2", className)}>
    {errors.map((error, index) => (
      <div
        key={index}
        className="flex items-start space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg"
      >
        <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium text-red-800">
            {error.field}
          </p>
          <p className="text-sm text-red-600">
            {error.message}
          </p>
        </div>
      </div>
    ))}
  </div>
);

interface NetworkStatusProps {
  isOnline: boolean;
  lastUpdated?: Date;
  className?: string;
}

export const NetworkStatus: React.FC<NetworkStatusProps> = ({
  isOnline,
  lastUpdated,
  className
}) => (
  <div className={cn(
    "flex items-center space-x-2 p-2 rounded-lg",
    isOnline ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700",
    className
  )}>
    {isOnline ? (
      <Wifi className="h-4 w-4" />
    ) : (
      <WifiOff className="h-4 w-4" />
    )}
    <span className="text-sm font-medium">
      {isOnline ? 'Connected' : 'Offline'}
    </span>
    {lastUpdated && (
      <span className="text-xs opacity-75">
        • Last updated {lastUpdated.toLocaleTimeString()}
      </span>
    )}
  </div>
);

export default ErrorState;