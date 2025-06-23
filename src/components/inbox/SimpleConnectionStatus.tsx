
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Wifi, WifiOff, RefreshCw, AlertTriangle } from 'lucide-react';

interface ConnectionState {
  isConnected: boolean;
  status: 'connecting' | 'connected' | 'reconnecting' | 'offline';
  lastConnected: Date | null;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
}

interface SimpleConnectionStatusProps {
  connectionState: ConnectionState;
  onReconnect: () => void;
  onForceSync: () => void;
}

const SimpleConnectionStatus: React.FC<SimpleConnectionStatusProps> = ({
  connectionState,
  onReconnect,
  onForceSync
}) => {
  const getStatusIcon = () => {
    switch (connectionState.status) {
      case 'connected':
        return <Wifi className="h-3 w-3" />;
      case 'connecting':
      case 'reconnecting':
        return <RefreshCw className="h-3 w-3 animate-spin" />;
      case 'offline':
        return <WifiOff className="h-3 w-3" />;
      default:
        return <AlertTriangle className="h-3 w-3" />;
    }
  };

  const getStatusColor = () => {
    switch (connectionState.status) {
      case 'connected':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'connecting':
      case 'reconnecting':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'offline':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge className={`flex items-center gap-1 ${getStatusColor()}`}>
            {getStatusIcon()}
            {connectionState.status}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-xs">
            <p>Status: {connectionState.status}</p>
            {connectionState.lastConnected && (
              <p>Last connected: {connectionState.lastConnected.toLocaleTimeString()}</p>
            )}
            {connectionState.reconnectAttempts > 0 && (
              <p>Reconnect attempts: {connectionState.reconnectAttempts}</p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>

      {connectionState.status !== 'connected' && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onReconnect}
          className="h-6 px-2"
        >
          <RefreshCw className="h-3 w-3" />
        </Button>
      )}

      <Button
        variant="ghost"
        size="sm"
        onClick={onForceSync}
        className="h-6 px-2"
        title="Force refresh"
      >
        <RefreshCw className="h-3 w-3" />
      </Button>
    </div>
  );
};

export default SimpleConnectionStatus;
