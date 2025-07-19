
import React, { memo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Wifi, WifiOff, RefreshCw, CheckCircle, AlertTriangle } from 'lucide-react';

interface ConnectionState {
  isConnected: boolean;
  status: 'connecting' | 'connected' | 'reconnecting' | 'offline' | 'failed';
  reconnectAttempts: number;
  maxReconnectAttempts: number;
}

interface StableConnectionStatusProps {
  connectionState: ConnectionState;
  onReconnect: () => void;
  onRefresh: () => void;
  className?: string;
}

const StableConnectionStatus = memo<StableConnectionStatusProps>(({
  connectionState,
  onReconnect,
  onRefresh,
  className = ""
}) => {
  const getStatusDisplay = () => {
    switch (connectionState.status) {
      case 'connected':
        return {
          icon: <CheckCircle className="h-3 w-3" />,
          text: 'Live',
          color: 'bg-green-100 text-green-800 border-green-300'
        };
      case 'connecting':
        return {
          icon: <RefreshCw className="h-3 w-3 animate-spin" />,
          text: 'Connecting',
          color: 'bg-blue-100 text-blue-800 border-blue-300'
        };
      case 'reconnecting':
        return {
          icon: <RefreshCw className="h-3 w-3 animate-spin" />,
          text: `Retry ${connectionState.reconnectAttempts}`,
          color: 'bg-yellow-100 text-yellow-800 border-yellow-300'
        };
      default:
        return {
          icon: <AlertTriangle className="h-3 w-3" />,
          text: 'Offline',
          color: 'bg-red-100 text-red-800 border-red-300'
        };
    }
  };

  const statusInfo = getStatusDisplay();
  const showReconnectButton = !connectionState.isConnected;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Badge className={`flex items-center gap-1 h-6 ${statusInfo.color}`}>
        {statusInfo.icon}
        <span className="text-xs">{statusInfo.text}</span>
      </Badge>

      {showReconnectButton && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onReconnect}
          className="h-6 px-2 text-xs"
          disabled={connectionState.status === 'connecting' || connectionState.status === 'reconnecting'}
        >
          <Wifi className="h-3 w-3 mr-1" />
          Retry
        </Button>
      )}

      <Button
        variant="ghost"
        size="sm"
        onClick={onRefresh}
        className="h-6 px-2 text-xs"
        title="Refresh data"
      >
        <RefreshCw className="h-3 w-3" />
      </Button>
    </div>
  );
});

StableConnectionStatus.displayName = 'StableConnectionStatus';

export default StableConnectionStatus;
