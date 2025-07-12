
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Wifi, WifiOff, RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react';

interface ConnectionState {
  isConnected: boolean;
  status: 'connecting' | 'connected' | 'reconnecting' | 'offline' | 'failed';
  lastConnected: Date | null;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
  connectionQuality?: 'excellent' | 'good' | 'poor' | 'critical';
  lastError?: string | null;
  disconnectReason?: string | null;
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
        return <CheckCircle className="h-3 w-3" />;
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
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'reconnecting':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'offline':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusText = () => {
    switch (connectionState.status) {
      case 'connected':
        return 'Live';
      case 'connecting':
        return 'Connecting';
      case 'reconnecting':
        return `Retry ${connectionState.reconnectAttempts}/${connectionState.maxReconnectAttempts}`;
      case 'offline':
        return 'Offline';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge className={`flex items-center gap-1 ${getStatusColor()}`}>
            {getStatusIcon()}
            {getStatusText()}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-xs">
            <p>Status: {connectionState.status}</p>
            {connectionState.lastConnected && (
              <p>Last connected: {connectionState.lastConnected.toLocaleTimeString()}</p>
            )}
            {connectionState.reconnectAttempts > 0 && (
              <p>Reconnect attempts: {connectionState.reconnectAttempts}/{connectionState.maxReconnectAttempts}</p>
            )}
            {connectionState.status === 'offline' && (
              <p className="text-red-600 font-medium">Click refresh to retry</p>
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
          title="Reconnect"
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
