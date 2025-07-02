import React from 'react';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ValidationErrorProps {
  errors: Array<{
    field: string;
    message: string;
  }>;
  className?: string;
}

export const ValidationError: React.FC<ValidationErrorProps> = ({
  errors,
  className
}) => (
  <div className={cn("space-y-2", className)}>
    {errors.map((error, index) => (
      <div
        key={index}
        className="flex items-start space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg"
      >
        <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium text-red-800">
            {error.field}
          </p>
          <p className="text-sm text-red-600">
            {error.message}
          </p>
        </div>
      </div>
    ))}
  </div>
);