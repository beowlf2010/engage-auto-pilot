import React from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';

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