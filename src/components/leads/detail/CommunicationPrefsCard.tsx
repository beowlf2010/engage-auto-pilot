
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LeadDetailData } from '@/services/leadDetailService';

interface CommunicationPrefsCardProps {
  lead: LeadDetailData;
}

const CommunicationPrefsCard = ({ lead }: CommunicationPrefsCardProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Communication</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm">Phone:</span>
          <Badge variant={lead.doNotCall ? "destructive" : "outline"}>
            {lead.doNotCall ? "Do Not Call" : "Allowed"}
          </Badge>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm">Email:</span>
          <Badge variant={lead.doNotEmail ? "destructive" : "outline"}>
            {lead.doNotEmail ? "Do Not Email" : "Allowed"}
          </Badge>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm">Mail:</span>
          <Badge variant={lead.doNotMail ? "destructive" : "outline"}>
            {lead.doNotMail ? "Do Not Mail" : "Allowed"}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
};

export default CommunicationPrefsCard;
