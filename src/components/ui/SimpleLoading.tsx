import React from 'react';
import { Loader2 } from 'lucide-react';

interface SimpleLoadingProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const SimpleLoading: React.FC<SimpleLoadingProps> = ({ 
  message = "Loading...", 
  size = 'md' 
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  };

  return (
    <div className="flex flex-col items-center justify-center py-8 space-y-3">
      <Loader2 className={`animate-spin text-primary ${sizeClasses[size]}`} />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
};