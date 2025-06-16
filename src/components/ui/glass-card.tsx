
import React from 'react';
import { cn } from '@/lib/utils';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  blur?: 'sm' | 'md' | 'lg' | 'xl';
  opacity?: 'low' | 'medium' | 'high';
}

const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className,
  blur = 'md',
  opacity = 'medium'
}) => {
  const blurClasses = {
    sm: 'backdrop-blur-sm',
    md: 'backdrop-blur-md',
    lg: 'backdrop-blur-lg',
    xl: 'backdrop-blur-xl'
  };

  const opacityClasses = {
    low: 'bg-white/5 border-white/10',
    medium: 'bg-white/20 border-white/20',
    high: 'bg-white/40 border-white/30'
  };

  return (
    <div className={cn(
      "rounded-xl border shadow-xl transition-all duration-300",
      blurClasses[blur],
      opacityClasses[opacity],
      "hover:shadow-2xl hover:scale-[1.02]",
      className
    )}>
      {children}
    </div>
  );
};

export default GlassCard;
