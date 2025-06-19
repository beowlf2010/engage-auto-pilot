
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
              <span>{lead.primary_phone}</span>
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
            <Badge variant="outline">{lead.vehicle_interest}</Badge>
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
              {new Date(lead.created_at).toLocaleDateString()}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Unified AI Controls */}
      <UnifiedAIControls
        leadId={lead.id}
        leadName={`${lead.first_name} ${lead.last_name}`}
        aiOptIn={lead.ai_opt_in || false}
        messageIntensity={lead.message_intensity}
        aiMessagesSent={lead.ai_messages_sent}
        aiSequencePaused={lead.ai_sequence_paused}
        aiPauseReason={lead.ai_pause_reason}
        pendingHumanResponse={lead.pending_human_response}
        onUpdate={onMessageSent}
      />
    </div>
  );
};

export default LeadDetailSidebar;
