
import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2 } from 'lucide-react';

export const ConversationListSkeleton = () => (
  <Card className="h-full">
    <CardHeader>
      <Skeleton className="h-8 w-32" />
    </CardHeader>
    <CardContent className="space-y-4">
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className="space-y-2">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-16" />
          </div>
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-3/4" />
        </div>
      ))}
    </CardContent>
  </Card>
);

export const ChatViewSkeleton = () => (
  <Card className="h-full flex flex-col">
    <CardHeader>
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-8 w-20" />
      </div>
    </CardHeader>
    <CardContent className="flex-1 space-y-4">
      {[1, 2, 3].map(i => (
        <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
          <div className="space-y-2 max-w-xs">
            <Skeleton className="h-12 w-48" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      ))}
    </CardContent>
  </Card>
);

export const LoadingSpinner = ({ message = "Loading..." }: { message?: string }) => (
  <div className="flex items-center justify-center p-8">
    <div className="text-center">
      <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
      <p className="text-slate-600">{message}</p>
    </div>
  </div>
);

export const SmartInboxSkeleton = () => (
  <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <Skeleton className="h-10 w-64 mb-4" />
        <Skeleton className="h-12 w-full" />
      </div>
      
      <div className="mb-6">
        <Skeleton className="h-12 w-full" />
      </div>

      <div className="grid grid-cols-12 gap-6 h-[calc(100vh-300px)]">
        <div className="col-span-4">
          <ConversationListSkeleton />
        </div>
        <div className="col-span-8">
          <ChatViewSkeleton />
        </div>
      </div>
    </div>
  </div>
);
