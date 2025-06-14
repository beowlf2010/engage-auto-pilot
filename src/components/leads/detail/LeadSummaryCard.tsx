
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LeadDetailData } from '@/services/leadDetailService';

interface LeadSummaryCardProps {
  lead: LeadDetailData;
}

const LeadSummaryCard = ({ lead }: LeadSummaryCardProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Lead Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <span className="text-sm font-medium text-gray-700">Source:</span>
          <Badge variant="outline" className="ml-2">{lead.source}</Badge>
        </div>
        {lead.salespersonName && (
          <div>
            <span className="text-sm font-medium text-gray-700">Salesperson:</span>
            <p className="text-sm">{lead.salespersonName}</p>
          </div>
        )}
        <div>
          <span className="text-sm font-medium text-gray-700">Messages:</span>
          <p className="text-sm">{lead.conversations.length} total</p>
        </div>
        <div>
          <span className="text-sm font-medium text-gray-700">Phone Numbers:</span>
          <p className="text-sm">{lead.phoneNumbers.length} numbers</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default LeadSummaryCard;
