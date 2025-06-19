
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Phone, Mail, MapPin, Car, Calendar, Building } from "lucide-react";
import UnifiedAIControls from "../UnifiedAIControls";
import type { LeadDetailData } from "@/services/leadDetailService";

interface LeadDetailSidebarProps {
  lead: LeadDetailData;
  onAIOptInChange: (enabled: boolean) => Promise<void>;
  onMessageSent: () => void;
}

const LeadDetailSidebar: React.FC<LeadDetailSidebarProps> = ({
  lead,
  onAIOptInChange,
  onMessageSent
}) => {
  return (
    <div className="w-80 space-y-4">
      {/* Lead Information */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Lead Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Phone className="w-4 h-4 text-muted-foreground" />
              <span>{lead.primaryPhone}</span>
            </div>
            {lead.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <span className="truncate">{lead.email}</span>
              </div>
            )}
            {(lead.city || lead.state) && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span>{[lead.city, lead.state].filter(Boolean).join(', ')}</span>
              </div>
            )}
          </div>

          <div className="pt-2 border-t">
            <div className="flex items-center gap-2 text-sm mb-2">
              <Car className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">Vehicle Interest</span>
            </div>
            <Badge variant="outline">{lead.vehicleInterest}</Badge>
          </div>

          <div className="pt-2 border-t">
            <div className="flex items-center gap-2 text-sm mb-2">
              <Building className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">Source</span>
            </div>
            <Badge variant="secondary">{lead.source}</Badge>
          </div>

          <div className="pt-2 border-t">
            <div className="flex items-center gap-2 text-sm mb-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">Created</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {new Date(lead.createdAt).toLocaleDateString()}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Unified AI Controls */}
      <UnifiedAIControls
        leadId={lead.id}
        leadName={`${lead.firstName} ${lead.lastName}`}
        aiOptIn={lead.aiOptIn || false}
        messageIntensity={lead.messageIntensity}
        aiMessagesSent={lead.aiMessagesSent}
        aiSequencePaused={lead.aiSequencePaused}
        aiPauseReason={lead.aiPauseReason}
        pendingHumanResponse={lead.pendingHumanResponse}
        onUpdate={onMessageSent}
      />
    </div>
  );
};

export default LeadDetailSidebar;
