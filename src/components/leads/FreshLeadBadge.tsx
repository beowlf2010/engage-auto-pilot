
import React from 'react';
import { Badge } from "@/components/ui/badge";

interface FreshLeadBadgeProps {
  createdAt: string;
}

const FreshLeadBadge: React.FC<FreshLeadBadgeProps> = ({ createdAt }) => {
  const isToday = (date: string) => {
    const today = new Date();
    const leadDate = new Date(date);
    return today.toDateString() === leadDate.toDateString();
  };

  const isYesterday = (date: string) => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const leadDate = new Date(date);
    return yesterday.toDateString() === leadDate.toDateString();
  };

  if (isToday(createdAt)) {
    return (
      <Badge variant="default" className="bg-green-500 hover:bg-green-600 text-white">
        FRESH
      </Badge>
    );
  }

  if (isYesterday(createdAt)) {
    return (
      <Badge variant="outline" className="border-orange-300 text-orange-600">
        NEW
      </Badge>
    );
  }

  return null;
};

export default FreshLeadBadge;
