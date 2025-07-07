import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface OptimizedLoadingProps {
  variant?: 'dashboard' | 'list' | 'card' | 'table';
  count?: number;
}

export const OptimizedLoading: React.FC<OptimizedLoadingProps> = ({ 
  variant = 'dashboard', 
  count = 1 
}) => {
  const renderSkeleton = () => {
    switch (variant) {
      case 'dashboard':
        return (
          <div className="space-y-6 p-6">
            {/* Header */}
            <div className="space-y-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
            
            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-lg border p-6 space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-3 w-24" />
                </div>
              ))}
            </div>
            
            {/* Chart Area */}
            <div className="rounded-lg border p-6 space-y-4">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-64 w-full" />
            </div>
          </div>
        );
        
      case 'list':
        return (
          <div className="space-y-4">
            {Array.from({ length: count }).map((_, i) => (
              <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-6 w-16" />
              </div>
            ))}
          </div>
        );
        
      case 'card':
        return (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: count }).map((_, i) => (
              <div key={i} className="rounded-lg border p-6 space-y-4">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <div className="flex justify-between items-center">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-8 w-16" />
                </div>
              </div>
            ))}
          </div>
        );
        
      case 'table':
        return (
          <div className="rounded-md border">
            <div className="border-b p-4">
              <div className="flex space-x-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-4 w-24" />
                ))}
              </div>
            </div>
            {Array.from({ length: count }).map((_, i) => (
              <div key={i} className="border-b p-4">
                <div className="flex space-x-4">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-20" />
                </div>
              </div>
            ))}
          </div>
        );
        
      default:
        return <Skeleton className="h-32 w-full" />;
    }
  };

  return <div className="animate-pulse">{renderSkeleton()}</div>;
};