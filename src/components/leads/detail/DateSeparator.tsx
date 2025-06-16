
import React from 'react';
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";

interface DateSeparatorProps {
  date: string;
}

const DateSeparator: React.FC<DateSeparatorProps> = ({ date }) => {
  return (
    <div className="flex items-center justify-center my-4">
      <Separator className="flex-1" />
      <span className="px-3 text-xs text-muted-foreground bg-background">
        {format(new Date(date), 'MMMM d, yyyy')}
      </span>
      <Separator className="flex-1" />
    </div>
  );
};

export default DateSeparator;
