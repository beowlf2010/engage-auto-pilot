import React from 'react';
import { Loader2, CheckCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

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