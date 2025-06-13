
import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';

interface CountdownBadgeProps {
  dt?: string;
}

const CountdownBadge: React.FC<CountdownBadgeProps> = ({ dt }) => {
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    if (!dt) return;

    const updateCountdown = () => {
      const now = new Date().getTime();
      const target = new Date(dt).getTime();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft('Due now');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m`);
      } else {
        setTimeLeft(`${minutes}m`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000);
    return () => clearInterval(interval);
  }, [dt]);

  if (!dt) return <span className="text-slate-400">—</span>;

  const now = new Date().getTime();
  const target = new Date(dt).getTime();
  const diff = target - now;

  const colorClass = diff < 3600000 ? "bg-red-100 text-red-600" 
                   : diff < 14400000 ? "bg-amber-100 text-amber-600"
                   : "bg-slate-100 text-slate-600";

  return (
    <Badge className={`${colorClass} text-xs font-bold`}>
      {timeLeft}
    </Badge>
  );
};

export default CountdownBadge;
