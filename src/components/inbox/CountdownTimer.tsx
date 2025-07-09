// src/components/inbox/CountdownTimer.tsx
import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle, CheckCircle, Pause } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface CountdownTimerProps {
  targetDate: Date;
  isActive?: boolean;
  isPaused?: boolean;
  label?: string;
  urgentThreshold?: number; // minutes - when to turn red
  warningThreshold?: number; // minutes - when to turn amber
  showSeconds?: boolean;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'compact' | 'badge';
  className?: string;
  onTimeUp?: () => void;
  onUrgent?: () => void; // triggered when entering urgent threshold
}

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number; // total milliseconds
  isOverdue: boolean;
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({
  targetDate,
  isActive = true,
  isPaused = false,
  label = "Sends in",
  urgentThreshold = 60, // 1 hour
  warningThreshold = 240, // 4 hours  
  showSeconds = false,
  showIcon = true,
  size = 'md',
  variant = 'default',
  className = "",
  onTimeUp,
  onUrgent
}) => {
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    total: 0,
    isOverdue: false
  });

  // TODO: Add timezone support for lead-specific timezones
  // TODO: Add business hours calculation (skip weekends/holidays)
  // TODO: Add pause/resume functionality integration
  // TODO: Connect to real-time updates from message queue

  const calculateTimeRemaining = (): TimeRemaining => {
    const now = new Date().getTime();
    const target = new Date(targetDate).getTime();
    const difference = target - now;

    if (difference <= 0) {
      return {
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        total: 0,
        isOverdue: true
      };
    }

    return {
      days: Math.floor(difference / (1000 * 60 * 60 * 24)),
      hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
      minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
      seconds: Math.floor((difference % (1000 * 60)) / 1000),
      total: difference,
      isOverdue: false
    };
  };

  useEffect(() => {
    const timer = setInterval(() => {
      if (!isActive || isPaused) return;

      const newTimeRemaining = calculateTimeRemaining();
      setTimeRemaining(newTimeRemaining);

      // Trigger callbacks
      if (newTimeRemaining.isOverdue && timeRemaining.total > 0) {
        onTimeUp?.();
      }

      const totalMinutes = Math.floor(newTimeRemaining.total / (1000 * 60));
      if (totalMinutes === urgentThreshold && !timeRemaining.isOverdue) {
        onUrgent?.();
      }
    }, 1000);

    // Initialize immediately
    setTimeRemaining(calculateTimeRemaining());

    return () => clearInterval(timer);
  }, [isActive, isPaused, targetDate, urgentThreshold, onTimeUp, onUrgent]);

  const getTimeStatus = () => {
    if (isPaused) return 'paused';
    if (timeRemaining.isOverdue) return 'overdue';
    
    const totalMinutes = Math.floor(timeRemaining.total / (1000 * 60));
    if (totalMinutes <= urgentThreshold) return 'urgent';
    if (totalMinutes <= warningThreshold) return 'warning';
    
    return 'normal';
  };

  const getStatusColor = (status: string) => {
    const colors = {
      normal: 'text-muted-foreground',
      warning: 'text-amber-600', 
      urgent: 'text-red-600',
      overdue: 'text-red-700',
      paused: 'text-muted-foreground'
    };
    return colors[status as keyof typeof colors] || colors.normal;
  };

  const getStatusBg = (status: string) => {
    const backgrounds = {
      normal: 'bg-muted text-muted-foreground',
      warning: 'bg-amber-100 text-amber-800 border-amber-200',
      urgent: 'bg-red-100 text-red-800 border-red-200',
      overdue: 'bg-red-100 text-red-900 border-red-300',
      paused: 'bg-muted text-muted-foreground'
    };
    return backgrounds[status as keyof typeof backgrounds] || backgrounds.normal;
  };

  const getIcon = (status: string) => {
    if (isPaused) return <Pause className="w-3 h-3" />;
    if (status === 'overdue') return <AlertTriangle className="w-3 h-3" />;
    if (status === 'urgent') return <AlertTriangle className="w-3 h-3" />;
    return <Clock className="w-3 h-3" />;
  };

  const formatTime = () => {
    if (timeRemaining.isOverdue) {
      return "Overdue";
    }

    if (isPaused) {
      return "Paused";
    }

    const parts = [];
    
    if (timeRemaining.days > 0) {
      parts.push(`${timeRemaining.days}d`);
    }
    
    if (timeRemaining.hours > 0 || timeRemaining.days > 0) {
      parts.push(`${timeRemaining.hours}h`);
    }
    
    if (timeRemaining.minutes > 0 || (timeRemaining.days === 0 && timeRemaining.hours === 0)) {
      parts.push(`${timeRemaining.minutes}m`);
    }
    
    if (showSeconds && timeRemaining.days === 0 && timeRemaining.hours === 0) {
      parts.push(`${timeRemaining.seconds}s`);
    }

    return parts.join(' ');
  };

  const status = getTimeStatus();
  const timeDisplay = formatTime();

  // Size variants
  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm', 
    lg: 'text-base'
  };

  // Render variants
  if (variant === 'badge') {
    return (
      <Badge 
        variant="outline" 
        className={cn(
          getStatusBg(status),
          sizeClasses[size],
          'flex items-center gap-1',
          className
        )}
      >
        {showIcon && getIcon(status)}
        <span className="font-mono">{timeDisplay}</span>
      </Badge>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={cn(
        'flex items-center gap-1',
        getStatusColor(status),
        sizeClasses[size],
        className
      )}>
        {showIcon && getIcon(status)}
        <span className="font-mono">{timeDisplay}</span>
      </div>
    );
  }

  // Default variant
  return (
    <div className={cn(
      'flex items-center gap-2',
      getStatusColor(status),
      sizeClasses[size],
      className
    )}>
      {showIcon && (
        <div className={cn(
          'p-1 rounded',
          status === 'urgent' && 'animate-pulse'
        )}>
          {getIcon(status)}
        </div>
      )}
      <div className="space-y-1">
        {label && (
          <div className="text-xs text-muted-foreground uppercase tracking-wide">
            {label}
          </div>
        )}
        <div className={cn(
          'font-mono font-medium',
          status === 'urgent' && 'animate-pulse'
        )}>
          {timeDisplay}
        </div>
      </div>
    </div>
  );
};

// Preset components for common use cases
export const MessageCountdown: React.FC<{
  sendAt: Date;
  isActive?: boolean;
  isPaused?: boolean;
  className?: string;
}> = ({ sendAt, isActive, isPaused, className }) => (
  <CountdownTimer
    targetDate={sendAt}
    isActive={isActive}
    isPaused={isPaused}
    label="Sends in"
    urgentThreshold={60}
    warningThreshold={240}
    variant="default"
    size="sm"
    className={className}
  />
);

export const CompactCountdown: React.FC<{
  sendAt: Date;
  isActive?: boolean;
  className?: string;
}> = ({ sendAt, isActive, className }) => (
  <CountdownTimer
    targetDate={sendAt}
    isActive={isActive}
    label=""
    urgentThreshold={30}
    showIcon={false}
    variant="compact"
    size="sm"
    className={className}
  />
);

export const UrgentCountdown: React.FC<{
  sendAt: Date;
  className?: string;
  onTimeUp?: () => void;
}> = ({ sendAt, className, onTimeUp }) => (
  <CountdownTimer
    targetDate={sendAt}
    label="URGENT"
    urgentThreshold={0}
    warningThreshold={0}
    showSeconds={true}
    variant="default"
    size="md"
    className={className}
    onTimeUp={onTimeUp}
  />
);

// TODO: Add countdown for next business day calculation
// TODO: Add integration with lead timezone preferences  
// TODO: Add pause/resume animations
// TODO: Add sound notifications for urgent countdowns
// TODO: Add visual pulse effect for urgent states