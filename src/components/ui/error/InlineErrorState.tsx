import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface InlineErrorStateProps {
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  showRetry?: boolean;
  className?: string;
}

export const InlineErrorState: React.FC<InlineErrorStateProps> = ({
  title,
  message,
  actionLabel,
  onAction,
  showRetry = true,
  className
}) => (
  <div className={cn("flex items-center space-x-3 p-4 bg-red-50 border border-red-200 rounded-lg", className)}>
    <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium text-red-800">{title}</p>
      {message && (
        <p className="text-sm text-red-600 mt-1">{message}</p>
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
        {actionLabel}
      </Button>
    )}
  </div>
);