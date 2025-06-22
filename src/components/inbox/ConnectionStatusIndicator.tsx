
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Wifi, WifiOff, RefreshCw, AlertTriangle } from 'lucide-react';

interface ConnectionState {
  isConnected: boolean;
  lastConnected: Date | null;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
}

interface ConnectionStatusIndicatorProps {
  connectionState: ConnectionState;
  onReconnect: () => void;
  className?: string;
}

const ConnectionStatusIndicator: React.FC<ConnectionStatusIndicatorProps> = ({
  connectionState,
  onReconnect,
  className = ""
}) => {
  const { isConnected, lastConnected, reconnectAttempts, maxReconnectAttempts } = connectionState;

  const getStatusInfo = () => {
    if (isConnected) {
      return {
        icon: <Wifi className="w-3 h-3" />,
        text: "Connected",
        variant: "default" as const,
        color: "text-green-600",
        description: "Real-time updates active"
      };
    }

    if (reconnectAttempts >= maxReconnectAttempts) {
      return {
        icon: <AlertTriangle className="w-3 h-3" />,
        text: "Offline",
        variant: "destructive" as const,
        color: "text-red-600",
        description: "Connection failed. Click to retry."
      };
    }

    if (reconnectAttempts > 0) {
      return {
        icon: <RefreshCw className="w-3 h-3 animate-spin" />,
        text: "Reconnecting",
        variant: "secondary" as const,
        color: "text-yellow-600",
        description: `Attempting to reconnect (${reconnectAttempts}/${maxReconnectAttempts})`
      };
    }

    return {
      icon: <WifiOff className="w-3 h-3" />,
      text: "Disconnected",
      variant: "outline" as const,
      color: "text-gray-600",
      description: "Real-time updates unavailable"
    };
  };

  const statusInfo = getStatusInfo();
  const showReconnectButton = !isConnected;

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
            className={`flex items-center gap-1 cursor-help ${statusInfo.color}`}
          >
            {statusInfo.icon}
            <span className="text-xs">{statusInfo.text}</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-xs space-y-1">
            <p>{statusInfo.description}</p>
            <p className="text-gray-500">Last connected: {formatLastConnected()}</p>
          </div>
        </TooltipContent>
      </Tooltip>

      {showReconnectButton && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onReconnect}
          className="h-6 px-2 text-xs"
          disabled={reconnectAttempts > 0 && reconnectAttempts < maxReconnectAttempts}
        >
          <RefreshCw className="w-3 h-3 mr-1" />
          Reconnect
        </Button>
      )}
    </div>
  );
};

export default ConnectionStatusIndicator;
