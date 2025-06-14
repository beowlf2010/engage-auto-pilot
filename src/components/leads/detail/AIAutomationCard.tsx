
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bot } from "lucide-react";
import { LeadDetailData } from '@/services/leadDetailService';

interface AIAutomationCardProps {
  lead: LeadDetailData;
}

const AIAutomationCard = ({ lead }: AIAutomationCardProps) => {
  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Bot className="w-5 h-5 mr-2" />
          AI Automation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Status:</span>
          <Badge variant={lead.aiOptIn ? "default" : "secondary"}>
            {lead.aiOptIn ? "Enabled" : "Disabled"}
          </Badge>
        </div>
        {lead.aiStage && (
          <div>
            <span className="text-sm font-medium text-gray-700">Stage:</span>
            <p className="text-sm">{lead.aiStage}</p>
          </div>
        )}
        {lead.nextAiSendAt && (
          <div>
            <span className="text-sm font-medium text-gray-700">Next Message:</span>
            <p className="text-sm">{formatTimestamp(lead.nextAiSendAt)}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AIAutomationCard;
