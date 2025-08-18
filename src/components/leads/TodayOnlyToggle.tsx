import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Calendar } from 'lucide-react';

interface TodayOnlyToggleProps {
  todayOnly: boolean;
  onToggle: (value: boolean) => void;
}

const TodayOnlyToggle: React.FC<TodayOnlyToggleProps> = ({ todayOnly, onToggle }) => {
  return (
    <div className="flex items-center space-x-2">
      <Calendar className="h-4 w-4 text-muted-foreground" />
      <Label htmlFor="today-only" className="text-sm font-medium">
        Today's Leads Only
      </Label>
      <Switch
        id="today-only"
        checked={todayOnly}
        onCheckedChange={onToggle}
      />
    </div>
  );
};

export default TodayOnlyToggle;