
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AnimatedStatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  gradient?: string;
  className?: string;
}

const AnimatedStatCard: React.FC<AnimatedStatCardProps> = ({
  title,
  value,
  icon: Icon,
  trend,
  gradient = 'bg-gradient-to-br from-blue-500 to-purple-600',
  className
}) => {
  return (
    <Card className={cn(
      "relative overflow-hidden group hover:shadow-2xl transition-all duration-500 hover:-translate-y-1",
      "bg-white/95 backdrop-blur-md border border-white/20",
      className
    )}>
      <div className={cn("absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity duration-500", gradient)} />
      
      <CardContent className="relative p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-600 group-hover:text-gray-700 transition-colors">
              {title}
            </p>
            <div className="space-y-1">
              <p className="text-3xl font-bold text-gray-900 group-hover:scale-105 transition-transform duration-300">
                {typeof value === 'number' ? value.toLocaleString() : value}
              </p>
              {trend && (
                <div className={cn(
                  "flex items-center text-sm font-medium",
                  trend.isPositive ? "text-emerald-600" : "text-red-600"
                )}>
                  <span className="mr-1">
                    {trend.isPositive ? '↗️' : '↘️'}
                  </span>
                  {Math.abs(trend.value)}%
                </div>
              )}
            </div>
          </div>
          
          <div className={cn(
            "p-4 rounded-2xl group-hover:scale-110 transition-all duration-300",
            gradient,
            "shadow-lg group-hover:shadow-xl"
          )}>
            <Icon className="h-8 w-8 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AnimatedStatCard;
