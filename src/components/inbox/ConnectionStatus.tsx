
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';

interface ConnectionStatusProps {
  isConnected: boolean;
  connectionState: {
    isConnected: boolean;
    retryCount?: number;
    lastError?: string;
  };
  onReconnect: () => void;
}

const ConnectionStatus = ({ isConnected, connectionState, onReconnect }: ConnectionStatusProps) => {
  if (isConnected) {
    return (
      <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200">
        <Wifi className="h-3 w-3 mr-1" />
        Connected
      </Badge>
    );
  }

  return (
    <div className="flex items-center space-x-2">
      <Badge variant="destructive" className="bg-red-50 text-red-700 border-red-200">
        <WifiOff className="h-3 w-3 mr-1" />
        Disconnected
      </Badge>
      <Button
        variant="ghost"
        size="sm"
        onClick={onReconnect}
        className="h-6 px-2 text-xs"
      >
        <RefreshCw className="h-3 w-3 mr-1" />
        Reconnect
      </Button>
    </div>
  );
};

export default ConnectionStatus;
