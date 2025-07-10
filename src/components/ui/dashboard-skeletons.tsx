import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export const StatCardSkeleton = () => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <div className="h-4 w-24 bg-muted rounded animate-pulse" />
      <div className="h-4 w-4 bg-muted rounded animate-pulse" />
    </CardHeader>
    <CardContent>
      <div className="h-8 w-16 bg-muted rounded animate-pulse mb-2" />
      <div className="h-3 w-32 bg-muted rounded animate-pulse" />
    </CardContent>
  </Card>
);

export const StatsGridSkeleton = () => (
  <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
    {Array.from({ length: 6 }).map((_, i) => (
      <StatCardSkeleton key={i} />
    ))}
  </div>
);

export const QuickActionsSkeleton = () => (
  <Card>
    <CardHeader>
      <div className="h-6 w-32 bg-muted rounded animate-pulse" />
    </CardHeader>
    <CardContent className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-center space-x-4">
          <div className="h-12 w-12 bg-muted rounded-lg animate-pulse" />
          <div className="space-y-2 flex-1">
            <div className="h-4 w-24 bg-muted rounded animate-pulse" />
            <div className="h-3 w-32 bg-muted rounded animate-pulse" />
          </div>
          <div className="h-4 w-8 bg-muted rounded animate-pulse" />
        </div>
      ))}
    </CardContent>
  </Card>
);

export const RecentActivitySkeleton = () => (
  <Card>
    <CardHeader>
      <div className="h-6 w-32 bg-muted rounded animate-pulse" />
    </CardHeader>
    <CardContent className="space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-start space-x-3">
          <div className="h-8 w-8 bg-muted rounded-full animate-pulse" />
          <div className="space-y-2 flex-1">
            <div className="h-4 w-48 bg-muted rounded animate-pulse" />
            <div className="h-3 w-24 bg-muted rounded animate-pulse" />
          </div>
        </div>
      ))}
    </CardContent>
  </Card>
);

export const AIInsightsSkeleton = () => (
  <Card className="h-full">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
      <div className="flex items-center gap-2">
        <div className="h-5 w-5 bg-muted rounded animate-pulse" />
        <div className="h-5 w-24 bg-muted rounded animate-pulse" />
      </div>
      <div className="h-8 w-8 bg-muted rounded animate-pulse" />
    </CardHeader>
    <CardContent className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="p-3 border rounded-lg">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2 flex-1">
              <div className="h-4 w-4 bg-muted rounded animate-pulse" />
              <div className="h-4 w-32 bg-muted rounded animate-pulse" />
            </div>
            <div className="h-5 w-12 bg-muted rounded-full animate-pulse" />
          </div>
          <div className="h-3 w-full bg-muted rounded animate-pulse mb-2" />
          <div className="h-3 w-3/4 bg-muted rounded animate-pulse mb-2" />
          <div className="flex items-center justify-between">
            <div className="h-3 w-20 bg-muted rounded animate-pulse" />
            <div className="h-6 w-16 bg-muted rounded animate-pulse" />
          </div>
        </div>
      ))}
    </CardContent>
  </Card>
);