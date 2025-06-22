
import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export const ConversationSkeleton = () => {
  return (
    <div className="p-3 border-b border-gray-200">
      <div className="flex items-center space-x-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-12" />
          </div>
          <Skeleton className="h-3 w-32" />
          <div className="flex items-center justify-between">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-4 w-4 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
};

export const ConversationListSkeleton = () => {
  return (
    <div className="space-y-0">
      {Array.from({ length: 8 }).map((_, index) => (
        <ConversationSkeleton key={index} />
      ))}
    </div>
  );
};
