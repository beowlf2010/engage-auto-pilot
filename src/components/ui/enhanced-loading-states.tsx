import React from 'react';
import { Loader2, MessageSquare, Users, Car, BarChart3, Settings, CheckCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface LoadingSkeletonProps {
  className?: string;
  rows?: number;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({ 
  className, 
  rows = 3 
}) => (
  <div className={cn("space-y-3", className)}>
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="animate-pulse flex space-x-4">
        <div className="rounded-full bg-gray-200 h-10 w-10"></div>
        <div className="flex-1 space-y-2 py-1">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    ))}
  </div>
);

interface TableLoadingSkeletonProps {
  columns?: number;
  rows?: number;
}

export const TableLoadingSkeleton: React.FC<TableLoadingSkeletonProps> = ({ 
  columns = 4, 
  rows = 5 
}) => (
  <div className="space-y-3">
    {/* Header */}
    <div className="animate-pulse flex space-x-4 pb-2 border-b">
      {Array.from({ length: columns }).map((_, i) => (
        <div key={i} className="h-4 bg-gray-200 rounded flex-1"></div>
      ))}
    </div>
    
    {/* Rows */}
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <div key={rowIndex} className="animate-pulse flex space-x-4 py-2">
        {Array.from({ length: columns }).map((_, colIndex) => (
          <div key={colIndex} className="h-4 bg-gray-200 rounded flex-1"></div>
        ))}
      </div>
    ))}
  </div>
);

interface ProgressiveLoadingProps {
  steps: string[];
  currentStep: number;
  progress: number;
  className?: string;
}

export const ProgressiveLoading: React.FC<ProgressiveLoadingProps> = ({
  steps,
  currentStep,
  progress,
  className
}) => (
  <Card className={cn("w-full max-w-md", className)}>
    <CardContent className="p-6">
      <div className="space-y-4">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-primary" />
          <h3 className="font-medium text-gray-900">
            {steps[currentStep] || 'Processing...'}
          </h3>
        </div>
        
        <Progress value={progress} className="w-full" />
        
        <div className="text-xs text-gray-500 text-center">
          Step {currentStep + 1} of {steps.length}
        </div>
        
        <div className="space-y-1">
          {steps.map((step, index) => (
            <div key={index} className="flex items-center text-xs">
              {index < currentStep ? (
                <CheckCircle className="h-3 w-3 text-green-500 mr-2" />
              ) : index === currentStep ? (
                <Loader2 className="h-3 w-3 animate-spin text-primary mr-2" />
              ) : (
                <div className="h-3 w-3 rounded-full border border-gray-300 mr-2" />
              )}
              <span className={cn(
                index <= currentStep ? 'text-gray-900' : 'text-gray-400'
              )}>
                {step}
              </span>
            </div>
          ))}
        </div>
      </div>
    </CardContent>
  </Card>
);

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

interface InlineLoadingProps {
  text?: string;
  size?: 'xs' | 'sm' | 'md';
}

export const InlineLoading: React.FC<InlineLoadingProps> = ({ 
  text = 'Loading...', 
  size = 'sm' 
}) => {
  const sizeClasses = {
    xs: 'h-3 w-3',
    sm: 'h-4 w-4',
    md: 'h-5 w-5'
  };

  return (
    <div className="flex items-center space-x-2">
      <Loader2 className={cn('animate-spin text-gray-400', sizeClasses[size])} />
      <span className="text-sm text-gray-600">{text}</span>
    </div>
  );
};

export default {
  LoadingSkeleton,
  TableLoadingSkeleton,
  ProgressiveLoading,
  ContextualLoading,
  InlineLoading
};