
import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

interface LoadingStep {
  step: string;
  completed: boolean;
  error?: string;
}

interface LeadsLoadingStateProps {
  steps: LoadingStep[];
}

const LeadsLoadingState: React.FC<LeadsLoadingStateProps> = ({ steps }) => {
  return (
    <div className="space-y-6">
      {/* Loading Progress */}
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <h3 className="text-lg font-medium text-center">Loading Your Leads</h3>
        </CardHeader>
        <CardContent className="space-y-3">
          {steps.map((step, index) => (
            <div key={index} className="flex items-center space-x-3">
              {step.error ? (
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              ) : step.completed ? (
                <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
              ) : (
                <Loader2 className="w-4 h-4 animate-spin text-blue-500 flex-shrink-0" />
              )}
              <span className={`text-sm flex-1 ${
                step.error ? 'text-red-600' : 
                step.completed ? 'text-green-600' : 
                'text-gray-600'
              }`}>
                {step.step}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Loading Skeleton */}
      <div className="space-y-4">
        {/* Stats Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-16" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-12" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Search Bar Skeleton */}
        <Skeleton className="h-12 w-full" />

        {/* Table Skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LeadsLoadingState;
