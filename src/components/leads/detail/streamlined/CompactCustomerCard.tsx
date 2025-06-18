
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Mail, Phone, Calendar, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { LeadDetailData } from "@/services/leadDetailService";

interface CompactCustomerCardProps {
  lead: LeadDetailData;
}

const CompactCustomerCard: React.FC<CompactCustomerCardProps> = ({ lead }) => {
  const primaryPhone = lead.phoneNumbers?.find(p => p.isPrimary);
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <User className="w-4 h-4" />
          Customer Details
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-xs">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className="font-medium">{lead.firstName} {lead.lastName}</div>
            {lead.email && (
              <div className="flex items-center gap-1 text-gray-600">
                <Mail className="w-3 h-3" />
                <span className="truncate">{lead.email}</span>
              </div>
            )}
          </div>
          <div>
            {primaryPhone && (
              <div className="flex items-center gap-1 text-gray-600">
                <Phone className="w-3 h-3" />
                <span>{primaryPhone.number}</span>
              </div>
            )}
            {lead.createdAt && (
              <div className="flex items-center gap-1 text-gray-500">
                <Calendar className="w-3 h-3" />
                <span>{formatDistanceToNow(new Date(lead.createdAt), { addSuffix: true })}</span>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex flex-wrap gap-1 pt-1">
          <Badge variant="outline" className="text-xs py-0">
            {lead.source || 'Unknown Source'}
          </Badge>
          {lead.status && (
            <Badge variant="secondary" className="text-xs py-0">
              {lead.status}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default CompactCustomerCard;
