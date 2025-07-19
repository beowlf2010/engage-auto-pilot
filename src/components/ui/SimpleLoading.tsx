
import React from 'react';
import { Loader2 } from 'lucide-react';

interface SimpleLoadingProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const SimpleLoading: React.FC<SimpleLoadingProps> = ({ 
  message = "Loading...", 
  size = 'md',
  className = ''
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  };

  return (
    <div className={`flex flex-col items-center justify-center py-8 space-y-4 ${className}`}>
      <Loader2 className={`animate-spin text-primary ${sizeClasses[size]}`} />
      <div className="text-center">
        <p className="text-lg font-medium text-foreground">{message}</p>
        <p className="text-sm text-muted-foreground mt-1">Please wait...</p>
      </div>
    </div>
  );
};
