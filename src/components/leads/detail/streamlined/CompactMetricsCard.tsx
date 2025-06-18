
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Clock, TrendingUp } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { LeadDetailData } from "@/services/leadDetailService";

interface CompactMetricsCardProps {
  lead: LeadDetailData;
}

const CompactMetricsCard: React.FC<CompactMetricsCardProps> = ({ lead }) => {
  const messageCount = lead.conversations?.length || 0;
  const lastMessage = lead.conversations?.[lead.conversations.length - 1];
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          Conversation Metrics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-xs">
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-1">
            <MessageSquare className="w-3 h-3" />
            <span>{messageCount} messages</span>
          </div>
          {lastMessage && (
            <div className="flex items-center gap-1 text-gray-600">
              <Clock className="w-3 h-3" />
              <span>{formatDistanceToNow(new Date(lastMessage.sent_at), { addSuffix: true })}</span>
            </div>
          )}
        </div>
        
        <div className="flex flex-wrap gap-1">
          {lead.aiOptIn && (
            <Badge variant="default" className="text-xs py-0">
              AI Enabled
            </Badge>
          )}
          {lead.pendingHumanResponse && (
            <Badge variant="destructive" className="text-xs py-0">
              Needs Response
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default CompactMetricsCard;
