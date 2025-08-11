import React, { useEffect, useState } from 'react';
import { AlertTriangle, RefreshCw, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

export const NetworkBanner: React.FC<{ className?: string }> = ({ className }) => {
  const { isOnline, isDegraded } = useNetworkStatus();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(!isOnline || isDegraded);
  }, [isOnline, isDegraded]);

  if (!visible) return null;

  return (
    <div className={cn(
      'w-full border-b bg-card',
      className
    )} role="status" aria-live="polite">
      <div className="mx-auto max-w-screen-2xl px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-foreground">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <span className="font-medium">
            {isOnline ? 'Service disruption detected' : 'You are offline'}
          </span>
          <span className="text-muted-foreground">
            {isOnline ? 'Some actions may fail. Please retry shortly.' : 'Changes may not sync until connection is restored.'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => window.location.reload()}>
            <RefreshCw className="h-3 w-3 mr-1" /> Retry
          </Button>
          <button aria-label="Dismiss" onClick={() => setVisible(false)} className="p-1 rounded-md hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default NetworkBanner;
