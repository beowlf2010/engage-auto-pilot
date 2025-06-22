
import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface MessageSkeletonProps {
  isOutgoing?: boolean;
}

export const MessageSkeleton: React.FC<MessageSkeletonProps> = ({ isOutgoing = false }) => {
  return (
    <div className={`flex ${isOutgoing ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-xs lg:max-w-md space-y-2 ${isOutgoing ? 'items-end' : 'items-start'} flex flex-col`}>
        <Skeleton className={`h-16 w-48 ${isOutgoing ? 'rounded-l-lg rounded-tr-lg' : 'rounded-r-lg rounded-tl-lg'}`} />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  );
};

export const MessageListSkeleton = () => {
  return (
    <div className="p-4 space-y-4">
      <MessageSkeleton isOutgoing={false} />
      <MessageSkeleton isOutgoing={true} />
      <MessageSkeleton isOutgoing={false} />
      <MessageSkeleton isOutgoing={true} />
      <MessageSkeleton isOutgoing={false} />
    </div>
  );
};
