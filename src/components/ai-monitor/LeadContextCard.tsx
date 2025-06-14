
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { User, Car, Phone, MessageSquare } from 'lucide-react';

interface LeadContext {
  firstName: string;
  lastName: string;
  vehicleInterest: string;
  phoneNumber: string;
  aiStage: string;
  messagesSent: number;
  lastResponse?: string;
  lastResponseTime?: string;
}

interface LeadContextCardProps {
  leadContext: LeadContext | null;
  formatTime: (timestamp: string) => string;
}

const LeadContextCard = ({ leadContext, formatTime }: LeadContextCardProps) => {
  if (!leadContext) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <User className="h-4 w-4" />
          Lead Context
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-between">
          <span className="font-medium">{leadContext.firstName} {leadContext.lastName}</span>
          <Badge variant="outline">{leadContext.aiStage}</Badge>
        </div>
        
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Car className="h-3 w-3" />
          {leadContext.vehicleInterest}
        </div>
        
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Phone className="h-3 w-3" />
          {leadContext.phoneNumber}
        </div>
        
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MessageSquare className="h-3 w-3" />
          {leadContext.messagesSent} messages sent
        </div>

        {leadContext.lastResponse && (
          <>
            <Separator />
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Last Response:</p>
              <p className="text-sm bg-muted p-2 rounded">{leadContext.lastResponse}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {formatTime(leadContext.lastResponseTime!)}
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default LeadContextCard;
