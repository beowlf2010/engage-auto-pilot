
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  AlertTriangle, 
  Clock, 
  Zap,
  Activity,
  Signal
} from 'lucide-react';

interface ConnectionState {
  isConnected: boolean;
  status: 'connecting' | 'connected' | 'reconnecting' | 'offline' | 'failed';
  lastConnected: Date | null;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'critical';
  lastError: string | null;
  disconnectReason: string | null;
}

interface HealthStatus {
  healthScore: number;
  shouldUsePolling: boolean;
  recommendedAction: string;
  networkQuality: 'excellent' | 'good' | 'poor' | 'critical';
  consecutiveFailures: number;
}

interface ConnectionHealthIndicatorProps {
  connectionState: ConnectionState;
  healthStatus: HealthStatus;
  onReconnect: () => void;
  onForceSync?: () => void;
  className?: string;
  compact?: boolean;
}

const ConnectionHealthIndicator: React.FC<ConnectionHealthIndicatorProps> = ({
  connectionState,
  healthStatus,
  onReconnect,
  onForceSync,
  className = "",
  compact = false
}) => {
  const getStatusInfo = () => {
    const { status, connectionQuality, isConnected } = connectionState;
    
    switch (status) {
      case 'connected':
        const qualityText = connectionQuality === 'excellent' ? 'Excellent' :
                           connectionQuality === 'good' ? 'Good' :
                           connectionQuality === 'poor' ? 'Unstable' : 'Connected';
        
        const color = connectionQuality === 'poor' || connectionQuality === 'critical' 
          ? "text-yellow-600 bg-yellow-50 border-yellow-200" 
          : "text-green-600 bg-green-50 border-green-200";
          
        return {
          icon: <Signal className="w-3 h-3" />,
          text: qualityText,
          variant: "default" as const,
          color,
          description: connectionQuality === 'poor' ? "Connection unstable but active" : "Real-time updates active"
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
          description: `Reconnecting (${connectionState.reconnectAttempts}/${connectionState.maxReconnectAttempts})`
        };
      
      case 'offline':
        return {
          icon: healthStatus.shouldUsePolling ? <Clock className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />,
          text: healthStatus.shouldUsePolling ? "Polling Mode" : "Offline",
          variant: "outline" as const,
          color: "text-orange-600 bg-orange-50 border-orange-200",
          description: healthStatus.shouldUsePolling 
            ? "Using backup polling. Real-time disabled."
            : "No connection. Click to retry."
        };
      
      case 'failed':
      default:
        const errorMsg = connectionState.lastError || connectionState.disconnectReason || "Connection failed";
        return {
          icon: <AlertTriangle className="w-3 h-3" />,
          text: "Failed",
          variant: "destructive" as const,
          color: "text-red-600 bg-red-50 border-red-200",
          description: `${errorMsg}. Click to retry.`
        };
    }
  };

  const statusInfo = getStatusInfo();
  const showReconnectButton = !connectionState.isConnected || connectionState.status === 'offline';

  const formatLastConnected = () => {
    if (!connectionState.lastConnected) return "Never";
    
    const now = new Date();
    const diff = now.getTime() - connectionState.lastConnected.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    
    return connectionState.lastConnected.toLocaleDateString();
  };

  const getHealthScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  if (compact) {
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge 
              variant={statusInfo.variant}
              className={`flex items-center gap-1 cursor-help h-5 text-xs ${statusInfo.color}`}
            >
              {statusInfo.icon}
              {statusInfo.text}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-xs space-y-1">
              <p>{statusInfo.description}</p>
              <p className="text-gray-500">Health: {healthStatus.healthScore}%</p>
            </div>
          </TooltipContent>
        </Tooltip>
        
        {showReconnectButton && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onReconnect}
            className="h-5 px-1 text-xs"
            disabled={connectionState.status === 'connecting' || connectionState.status === 'reconnecting'}
          >
            <RefreshCw className="w-3 h-3" />
          </Button>
        )}
      </div>
    );
  }

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
          <div className="text-xs space-y-1 max-w-sm">
            <p>{statusInfo.description}</p>
            <div className="border-t border-gray-200 pt-1 mt-1">
              <p className="text-gray-500">Last connected: {formatLastConnected()}</p>
              <p className={`font-medium ${getHealthScoreColor(healthStatus.healthScore)}`}>
                Health Score: {healthStatus.healthScore}%
              </p>
              {connectionState.connectionQuality && connectionState.status === 'connected' && (
                <p className="text-blue-600">Quality: {connectionState.connectionQuality}</p>
              )}
              {healthStatus.consecutiveFailures > 0 && (
                <p className="text-red-600">Consecutive failures: {healthStatus.consecutiveFailures}</p>
              )}
              {healthStatus.shouldUsePolling && (
                <p className="text-orange-600">Using polling fallback</p>
              )}
              {healthStatus.recommendedAction !== 'Connection healthy' && (
                <p className="text-blue-600 font-medium">{healthStatus.recommendedAction}</p>
              )}
            </div>
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
            disabled={connectionState.status === 'connecting' || connectionState.status === 'reconnecting'}
          >
            <RefreshCw className="w-3 h-3 mr-1" />
            {connectionState.status === 'offline' || healthStatus.shouldUsePolling ? 'Retry' : 'Reconnect'}
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

        {/* Show activity indicator when connected */}
        {connectionState.isConnected && (
          <div className="flex items-center">
            <Activity className="w-3 h-3 text-green-500 animate-pulse" />
          </div>
        )}
      </div>
    </div>
  );
};

export default ConnectionHealthIndicator;
