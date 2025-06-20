
import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Bot } from "lucide-react";

interface FreshLeadBadgeProps {
  createdAt: string;
  aiOptIn?: boolean;
  nextAiSendAt?: string;
}

const FreshLeadBadge: React.FC<FreshLeadBadgeProps> = ({ 
  createdAt, 
  aiOptIn = false,
  nextAiSendAt 
}) => {
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

  const hasMessageDue = () => {
    if (!nextAiSendAt) return false;
    return new Date(nextAiSendAt) <= new Date();
  };

  // Show AI status for AI-enabled leads
  if (aiOptIn && hasMessageDue()) {
    return (
      <Badge variant="default" className="bg-blue-500 hover:bg-blue-600 text-white">
        <Bot className="w-3 h-3 mr-1" />
        AI DUE
      </Badge>
    );
  }

  if (aiOptIn) {
    return (
      <Badge variant="outline" className="border-blue-300 text-blue-600">
        <Bot className="w-3 h-3 mr-1" />
        AI ON
      </Badge>
    );
  }

  // Show fresh badges for non-AI leads
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
