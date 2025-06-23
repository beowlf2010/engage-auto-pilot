
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Wifi, WifiOff, RefreshCw, AlertTriangle, Clock, Zap } from 'lucide-react';

interface ConnectionState {
  isConnected: boolean;
  status: 'connecting' | 'connected' | 'reconnecting' | 'offline' | 'failed';
  lastConnected: Date | null;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
}

interface ConnectionStatusIndicatorProps {
  connectionState: ConnectionState;
  onReconnect: () => void;
  onForceSync?: () => void;
  className?: string;
}

const ConnectionStatusIndicator: React.FC<ConnectionStatusIndicatorProps> = ({
  connectionState,
  onReconnect,
  onForceSync,
  className = ""
}) => {
  const { isConnected, status, lastConnected, reconnectAttempts, maxReconnectAttempts } = connectionState;

  const getStatusInfo = () => {
    switch (status) {
      case 'connected':
        return {
          icon: <Wifi className="w-3 h-3" />,
          text: "Connected",
          variant: "default" as const,
          color: "text-green-600 bg-green-50 border-green-200",
          description: "Real-time updates active"
        };
      
      case 'connecting':
        return {
          icon: <RefreshCw className="w-3 h-3 animate-spin" />,
          text: "Connecting",
          variant: "secondary" as const,
          color: "text-blue-600 bg-blue-50 border-blue-200",
          description: "Establishing connection..."
        };
      
      case 'reconnecting':
        return {
          icon: <RefreshCw className="w-3 h-3 animate-spin" />,
          text: "Reconnecting",
          variant: "secondary" as const,
          color: "text-yellow-600 bg-yellow-50 border-yellow-200",
          description: `Reconnecting (${reconnectAttempts}/${maxReconnectAttempts})`
        };
      
      case 'offline':
        return {
          icon: <Clock className="w-3 h-3" />,
          text: "Offline Mode",
          variant: "outline" as const,
          color: "text-orange-600 bg-orange-50 border-orange-200",
          description: "Using fallback polling. Click to retry connection."
        };
      
      case 'failed':
      default:
        return {
          icon: <AlertTriangle className="w-3 h-3" />,
          text: "Disconnected",
          variant: "destructive" as const,
          color: "text-red-600 bg-red-50 border-red-200",
          description: "Connection failed. Click to retry."
        };
    }
  };

  const statusInfo = getStatusInfo();
  const showReconnectButton = !isConnected || status === 'offline';

  const formatLastConnected = () => {
    if (!lastConnected) return "Never";
    
    const now = new Date();
    const diff = now.getTime() - lastConnected.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    
    return lastConnected.toLocaleDateString();
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant={statusInfo.variant}
            className={`flex items-center gap-1 cursor-help h-6 ${statusInfo.color}`}
          >
            {statusInfo.icon}
            <span className="text-xs leading-none">{statusInfo.text}</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-xs space-y-1">
            <p>{statusInfo.description}</p>
            <p className="text-gray-500">Last connected: {formatLastConnected()}</p>
            {status === 'offline' && (
              <p className="text-orange-600">Auto-refreshing every 30s</p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>

      <div className="flex items-center gap-1">
        {showReconnectButton && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onReconnect}
            className="h-6 px-2 text-xs leading-none"
            disabled={status === 'connecting' || status === 'reconnecting'}
          >
            <RefreshCw className="w-3 h-3 mr-1" />
            {status === 'offline' ? 'Retry' : 'Reconnect'}
          </Button>
        )}

        {onForceSync && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onForceSync}
            className="h-6 px-2 text-xs leading-none"
            title="Force refresh data"
          >
            <Zap className="w-3 h-3" />
          </Button>
        )}
      </div>
    </div>
  );
};

export default ConnectionStatusIndicator;
