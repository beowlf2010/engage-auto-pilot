import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InlineLoadingProps {
  text?: string;
  size?: 'xs' | 'sm' | 'md';
}

export const InlineLoading: React.FC<InlineLoadingProps> = ({ 
  text = 'Loading...', 
  size = 'sm' 
}) => {
  const sizeClasses = {
    xs: 'h-3 w-3',
    sm: 'h-4 w-4',
    md: 'h-5 w-5'
  };

  return (
    <div className="flex items-center space-x-2">
      <Loader2 className={cn('animate-spin text-gray-400', sizeClasses[size])} />
      <span className="text-sm text-gray-600">{text}</span>
    </div>
  );
};