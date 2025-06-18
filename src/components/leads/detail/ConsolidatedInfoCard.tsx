
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Phone, Mail, MapPin, Car, Calendar, DollarSign, FileText } from "lucide-react";
import VehicleMentionsCard from "./VehicleMentionsCard";
import type { LeadDetailData } from "@/services/leadDetailService";

interface ConsolidatedInfoCardProps {
  lead: LeadDetailData;
}

const ConsolidatedInfoCard: React.FC<ConsolidatedInfoCardProps> = ({ lead }) => {
  const primaryPhone = lead.phoneNumbers?.find(p => p.isPrimary)?.number || lead.phoneNumbers?.[0]?.number || 'No phone';

  return (
    <div className="space-y-4">
      {/* Contact Information */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center space-x-2">
            <User className="w-4 h-4" />
            <span>Contact Information</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2 text-sm">
            <div className="flex items-center space-x-2">
              <Phone className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">{primaryPhone}</span>
            </div>
            
            {lead.email && (
              <div className="flex items-center space-x-2">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <span className="break-all">{lead.email}</span>
              </div>
            )}
            
            {(lead.city || lead.state) && (
              <div className="flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span>{[lead.city, lead.state].filter(Boolean).join(', ')}</span>
              </div>
            )}
          </div>

          <div className="pt-2 border-t">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Lead Status</span>
              <Badge variant={lead.status === 'new' ? 'default' : 'secondary'} className="text-xs">
                {lead.status}
              </Badge>
            </div>
            
            {lead.source && (
              <div className="flex items-center justify-between text-xs mt-1">
                <span className="text-muted-foreground">Source</span>
                <span className="font-medium">{lead.source}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Vehicle Interest */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center space-x-2">
            <Car className="w-4 h-4" />
            <span>Vehicle Interest</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="text-sm">
            <div className="font-medium text-gray-900">
              {lead.vehicleInterest || 'Not specified'}
            </div>
            
            {(lead.vehicleYear || lead.vehicleMake || lead.vehicleModel) && (
              <div className="text-muted-foreground text-xs mt-1">
                {[lead.vehicleYear, lead.vehicleMake, lead.vehicleModel].filter(Boolean).join(' ')}
              </div>
            )}
          </div>

          {/* Preferences */}
          {(lead.preferredPriceMin || lead.preferredPriceMax) && (
            <div className="pt-2 border-t">
              <div className="flex items-center space-x-2 text-xs">
                <DollarSign className="w-3 h-3 text-muted-foreground" />
                <span className="text-muted-foreground">Budget:</span>
                <span className="font-medium">
                  {lead.preferredPriceMin && `$${lead.preferredPriceMin.toLocaleString()}`}
                  {lead.preferredPriceMin && lead.preferredPriceMax && ' - '}
                  {lead.preferredPriceMax && `$${lead.preferredPriceMax.toLocaleString()}`}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Vehicle Mentions History */}
      <VehicleMentionsCard leadId={lead.id} />

      {/* Timeline */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center space-x-2">
            <Calendar className="w-4 h-4" />
            <span>Timeline</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Created</span>
            <span>{new Date(lead.createdAt).toLocaleDateString()}</span>
          </div>
          
          {lead.lastReplyAt && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Last Reply</span>
              <span>{new Date(lead.lastReplyAt).toLocaleDateString()}</span>
            </div>
          )}
          
          <div className="flex justify-between">
            <span className="text-muted-foreground">Messages</span>
            <span>{lead.conversations?.length || 0}</span>
          </div>
        </CardContent>
      </Card>

      {/* Trade Information */}
      {lead.hasTradeVehicle && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center space-x-2">
              <FileText className="w-4 h-4" />
              <span>Trade Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            {lead.tradeInVehicle && (
              <div>
                <span className="text-muted-foreground">Trade Vehicle:</span>
                <div className="font-medium">{lead.tradeInVehicle}</div>
              </div>
            )}
            
            {lead.tradePayoffAmount && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Payoff Amount</span>
                <span className="font-medium">${lead.tradePayoffAmount.toLocaleString()}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ConsolidatedInfoCard;
