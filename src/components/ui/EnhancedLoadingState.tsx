
import React from 'react';
import { Loader2, MessageSquare, Bot, Wifi, WifiOff } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface EnhancedLoadingStateProps {
  type: 'conversations' | 'messages' | 'ai_processing' | 'connection';
  message?: string;
  showProgress?: boolean;
  progress?: number;
  isConnected?: boolean;
  retryCount?: number;
}

const EnhancedLoadingState: React.FC<EnhancedLoadingStateProps> = ({
  type,
  message,
  showProgress = false,
  progress = 0,
  isConnected = true,
  retryCount = 0
}) => {
  const getIcon = () => {
    switch (type) {
      case 'conversations':
        return <MessageSquare className="h-8 w-8 text-blue-500" />;
      case 'messages':
        return <MessageSquare className="h-6 w-6 text-blue-500" />;
      case 'ai_processing':
        return <Bot className="h-8 w-8 text-purple-500" />;
      case 'connection':
        return isConnected ? 
          <Wifi className="h-8 w-8 text-green-500" /> : 
          <WifiOff className="h-8 w-8 text-red-500" />;
      default:
        return <Loader2 className="h-8 w-8 text-blue-500" />;
    }
  };

  const getTitle = () => {
    switch (type) {
      case 'conversations':
        return 'Loading Conversations';
      case 'messages':
        return 'Loading Messages';
      case 'ai_processing':
        return 'AI Processing';
      case 'connection':
        return isConnected ? 'Connecting' : 'Connection Lost';
      default:
        return 'Loading';
    }
  };

  const getDescription = () => {
    if (message) return message;
    
    switch (type) {
      case 'conversations':
        return 'Fetching your latest conversations...';
      case 'messages':
        return 'Loading conversation history...';
      case 'ai_processing':
        return 'AI is analyzing and generating response...';
      case 'connection':
        return isConnected ? 
          'Establishing real-time connection...' : 
          `Connection failed${retryCount > 0 ? ` (retry ${retryCount})` : ''}`;
      default:
        return 'Please wait...';
    }
  };

  if (type === 'messages') {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="flex items-center space-x-3">
          <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
          <span className="text-sm text-gray-600">{getDescription()}</span>
        </div>
      </div>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardContent className="p-8 text-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            {getIcon()}
            <Loader2 className="h-4 w-4 animate-spin absolute -top-1 -right-1 text-gray-400" />
          </div>
          
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-gray-900">
              {getTitle()}
            </h3>
            <p className="text-sm text-gray-600">
              {getDescription()}
            </p>
          </div>

          {showProgress && (
            <div className="w-full space-y-2">
              <div className="flex justify-between text-xs text-gray-500">
                <span>Progress</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {retryCount > 0 && (
            <Badge variant="outline" className="text-xs">
              Retry attempt {retryCount}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default EnhancedLoadingState;
