import React from 'react';
import { Loader2, MessageSquare, Users, Car, BarChart3, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ContextualLoadingProps {
  context: 'dashboard' | 'leads' | 'conversations' | 'inventory' | 'settings';
  message?: string;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const ContextualLoading: React.FC<ContextualLoadingProps> = ({
  context,
  message,
  showIcon = true,
  size = 'md'
}) => {
  const getContextIcon = () => {
    switch (context) {
      case 'dashboard':
        return <BarChart3 className="text-blue-500" />;
      case 'leads':
        return <Users className="text-green-500" />;
      case 'conversations':
        return <MessageSquare className="text-purple-500" />;
      case 'inventory':
        return <Car className="text-orange-500" />;
      case 'settings':
        return <Settings className="text-gray-500" />;
      default:
        return <Loader2 className="text-blue-500" />;
    }
  };

  const getContextMessage = () => {
    if (message) return message;
    
    switch (context) {
      case 'dashboard':
        return 'Loading your dashboard data...';
      case 'leads':
        return 'Fetching lead information...';
      case 'conversations':
        return 'Loading conversations...';
      case 'inventory':
        return 'Loading vehicle inventory...';
      case 'settings':
        return 'Loading settings...';
      default:
        return 'Loading...';
    }
  };

  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  };

  return (
    <div className="flex flex-col items-center justify-center py-8">
      <div className="flex items-center space-x-3">
        {showIcon && (
          <div className="relative">
            {React.cloneElement(getContextIcon(), { 
              className: cn(sizeClasses[size], getContextIcon().props.className)
            })}
            <Loader2 className="h-3 w-3 animate-spin absolute -top-1 -right-1 text-gray-400" />
          </div>
        )}
        <span className="text-sm text-gray-600">{getContextMessage()}</span>
      </div>
    </div>
  );
};